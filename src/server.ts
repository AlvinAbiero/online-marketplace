import express from "express";
import { createServer } from "http";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import cors from "cors";
import dotenv from "dotenv";
import { typeDefs } from "./graphql/typeDefs";
import { resolvers } from "./graphql/resolvers";
import { connectDatabase } from "./config/database";
import { authenticate } from "./middleware/auth";
import { SocketManager } from "./socket";
import { Context } from "./types";

dotenv.config();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  await connectDatabase();

  // Create GraphQL schema
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  // Handle WebSocket connections for subscriptions
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx, msg, args) => {
        // Extract user from WebSocket connection if needed
        // You can add authentication logic here for subscriptions
        return {
          user: null, // Add your WebSocket auth Logic here
        };
      },
    },
    wsServer
  );

  // Create Apollo Server
  const apolloServer = new ApolloServer({
    schema,
    plugins: [
      // Proper shutdown for HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Proper shutdown for WebSocket server
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },

      // Custom plugin for headers and logging
      {
        async requestDidStart() {
          return {
            async willSendResponse(requestContext) {
              // Add custom headers if needed
              requestContext.response.http?.headers.set("X-API-Version", "1.0");
            },
          };
        },
      },
    ],
  });

  //   Start Apollo Server
  await apolloServer.start();

  // Initialize Socket.IO (for additional real-time features beyond GraphQL subscriptions)
  const socketManager = new SocketManager(httpServer);

  // Apply CORS and JSON parsing middleware
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  //   Health check endpoint
}
