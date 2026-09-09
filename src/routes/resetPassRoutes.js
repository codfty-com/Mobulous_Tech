import express from "express";
import {
  forgotPassword,
  verifyOtp,
  resetPassword,
} from "../controllers/forgetPassController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyPasswordOtpSchema,
} from "../validators/auth.validators.js";

const router = express.Router();

router.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/verify-otp",
  validateRequest(verifyPasswordOtpSchema),
  verifyOtp,
);
router.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  resetPassword,
);

export default router;
