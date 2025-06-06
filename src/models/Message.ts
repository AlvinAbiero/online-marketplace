import mongoose, { Schema } from "mongoose";
import { Message } from "../types";

const MessageSchema = new Schema<Message>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      defaault: null,
    },
  },
  { timestamps: true }
);

MessageSchema.index({ sender: 1, receiver: 1 });
MessageSchema.index({ createdAt: -1 });

export default mongoose.model<Message>("Message", MessageSchema);
