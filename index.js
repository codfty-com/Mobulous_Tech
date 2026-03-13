import express from "express";
import { connectDB } from "./src/config/db.js";
import userRoutes from "./src/routes/userRoutes.js";

const app = express();
app.use(express.json());
const PORT = 4500;

connectDB();

app.use("/api", userRoutes);

app.listen(PORT, () => {
  console.log(`Server is Running on ${PORT}`);
});
