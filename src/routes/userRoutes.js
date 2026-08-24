import express from "express";
import { createUser, verifySignupOtp } from "../controllers/userController.js";
import { getAllusers, searchAdminUsers } from "../controllers/allUserList.js";
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
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  createUserSchema,
  loginUserSchema,
  loginWithGoogleSchema,
  verifySignupOtpSchema,
} from "../validators/auth.validators.js";

const router = express.Router();
const getUsers = (req, res) =>
  req.query._id || req.query.id
    ? getUserProfileById(req, res)
    : getAllusers(req, res);

// Public routes - No authentication required
router.post("/create-user", validateRequest(createUserSchema), createUser);
router.post("/verify-email-otp", validateRequest(verifySignupOtpSchema), verifySignupOtp);
router.post("/login-user", validateRequest(loginUserSchema), loginUser);
router.post("/login-google", validateRequest(loginWithGoogleSchema), loginWithGoogle);

// Admin user routes - Authentication required
router.get("/admin/users", authenticateRequest, requireAdmin, getUsers);
router.get("/admin/users/search", authenticateRequest, requireAdmin, searchAdminUsers);
router.get("/admin/users/:_id", authenticateRequest, requireAdmin, getUserProfileById);
router.delete("/admin/users/:_id", authenticateRequest, requireAdmin, deleteUserProfileById);

// Protected routes - Authentication required
router.patch("/users/:_id", authenticateRequest, updateUserProfileById);

export default router;
