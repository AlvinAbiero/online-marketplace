import { Request } from "express";
import { Document, Types } from "mongoose";

export interface User extends Document {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: "buyer" | "seller" | "admin";
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product extends Document {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  seller: Types.ObjectId; // User ID
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order extends Document {
  _id: string;
  buyer: Types.ObjectId; // User ID
  seller: Types.ObjectId; // User ID
  product: Types.ObjectId; // Product ID
  quantity: number;
  totalAmount: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  paypalOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message extends Document {
  _id: string;
  sender: Types.ObjectId; // User ID
  receiver: Types.ObjectId; // User ID;
  content: string;
  orderId?: Types.ObjectId; // Order ID
  createdAt: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface Context {
  user?: User;
  req: AuthRequest;
}
