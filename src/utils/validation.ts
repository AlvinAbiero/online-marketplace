import Joi from "joi";

export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid("buyer", "seller").default("buyer"),
});

export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const productSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  price: Joi.number().min(0).positive().required(),
  category: Joi.string().min(2).max(50).required(),
  stock: Joi.number().integer().min(0).required(),
});

export const orderSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
});

export const messageSchema = Joi.object({
  receiverId: Joi.string().required(),
  content: Joi.string().min(1).max(1000).required(),
  orderId: Joi.string().optional(), // Optional if not related to an order
});
