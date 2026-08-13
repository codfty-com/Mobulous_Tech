import express from "express";
import { createUser, verifySignupOtp } from "../controllers/userController.js";
import { getAllusers } from "../controllers/allUserList.js";
import {
  deleteUserProfileById,
  getUserProfileById,
  updateUserProfileById,
} from "../controllers/userProfileController.js";
import {
  loginUser,
  loginWithGoogle,
} from "../controllers/userLoginController.js";
import { authenticateRequest, requireAdmin } from "../middlewares/jwt.js";

const router = express.Router();
const getUsers = (req, res) =>
  req.query._id || req.query.id
    ? getUserProfileById(req, res)
    : getAllusers(req, res);

// Public routes - No authentication required
router.post("/create-user", createUser);
router.post(["/verify-email-otp"], verifySignupOtp);
router.post("/login-user", loginUser);
router.post("/login-google", loginWithGoogle);

// Protected routes - Authentication required
router.get("/users", authenticateRequest, requireAdmin, getUsers); // Admin only
router.get("/users/:_id", authenticateRequest, getUserProfileById);
router.patch("/users/:_id", authenticateRequest, updateUserProfileById);
router.delete("/users/:_id", authenticateRequest, requireAdmin, deleteUserProfileById); // Admin only

export default router;
