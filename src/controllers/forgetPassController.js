import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import User from "../models/user.js";
import { buildOtpEmail } from "../utils/otpEmailTemplate.js";
import { createOtpRecord, isOtpExpired, matchesOtp } from "../utils/otp.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendError, sendSuccess } from "../utils/http.js";

const OTP_EXPIRY_MINUTES = env.otpExpiryMinutes;

// SEND OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.validated?.body || req.body;
    const user = await User.findOne({ email, admin: { $ne: true } });

    if (!user) {
      return sendError(res, { statusCode: 400, message: "User not found" });
    }

    const { otp, otpHash, otpExpiry } = createOtpRecord();

    user.otp = otpHash;
    user.otpExpiry = otpExpiry;

    await user.save();

    const emailContent = buildOtpEmail({
      otp,
      title: "Your OTP Code",
      purpose: "password reset",
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });

    await sendEmail(email, emailContent.subject, emailContent);

    return sendSuccess(res, {
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR", error);

    return sendError(res, {
      message: "Server error",
      ...(!env.isProduction ? { error: error.message } : {}),
    });
  }
};

// otp verification
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.validated?.body || req.body;
    const user = await User.findOne({ email, admin: { $ne: true } });

    if (!user) {
      return sendError(res, { statusCode: 400, message: "User not found" });
    }

    if (!matchesOtp(user.otp, otp)) {
      return sendError(res, { statusCode: 400, message: "Invalid OTP" });
    }

    if (isOtpExpired(user.otpExpiry)) {
      return sendError(res, { statusCode: 400, message: "OTP expired" });
    }

    return sendSuccess(res, {
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("VERIFY PASSWORD OTP ERROR", error);
    return sendError(res, { message: "Server error" });
  }
};

// reset password with new password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.validated?.body || req.body;
    const user = await User.findOne({ email, admin: { $ne: true } });

    if (!user) {
      return sendError(res, { statusCode: 400, message: "User not found" });
    }

    if (!matchesOtp(user.otp, otp)) {
      return sendError(res, { statusCode: 400, message: "Invalid OTP" });
    }

    if (isOtpExpired(user.otpExpiry)) {
      return sendError(res, { statusCode: 400, message: "OTP expired" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    return sendSuccess(res, {
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR", error);
    return sendError(res, { message: "Server error" });
  }
};
