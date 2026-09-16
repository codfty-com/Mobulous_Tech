import express from "express";
import { getAllIndices } from "../controllers/indices.controller.js";

const router = express.Router();

router.get("/indices", getAllIndices);

export default router;
