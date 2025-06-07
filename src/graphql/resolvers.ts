import {
  AuthenticationError,
  ForbiddenError,
  UserInputError,
} from "apollo-server-express";
// import { withFilter, PubSub } from "graphql-subscriptions";
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

// const pubsub = new PubSub();

const requireAuth = (user: any) => {
  if (!user) {
    throw new AuthenticationError(
      "You must be logged in to perform this action"
    );
  }
};

const requireSeller = (user: any) => {
  requireAuth(user);
  if (user.role !== "seller" && user.role !== "admin") {
    throw new ForbiddenError("You must be a seller to perform this action");
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
        throw new UserInputError("Product not found or inactive");
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
        throw new UserInputError("Order not found");
      }

      if (
        order.buyer._id.toString() !== user!._id &&
        order.seller._id.toString() !== user!._id
      ) {
        throw new ForbiddenError("Access denied");
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
        throw new UserInputError(error.details[0].message);
      }

      const existingUser = await User.findOne({ email: input.email });
      if (existingUser) {
        throw new UserInputError("User with this email already exists");
      }

      const user = new User(input);
      await user.save();

      const token = generateToken(user._id);
      return { token, user };
    },
  },
};
