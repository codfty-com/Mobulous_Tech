import express from "express";
import { connectDB } from "./src/config/db.js";
import userRoutes from "./src/routes/userRoutes.js";
import resetPassRoutes from "./src/routes/resetPassRoutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

connectDB();

app.use("/api", userRoutes);
app.use("/api", resetPassRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is Running on ${PORT}`);
});