import mongoose, { Schema } from "mongoose";
import { Order } from "../types";

const OrderSchema = new Schema<Order>(
  {
    buyer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paypalOrderId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

OrderSchema.index({ buyer: 1 });
OrderSchema.index({ seller: 1 });
OrderSchema.index({ status: 1 });

export default mongoose.model<Order>("Order", OrderSchema);
