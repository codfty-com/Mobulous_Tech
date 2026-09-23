import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { env } from "../config/env.js";
import { buildOtpEmail } from "../utils/otpEmailTemplate.js";
import { createOtpRecord, matchesOtp } from "../utils/otp.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendError, sendSuccess } from "../utils/http.js";
import { revokeAllUserTokens } from "../services/jwt.service.js";

const eligible = (email) => ({
  email, admin: { $ne: true }, isDeleted: { $ne: true }, isEmailVerified: true,
  authMethods: "email_password", password: { $exists: true },
});
const invalid = (res) => sendError(res, { statusCode: 400, message: "Invalid or expired OTP. Request a new code if attempts are exhausted." });
const resetFields = "+resetHash +resetExpiry +resetAttempts";
const confirmation = "If an eligible account exists, a password reset code has been sent.";

export const forgotPassword = async (req, res) => {
  let user;
  let hash;
  try {
    const { email } = req.validated.body;
    const { otp, otpHash, otpExpiry } = createOtpRecord();
    hash = otpHash;
    user = await User.findOneAndUpdate({
      ...eligible(email),
      $or: [{ resetSentAt: { $exists: false } }, { resetSentAt: { $lte: new Date(Date.now() - 60_000) } }],
    }, { $set: { resetHash: otpHash, resetExpiry: otpExpiry, resetAttempts: 0, resetSentAt: new Date() } }, { returnDocument: "after" });
    if (user) {
      const content = buildOtpEmail({ otp, title: "Password Reset", purpose: "password reset", expiryMinutes: env.otpExpiryMinutes });
      await sendEmail(user.email, content.subject, content);
    }
    return sendSuccess(res, { message: confirmation });
  } catch (error) {
    if (user) await User.updateOne({ _id: user._id, resetHash: hash }, {
      $unset: { resetHash: "", resetExpiry: "", resetAttempts: "", resetSentAt: "" },
    }).catch(() => {});
    console.error("Password reset email failed:", error.message);
    return sendError(res, { statusCode: 503, message: "Unable to send reset email. Please try again." });
  }
};

async function checkChallenge(email, otp) {
  const user = await User.findOneAndUpdate({
    ...eligible(email), resetHash: { $exists: true }, resetExpiry: { $gt: new Date() }, resetAttempts: { $lt: 5 },
  }, { $inc: { resetAttempts: 1 } }, { returnDocument: "after" }).select(resetFields);
  return user && matchesOtp(user.resetHash, otp) ? user : null;
}

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.validated.body;
    if (!(await checkChallenge(email, otp))) return invalid(res);
    return sendSuccess(res, { message: "OTP verified successfully" });
  } catch (error) {
    console.error("Password OTP verification failed:", error.message);
    return sendError(res, { message: "Unable to verify OTP" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.validated.body;
    const user = await checkChallenge(email, otp);
    if (!user) return invalid(res);
    const password = await bcrypt.hash(newPassword, 12);
    const changed = await User.updateOne({
      _id: user._id, ...eligible(email), resetHash: user.resetHash,
      resetExpiry: { $gt: new Date() }, resetAttempts: { $lte: 5 },
    }, {
      $set: { password, otp: null, otpExpiry: null },
      $inc: { tokenVersion: 1 },
      $unset: { resetHash: "", resetExpiry: "", resetAttempts: "" },
    });
    if (!changed.modifiedCount) return invalid(res);
    await revokeAllUserTokens(user._id).catch((error) => console.error("Refresh cleanup failed:", error.message));
    return sendSuccess(res, { message: "Password reset successful. Please sign in again." });
  } catch (error) {
    console.error("Password reset failed:", error.message);
    return sendError(res, { message: "Unable to reset password" });
  }
};
