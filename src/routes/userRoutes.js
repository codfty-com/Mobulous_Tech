import express from "express";
import { createUser, verifySignupOtp } from "../controllers/userController.js";
import { getAllusers } from "../controllers/allUserList.js";
import {
  loginUser,
  loginWithGoogle,
} from "../controllers/userLoginController.js";

const router = express.Router();

router.post("/create-user", createUser);
router.post(["/verify-email-otp"], verifySignupOtp);
router.get("/users", getAllusers);
router.post("/login-user", loginUser);
router.post("/login-google", loginWithGoogle);

export default router;
