import express from "express";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import resetPassRoutes from "./routes/resetPassRoutes.js";

dotenv.config();

const app = express();

// ✅ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbPromise = connectDB();

// ✅ Middleware to ensure DB is connected before processing requests
app.use(async (req, res, next) => {
  try {
    await dbPromise;
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ Routes
app.use("/api", userRoutes);
app.use("/api", resetPassRoutes);

// ✅ Health check
app.get("/", (req, res) => {
  res.status(200).send("🚀 API is running on Vercel");
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
