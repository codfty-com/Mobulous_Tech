import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { env } from "../config/env.js";
import { generateTokenPair, revokeAllUserTokens } from "../services/jwt.service.js";
import { createOtpRecord, matchesOtp } from "../utils/otp.js";
import { buildOtpEmail } from "../utils/otpEmailTemplate.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendError, sendSuccess } from "../utils/http.js";

const activeAdmin = (email) => ({ email, admin: true, isDeleted: { $ne: true }, isEmailVerified: true });
const resetFields = "+adminResetHash +adminResetExpiry +adminResetAttempts";
const invalidOtp = (res) => sendError(res, { statusCode: 400, message: "Invalid or expired OTP. Request a new code if attempts are exhausted." });
const forgotMessage = "If an active admin account exists for this email, a password reset OTP has been sent.";

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.validated.body;
    const admin = await User.findOne(activeAdmin(email));
    if (!admin?.password || !(await bcrypt.compare(password, admin.password))) {
      return sendError(res, { statusCode: 401, message: "Invalid admin email or password" });
    }
    const tokens = await generateTokenPair(admin, {
      userAgent: req.get("user-agent"), ip: req.ip,
    });
    return sendSuccess(res, {
      message: "Admin login successful",
      data: { user: { _id: admin._id, email: admin.email, name: admin.name, admin: true }, ...tokens },
    });
  } catch (error) {
    console.error("Admin login failed:", error.message);
    return sendError(res, { message: "Unable to log in" });
  }
};

export const forgotAdminPassword = async (req, res) => {
  let admin;
  let otpHash;
  try {
    const { email } = req.validated.body;
    const record = createOtpRecord();
    otpHash = record.otpHash;
    // Claim the cooldown and replace the challenge atomically across instances.
    admin = await User.findOneAndUpdate({
      ...activeAdmin(email),
      $or: [
        { adminResetSentAt: { $exists: false } },
        { adminResetSentAt: { $lte: new Date(Date.now() - 60_000) } },
      ],
    }, { $set: {
      adminResetHash: otpHash, adminResetExpiry: record.otpExpiry,
      adminResetAttempts: 0, adminResetSentAt: new Date(),
    } }, { new: true });

    if (admin) {
      const content = buildOtpEmail({
        otp: record.otp, title: "Admin Password Reset",
        purpose: "admin password reset", expiryMinutes: env.otpExpiryMinutes,
      });
      await sendEmail(admin.email, content.subject, content);
    }
    return sendSuccess(res, { message: forgotMessage });
  } catch (error) {
    if (admin) {
      // Do not erase a newer challenge if another request has replaced this one.
      await User.updateOne({ _id: admin._id, adminResetHash: otpHash }, { $unset: {
        adminResetHash: "", adminResetExpiry: "", adminResetAttempts: "", adminResetSentAt: "",
      } }).catch(() => {});
    }
    console.error("Admin password reset email failed:", error.message);
    return sendError(res, { statusCode: 503, message: "Unable to send reset email. Please try again." });
  }
};

const checkChallenge = async (email, otp) => {
  // Reserve an attempt before checking the OTP so concurrent guesses share a limit.
  const admin = await User.findOneAndUpdate({
    ...activeAdmin(email), adminResetExpiry: { $gt: new Date() },
    adminResetHash: { $exists: true }, adminResetAttempts: { $lt: 5 },
  }, { $inc: { adminResetAttempts: 1 } }, { new: true }).select(resetFields);
  return admin && matchesOtp(admin.adminResetHash, otp) ? admin : null;
};

export const verifyAdminOtp = async (req, res) => {
  try {
    const { email, otp } = req.validated.body;
    if (!(await checkChallenge(email, otp))) return invalidOtp(res);
    return sendSuccess(res, { message: "OTP verified. Submit this OTP with your new password to reset it." });
  } catch (error) {
    console.error("Admin OTP verification failed:", error.message);
    return sendError(res, { message: "Unable to verify OTP" });
  }
};

export const resetAdminPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.validated.body;
    const admin = await checkChallenge(email, otp);
    if (!admin) return invalidOtp(res);
    const password = await bcrypt.hash(newPassword, 12);
    // Password update and OTP consumption must succeed together, exactly once.
    const result = await User.updateOne({
      _id: admin._id, ...activeAdmin(email), adminResetHash: admin.adminResetHash,
      adminResetExpiry: { $gt: new Date() }, adminResetAttempts: { $lte: 5 },
    }, {
      $set: { password, otp: null, otpExpiry: null },
      $inc: { adminTokenVersion: 1 },
      $unset: { adminResetHash: "", adminResetExpiry: "", adminResetAttempts: "" },
    });
    if (!result.modifiedCount) return invalidOtp(res);
    // Version checks already invalidate both access and refresh JWTs immediately.
    await revokeAllUserTokens(admin._id).catch((error) => {
      console.error("Admin refresh token cleanup failed:", error.message);
    });
    return sendSuccess(res, { message: "Admin password reset successful. Please log in again." });
  } catch (error) {
    console.error("Admin password reset failed:", error.message);
    return sendError(res, { message: "Unable to reset password" });
  }
};
