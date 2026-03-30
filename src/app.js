import express from "express";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import resetPassRoutes from "./routes/resetPassRoutes.js";

dotenv.config();

const app = express();

// ✅ FIX 1: Proper Body Parsers (prevents request size mismatch error)
app.use(express.json({ limit: "10mb", strict: false }));
app.use(express.urlencoded({ extended: true }));

// ✅ FIX 2: DB Connection Middleware (with proper error handling)
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

// ✅ FIX 3: Handle unknown routes (prevents hanging requests)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ✅ FIX 4: Global Error Handler (VERY IMPORTANT)
app.use((err, req, res, next) => {
  console.error("Global Error:", err);

  // Handle body parser error specifically
  if (
    err.type === "entity.parse.failed" ||
    err.type === "request.size.invalid"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid request body or size mismatch",
    });
  }

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
