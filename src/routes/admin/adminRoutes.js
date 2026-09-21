import express from "express";
import adminUsersRoutes from "./adminUsersRoutes.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { loginAdmin, forgotAdminPassword, verifyAdminOtp, resetAdminPassword } from "../../controllers/adminAuth.controller.js";
import { adminLoginSchema, adminForgotPasswordSchema, adminVerifyOtpSchema, adminResetPasswordSchema } from "../../validators/adminAuth.validators.js";

const router = express.Router();

router.post("/login", validateRequest(adminLoginSchema), loginAdmin);
router.post("/forgot-password", validateRequest(adminForgotPasswordSchema), forgotAdminPassword);
router.post("/verify-otp", validateRequest(adminVerifyOtpSchema), verifyAdminOtp);
router.post("/reset-password", validateRequest(adminResetPasswordSchema), resetAdminPassword);
router.use("/users", adminUsersRoutes);

export default router;
