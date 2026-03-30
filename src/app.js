import express from "express";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import resetPassRoutes from "./routes/resetPassRoutes.js";

dotenv.config();

const app = express();

// ✅ Middleware
app.use(express.json());

// ✅ DB Connection Middleware (SAFE for Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("DB Connection Error:", error);
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// ✅ Routes
app.use("/api", userRoutes);
app.use("/api", resetPassRoutes);

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.status(200).send("🚀 API is running on Vercel");
});

// ❌ DO NOT USE app.listen()

// ✅ Global Error Handler (VERY IMPORTANT)
app.use((err, req, res, next) => {
  console.error("Global Error:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
