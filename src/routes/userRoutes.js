import express from "express";
import { createUser, getAllusers } from "../controllers/userController.js";
import { loginUser } from "../controllers/userLoginController.js";

const router = express.Router();

router.post("/create-user", createUser);
router.get("/users", getAllusers);
router.post("/login-user", loginUser);

export default router;
