import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import resetPassRoutes from "./routes/resetPassRoutes.js";

dotenv.config();

const app = express();

const trimTrailingPathWhitespace = (url) => {
  const queryStart = url.indexOf("?");
  const pathname = queryStart === -1 ? url : url.slice(0, queryStart);
  const query = queryStart === -1 ? "" : url.slice(queryStart);

  return `${pathname.replace(/(?:%0A|%0D|%09|%20|\s)+$/gi, "")}${query}`;
};

app.use((req, res, next) => {
  req.url = trimTrailingPathWhitespace(req.url);
  next();
});

// ✅ CORS - must be before body parsers
app.use(cors());

// ✅ Body parsers
app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));

// ✅ Fallback: parse raw body as JSON if Content-Type header was missing
app.use((req, res, next) => {
  if (req.body !== undefined) return next(); // already parsed

  const method = req.method;
  if (method !== "POST" && method !== "PUT" && method !== "PATCH") return next();

  let raw = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => { raw += chunk; });
  req.on("end", () => {
    if (raw) {
      try {
        req.body = JSON.parse(raw);
      } catch {
        req.body = {};
      }
    } else {
      req.body = {};
    }
    next();
  });
});

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
app.use("/", userRoutes);
app.use("/", resetPassRoutes);

// ✅ Health check
app.get("/", (req, res) => {
  res.status(200).send("🚀 API is running on Vercel");
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
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
