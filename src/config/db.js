import mongoose from "mongoose";
import { env } from "./env.js";

let cached = globalThis.__mongoose || { conn: null, promise: null };

const connectDB = async () => {
  try {
    if (!env.mongoUri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    if (cached.conn) {
      return cached.conn;
    }

    if (!cached.promise) {
      const connectOptions = {
        bufferCommands: false,
        ...(env.mongoDbName ? { dbName: env.mongoDbName } : {}),
      };

      cached.promise = mongoose
        .connect(env.mongoUri, connectOptions)
        .then((mongooseInstance) => {
          console.log("MongoDB connected");
          return mongooseInstance;
        });
    }

    cached.conn = await cached.promise;
    globalThis.__mongoose = cached;

    return cached.conn;
  } catch (error) {
    console.error("DB connection error:", error);
    throw error;
  }
};

export default connectDB;
