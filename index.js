import express from "express";
import connectDB from "./config/db";

const app = express();
const PORT = 4500;

connectDB();

app.listen(PORT, () => {
  console.log(`Server is Running on ${PORT}`);
});
