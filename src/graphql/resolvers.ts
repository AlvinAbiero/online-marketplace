import { GraphQLError } from "graphql";
import { withFilter, PubSub } from "graphql-subscriptions";
import User from "../models/User";
import Product from "../models/Product";
import Order from "../models/Order";
import Message from "../models/Message";
import { Context } from "../types";
import { generateToken } from "../utils/auth";
import { createPayment, executePayment } from "../utils/paypal";
import {
  userRegistrationSchema,
  userLoginSchema,
  productSchema,
  orderSchema,
  messageSchema,
} from "../utils/validation";

const pubsub = new PubSub();

const requireAuth = (user: any) => {
  if (!user) {
    throw new GraphQLError("You must be logged in to perform this action", {
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  }
};

const requireSeller = (user: any) => {
  requireAuth(user);
  if (user.role !== "seller" && user.role !== "admin") {
    throw new GraphQLError("You must be a seller to perform this action", {
      extensions: {
        code: "FORBIDDEN",
      },
    });
  }
};

export const resolvers = {
  Query: {
    me: async (_: any, __: any, { user }: Context) => {
      requireAuth(user);
      return user;
    },

    products: async (
      _: any,
      { category, search, limit = 20, offset = 0 }: any
    ) => {
      const filter: any = { isActive: true };

      if (category) {
        filter.category = new RegExp(category, "i");
      }

      if (search) {
        filter.$text = { $search: search };
      }

      return Product.find(filter)
        .populate("seller", "firstName lastName email")
        .limit(limit)
        .skip(offset)
        .sort({ createdAt: -1 });
    },

    product: async (_: any, { id }: { id: string }) => {
      const product = await Product.findById(id).populate(
        "seller",
        "firstName lastName email"
      );
      if (!product || !product.isActive) {
        throw new GraphQLError("Product not found", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }
      return product;
    },

    myProducts: async (_: any, __: any, { user }: Context) => {
      requireSeller(user);
      return Product.find({ seller: user!._id }).populate(
        "seller",
        "firstname lastname email"
      );
    },

    orders: async (_: any, __: any, { user }: Context) => {
      requireAuth(user);
      return Order.find({
        $or: [{ buyer: user!._id }, { seller: user!._id }],
      })
        .populate("buyer", "firstName lastName email")
        .populate("seller", "firstName lastName email")
        .populate("product")
        .sort({ createdAt: -1 });
    },

    order: async (_: any, { id }: any, { user }: Context) => {
      requireAuth(user);
      const order = await Order.findById(id)
        .populate("buyer", "firstName lastName email")
        .populate("seller", "firstName lastName email")
        .populate("product");

      if (!order) {
        throw new GraphQLError("Order not found", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      if (
        order.buyer._id.toString() !== user!._id &&
        order.seller._id.toString() !== user!._id
      ) {
        throw new GraphQLError("Access denied", {
          extensions: {
            code: "FORBIDDEN",
          },
        });
      }

      return order;
    },

    messages: async (_: any, { userId }: any, { user }: Context) => {
      requireAuth(user);
      return Message.find({
        $or: [
          { sender: user!._id, receiver: userId },
          { sender: userId, receiver: user!._id },
        ],
      })
        .populate("sender", "firstName lastName email")
        .populate("receiver", "firstName lastName email")
        .sort({ createdAt: 1 });
    },
  },

  Mutation: {
    register: async (_: any, { input }: any) => {
      const { error } = userRegistrationSchema.validate(input);
      if (error) {
        throw new GraphQLError(error.details[0].message, {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const existingUser = await User.findOne({ email: input.email });
      if (existingUser) {
        throw new GraphQLError("User with this email already exists", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const user = new User(input);
      await user.save();

      const token = generateToken(user._id);
      return { token, user };
    },

    login: async (_: any, { input }: any) => {
      const { error } = userLoginSchema.validate(input);
      if (error) {
        throw new GraphQLError(error.details[0].message, {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const user = await User.findOne({ email: input.email });
      if (!user) {
        throw new GraphQLError("Invalid credentials", {
          extensions: {
            code: "UNAUTHENTICATED",
          },
        });
      }

      const isValidPassword = await (user as any).comparePassword(
        input.password
      );
      if (!isValidPassword) {
        throw new GraphQLError("Invalid credentials", {
          extensions: {
            code: "UNAUTHENTICATED",
          },
        });
      }

      const token = generateToken(user._id);
      return { token, user };
    },

    createProduct: async (_: any, { input }: any, { user }: Context) => {
      requireSeller(user);

      const { error } = productSchema.validate(input);
      if (error) {
        throw new GraphQLError(error.details[0].message, {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const product = new Product({
        ...input,
        seller: user!._id,
        images: ["https://via.placeholder.com/400x300"], // Placehlder image
      });

      await product.save();
      return Product.findById(product._id).populate(
        "seller",
        "firstName lastName email"
      );
    },

    updateProduct: async (_: any, { id, input }: any, { user }: Context) => {
      requireSeller(user);

      const product = await Product.findById(id);
      if (!product) {
        throw new GraphQLError("Product not found", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      if (product.seller.toString() !== user!.id && user!.role !== "admin") {
        throw new GraphQLError("Access denied", {
          extensions: {
            code: "FORBIDDEN",
          },
        });
      }

      const { error } = productSchema.validate(input);
      if (error) {
        throw new GraphQLError(error.details[0].message, {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      Object.assign(product, input);
      await product.save();

      return Product.findById(product._id).populate(
        "seller",
        "firstName lastName email"
      );
    },

    deleteProduct: async (_: any, { id }: any, { user }: Context) => {
      requireSeller(user);

      const product = await Product.findById(id);
      if (!product) {
        throw new GraphQLError("Product not found", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      if (product.seller.toString() !== user!._id && user!.role !== "admin") {
        throw new GraphQLError("Access denied", {
          extensions: {
            code: "FORBIDDEN",
          },
        });
      }

      await Product.findByIdAndDelete(id);
      return true;
    },

    createOrder: async (_: any, { input }: any, { user }: Context) => {
      requireAuth(user);

      const { error } = orderSchema.validate(input);
      if (error) {
        throw new GraphQLError(error.details[0].message, {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const product = await Product.findById(input.productId);
      if (!product) {
        throw new GraphQLError("Product not found", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      if (product.stock < input.quantity) {
        throw new GraphQLError("Insufficient stock", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      if (product.seller.toString() === user!._id) {
        throw new GraphQLError("You cannot order your own product", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const totalAmount = product.price * input.quantity;

      const order = new Order({
        buyer: user!._id,
        seller: product.seller,
        product: product._id,
        quantity: input.quantity,
        totalAmount,
      });

      await order.save();

      return Order.findById(order._id)
        .populate("buyer", "firstName lastName email")
        .populate("seller", "firstName lastName email")
        .populate("product");
    },

    updateOrderStatus: async (
      _: any,
      { id, status }: any,
      { user }: Context
    ) => {
      requireAuth(user);

      const order = await Order.findById(id);
      if (!order) {
        throw new GraphQLError("Order not found", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      if (order.seller.toString() !== user!._id && user!.role !== "admin") {
        throw new GraphQLError("Access denied", {
          extensions: {
            code: "FORBIDDEN",
          },
        });
      }

      order.status = status;
      await order.save();

      const updatedOrder = await Order.findById(order._id)
        .populate("buyer", "firstName lastName email")
        .populate("seller", "firstName lastName email")
        .populate("product");

      pubsub.publish("ORDER_STATUS_UPDATED", {
        orderStatusUpdated: updatedOrder,
        userId: order.buyer.toString(),
      });

      return updatedOrder;
    },

    createPayment: async (_: any, { orderId }: any, { user }: Context) => {
      requireAuth(user);

      const order = await Order.findById(orderId).populate("product");
      if (!order) {
        throw new GraphQLError("Order not found", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      if (order.buyer.toString() !== user!._id) {
        throw new GraphQLError("Access denied", {
          extensions: {
            code: "FORBIDDEN",
          },
        });
      }

      if (order.status !== "pending") {
        throw new GraphQLError("Order cannot be paid", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      try {
        const payment = await createPayment({
          amount: order.totalAmount.toString(),
          currency: "USD",
          description: `Payment for ${(order.product as any).title}`,
          returnUrl: `${process.env.CLIENT_URL}/payment/success`,
          cancelUrl: `${process.env.CLIENT_URL}/payment/cancel`,
        });

        const approvalUrl = payment.links.find(
          (link: any) => link.rel === "approval_url"
        )?.href;

        return {
          approvalUrl,
          paymentId: payment.id,
        };
      } catch (error) {
        throw new GraphQLError("Payment creation failed", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
          },
        });
      }
    },

    executePayment: async (
      _: any,
      { paymentId, payerId, orderId }: any,
      { user }: Context
    ) => {
      requireAuth(user);

      const order = await Order.findById(orderId);
      if (!order) {
        throw new GraphQLError("Order not found", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      if (order.buyer.toString() !== user!._id) {
        throw new GraphQLError("Access denied", {
          extensions: {
            code: "FORBIDDEN",
          },
        });
      }

      try {
        await executePayment(paymentId, payerId);

        order.status = "paid";
        order.paypalOrderId = paymentId;
        await order.save();

        // Reduce product stock
        await Product.findByIdAndUpdate(order.product, {
          $inc: { stock: -order.quantity },
        });

        return Order.findById(order._id)
          .populate("buyer", "firstName lastName email")
          .populate("seller", "firstName lastName email")
          .populate("product");
      } catch (error) {
        throw new GraphQLError("Payment execution failed", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
          },
        });
      }
    },

    sendMessage: async (_: any, { input }: any, { user }: Context) => {
      requireAuth(user);

      const { error } = messageSchema.validate(input);
      if (error) {
        throw new GraphQLError(error.details[0].message, {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const receiver = await User.findById(input.receiverId);
      if (!receiver) {
        throw new GraphQLError("Receiver not found", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const message = new Message({
        sender: user!._id,
        receiver: input.receiverId,
        content: input.content,
        orderId: input.orderId || null,
      });

      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "firstName lastName email")
        .populate("receiver", "firstName lastName email");

      pubsub.publish("MESSAGE_ADDED", {
        messageAdded: populatedMessage,
        userId: input.receiverId,
      });

      return populatedMessage;
    },
  },

  Subscription: {
    messageAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator(["MESSAGE_ADDED"]),
        (payload, variables) => {
          return payload.userId === variables.userId;
        }
      ),
    },

    orderStatusUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator(["ORDER_STATUS_UPDATED"]),
        (payload, variables) => {
          return payload.userId === variables.userId;
        }
      ),
    },
  },
};
