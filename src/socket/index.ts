import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyToken } from "../utils/auth";
import User from "../models/User";
import Message from "../models/Message";
import { messageSchema } from "../utils/validation";

export class SocketManager {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error("Authentication error"));
        }

        const { userId } = verifyToken(token);
        const user = await User.findById(userId);

        if (!user) {
          return next(new Error("User not found"));
        }

        (socket as any).user = user;
        next();
      } catch (error) {
        next(new Error("Authentication error"));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket: Socket) => {
      const user = (socket as any).user;
      console.log(`User ${user.email} connected`);

      // store user connection
      this.connectedUsers.set(user._id.toString(), socket.id);

      // Join user to their personal room
      socket.join(user._id.toString());

      // Handle real-time messaging
      socket.on("send_message", async (data) => {
        try {
          const { error } = messageSchema.validate(data);
          if (error) {
            socket.emit("error", { message: error.details[0].message });
            return;
          }

          const reciever = await User.findById(data.receiverId);
          if (!reciever) {
            socket.emit("error", { message: "Receiver not found" });
            return;
          }

          const message = new Message({
            sender: user._id,
            receiver: data.receiverId,
            content: data.content,
            orderId: data.orderId || null,
          });

          await message.save();

          const populatedMessage = await Message.findById(message._id)
            .populate("sender", "firstName lastName email")
            .populate("receiver", "firstName lastName email");

          // Send to receiver if online
          socket.to(data.receiverId).emit("new_message", populatedMessage);

          // Send confirmation to sender
          socket.emit("message_sent", populatedMessage);
        } catch (error) {
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      // handle type indicators
      socket.on("typing", (data) => {
        socket.to(data.receiverId).emit("user_typing", {
          userId: user._id,
          isTyping: true,
        });
      });

      socket.on("stop_typing", (data) => {
        socket.to(data.receiverId).emit("user_typing", {
          userId: user._id,
          isTyping: false,
        });
      });

      // Handle order notifications
      socket.on("join_order_room", (orderId) => {
        socket.join(`order_${orderId}`);
      });

      socket.on("leave_order_room", (orderId) => {
        socket.leave(`order_${orderId}`);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`User ${user.email} disconnected`);
        this.connectedUsers.delete(user._id.toString());
      });
    });
  }

  public notifyOrderUpdate(orderId: string, order: any) {
    this.io.to(`order_${orderId}`).emit("order_updated", order);
  }

  public getIO() {
    return this.io;
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
