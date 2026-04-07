import express from "express";
import {
  createUser,
  getAllusers,
  verifySignupOtp,
} from "../controllers/userController.js";
import { loginUser } from "../controllers/userLoginController.js";

const router = express.Router();

router.post("/create-user", createUser);
router.post(
  [
    "/verify-signup-otp",
    "/verify-email-otp",
    "/verify-user-otp",
    "/verifySignupOtp",
    "/signup/verify-otp",
    "/signup/verify",
  ],
  verifySignupOtp,
);
router.get("/users", getAllusers);
router.post("/login-user", loginUser);

export default router;
