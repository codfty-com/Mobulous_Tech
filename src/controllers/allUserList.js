import User from "../models/user.js";
import { sendError, sendSuccess } from "../utils/http.js";

const SAFE_USER_SELECT = "-password -otp -otpExpiry";

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.min(parsed, max);
};

export const getAllusers = async (req, res) => {
  try {
    const users = await User.find().select(SAFE_USER_SELECT);
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

export const searchAdminUsers = async (req, res) => {
  try {
    const query = String(req.query.query || req.query.search || "").trim();
    const name = String(req.query.name || "").trim();
    const email = String(req.query.email || "").trim();
    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const filter = {};

    if (query) {
      const regex = { $regex: escapeRegex(query), $options: "i" };
      filter.$or = [{ name: regex }, { email: regex }];
    }

    if (name) {
      filter.name = { $regex: escapeRegex(name), $options: "i" };
    }

    if (email) {
      filter.email = { $regex: escapeRegex(email), $options: "i" };
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter)
        .select(SAFE_USER_SELECT)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      message: "Admin user search fetched successfully",
      query: {
        ...(query ? { query } : {}),
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      },
      count: users.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      data: users,
    });
  } catch (error) {
    console.error("Admin user search error:", error);
    return sendError(res, {
      statusCode: 500,
      message: "Internal server error",
    });
  }
};
