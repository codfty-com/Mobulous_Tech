import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("Please define MONGO_URI in environment variables");
}

let cached = global.mongoose || { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI).then((mongooseInstance) => {
      console.log("MongoDB connected");
      return mongooseInstance;
    });
  }

  cached.conn = await cached.promise;
  global.mongoose = cached;

  return cached.conn;
};

export default connectDB;
