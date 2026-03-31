import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("❌ MONGO_URI is not defined in environment variables");
}

let cached = global.mongoose || { conn: null, promise: null };

const connectDB = async () => {
  try {
    if (cached.conn) {
      return cached.conn;
    }

    if (!cached.promise) {
      cached.promise = mongoose
        .connect(MONGO_URI, {
          bufferCommands: false,
        })
        .then((mongooseInstance) => {
          console.log("✅ MongoDB connected");
          return mongooseInstance;
        });
    }

    cached.conn = await cached.promise;
    global.mongoose = cached;

    return cached.conn;
  } catch (error) {
    console.error("❌ DB Connection Error:", error);
    throw error;
  }
};

export default connectDB;
