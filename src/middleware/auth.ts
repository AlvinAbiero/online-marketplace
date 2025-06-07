import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader } from "../utils/auth";
import User from "../models/User";
import { AuthRequest } from "../types";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return next();
    }

    const { userId } = verifyToken(token);
    const user = await User.findById(userId);

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    next();
  }
};
