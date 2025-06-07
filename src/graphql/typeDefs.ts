export const typeDefs = `#graphql
type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    avatar: String
    role: Role!
    isverified: Boolean!
    createdAt: String!
    updatedAt: String!
}

type Product {
    id: ID!
    title: String!
    description: String!
    price: Float!
    category: String!
    images: [String!]!
    seller: User!
    stock: Int!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
}

type Order {
    id: ID!
    buyer: User!
    seller: User!
    product: Product!
    quantity: Int!
    totalAmount: Float!
    status: OrderStatus!
    paypalOrderId: String
    createdAt: String!
    updatedAt: String!
}

type Message {
    id: ID!
    sender: User!
    receiver: User!
    content: String!
    orderId: ID!
    createdAt: String!
}

type AuthPayload {
    token: String!
    user: User!
}

type PaymentPayload {
    approvalUrl: String!
    paymentId: String!
}

enum Role {
    BUYER
    SELLER
    ADMIN
  }

enum OrderStatus {
    PENDING
    PAID
    SHIPPED
    DELIVERED
    CANCELLED
  }

input RegisterInput {
    email: String!
    firstName: String!
    lastName: String!
    password: String!
    role: Role = BUYER
}

input LoginInput {
    email: String!
    password: String!
}

input ProductInput {
    title: String!
    description: String!
    price: Float!
    category: String!
    stock: Int!
}

input OrderInput {
    productId: ID!
    quantity: Int!
}

input MessageInput {
    receiverId: ID!
    content: String!
    orderId: ID!
}

type Query {
    me: User
    products(category: String, search: String, limit: Int, offset: Int): [Product!]!
    product(id: ID!): Product
    myProducts: [Product!]!
    orders: [Order!]!
    order(id: ID!): Order
    messages(userId: ID!): [Message!]!
}

type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!

    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductInput!): Product!
    deleteProduct(id: ID!): Boolean!

    createOrder(input: OrderInput!): Order!
    updateOrderStatus(id: ID!, status: OrderStatus!): Order!

    createPayment(orderId: ID!): PaymentPayload!
    executePayment(paymentId: String!, payerId: String!, orderId: ID!): Order!

    sendMessage(input: MessageInput!): Message!
}

type Subscription {
    messageAdded(userId: ID!): Message!
    orderStatusUpdated(orderId: ID!): Order!
}

`;
