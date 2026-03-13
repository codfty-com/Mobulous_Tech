import express from "express";
import { createUser, getAllusers } from "../controllers/userController.js";

const router = express.Router();

router.post("/create-user", createUser);
router.get("/users", getAllusers);

export default router;
