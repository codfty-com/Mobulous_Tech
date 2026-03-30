import express from "express";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import resetPassRoutes from "./routes/resetPassRoutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

// ✅ Middleware to connect DB per request (serverless safe)
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.use("/api", userRoutes);
app.use("/api", resetPassRoutes);

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// ❌ REMOVE THIS (VERY IMPORTANT)
// app.listen(PORT)

export default app;
