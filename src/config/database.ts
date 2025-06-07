import mongoose from "mongoose";

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI!;

    await mongoose.connect(mongoUri);

    console.log("✅ Connected to MongoDB");

    // Handle connection errors
    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};
