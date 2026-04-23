import User from "../models/user.js";
import { sendError, sendSuccess } from "../utils/http.js";

export const getAllusers = async (req, res) => {
  try {
    const users = await User.find().select("-password -otp -otpExpiry");

    return sendSuccess(res, {
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return sendError(res, {
      statusCode: 500,
      message: "Internal server error",
    });
  }
};
