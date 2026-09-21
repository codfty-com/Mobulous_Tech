import mongoose from "mongoose";
import User from "../models/user.js";
import { sendError, sendSuccess } from "../utils/http.js";

const SAFE_USER_SELECT = "-password -otp -otpExpiry";

const userIdFromParams = (req) => req.params._id || req.params.id;

const validateUserId = (req, res) => {
  const userId = userIdFromParams(req);

  if (!mongoose.isValidObjectId(userId)) {
    sendError(res, { statusCode: 400, message: "Invalid user _id" });
    return null;
  }

  return userId;
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select(SAFE_USER_SELECT)
      .sort({ createdAt: -1 });

    return sendSuccess(res, {
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    return sendError(res, { statusCode: 500, message: "Internal server error" });
  }
};

export const softDeleteUserById = async (req, res) => {
  try {
    const userId = validateUserId(req, res);
    if (!userId) return null;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true, runValidators: true },
    ).select(SAFE_USER_SELECT);

    if (!user) {
      return sendError(res, { statusCode: 404, message: "User not found" });
    }

    return sendSuccess(res, {
      message: "User soft-deleted successfully",
      data: user,
    });
  } catch (error) {
    console.error("Soft-delete user error:", error);
    return sendError(res, { statusCode: 500, message: "Internal server error" });
  }
};

export const permanentlyDeleteUserById = async (req, res) => {
  try {
    const userId = validateUserId(req, res);
    if (!userId) return null;

    const user = await User.findByIdAndDelete(userId).select(SAFE_USER_SELECT);

    if (!user) {
      return sendError(res, { statusCode: 404, message: "User not found" });
    }

    return sendSuccess(res, {
      message: "User permanently deleted successfully",
      data: user,
    });
  } catch (error) {
    console.error("Permanently delete user error:", error);
    return sendError(res, { statusCode: 500, message: "Internal server error" });
  }
};
