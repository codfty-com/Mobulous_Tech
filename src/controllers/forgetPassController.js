import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import User from "../models/user.js";
import { buildOtpEmail } from "../utils/otpEmailTemplate.js";
import { createOtpRecord, isOtpExpired, matchesOtp } from "../utils/otp.js";
import { sendEmail } from "../utils/sendEmail.js";

const OTP_EXPIRY_MINUTES = env.otpExpiryMinutes;

// SEND OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
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

    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR", error);

    return res.status(500).json({
      message: "Server error",
      ...(!env.isProduction ? { error: error.message } : {}),
    });
  }
};

// otp verification
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });

    if (!matchesOtp(user.otp, otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (isOtpExpired(user.otpExpiry)) {
      return res.status(400).json({ message: "OTP expired" });
    }

    return res.status(200).json({
      message: "OTP verified successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// reset password with new password
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    return res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
