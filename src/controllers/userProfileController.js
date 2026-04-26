import mongoose from "mongoose";
import User from "../models/user.js";
import { sendError, sendSuccess } from "../utils/http.js";

const SAFE_USER_SELECT = "-password -otp -otpExpiry";
const PROFILE_FIELDS = ["name", "phone", "profilePicture"];

const sanitizeString = (value) =>
  typeof value === "string" ? value.trim() : value;

const getRequestUserId = (req) => {
  const id = req.params._id || req.params.id || req.query._id || req.query.id;

  if (Array.isArray(id)) {
    return id[0];
  }

  return id;
};

const parsePhone = (value) => {
  if (value === undefined) return { hasValue: false };
  if (value === null || value === "") return { hasValue: true, value: undefined };

  const normalized = String(value).replace(/[^\d+]/g, "");

  if (!/^\+?\d{7,15}$/.test(normalized)) {
    return { error: "phone must be a valid phone number" };
  }

  return { hasValue: true, value: normalized };
};

const buildProfileUpdate = (body) => {
  const update = { $set: {}, $unset: {} };
  const errors = [];

  if (!body || Array.isArray(body) || typeof body !== "object") {
    errors.push("request body must be a JSON object");
    return { update, errors };
  }

  if (Object.keys(body).length === 0) {
    errors.push("at least one profile field is required");
  }

  if (body.name !== undefined) {
    const name = sanitizeString(body.name);

    if (!name) {
      errors.push("name cannot be empty");
    } else if (name.length < 2) {
      errors.push("name must be at least 2 characters long");
    } else {
      update.$set.name = name;
    }
  }

  if (body.phone !== undefined) {
    const phoneResult = parsePhone(body.phone);

    if (phoneResult.error) {
      errors.push(phoneResult.error);
    } else if (phoneResult.hasValue) {
      if (phoneResult.value === undefined) {
        update.$unset.phone = "";
      } else {
        update.$set.phone = phoneResult.value;
      }
    }
  }

  if (body.profilePicture !== undefined) {
    const profilePicture = sanitizeString(body.profilePicture);
    if (profilePicture) {
      update.$set.profilePicture = profilePicture;
    } else {
      update.$unset.profilePicture = "";
    }
  }

  const unsupportedFields = Object.keys(body).filter(
    (field) => !PROFILE_FIELDS.includes(field),
  );

  if (unsupportedFields.length) {
    errors.push(
      `unsupported profile fields: ${unsupportedFields.join(", ")}`,
    );
  }

  if (
    !Object.keys(update.$set).length &&
    !Object.keys(update.$unset).length &&
    !errors.length
  ) {
    errors.push("at least one profile field is required");
  }

  if (!Object.keys(update.$set).length) {
    delete update.$set;
  }

  if (!Object.keys(update.$unset).length) {
    delete update.$unset;
  }

  return { update, errors };
};

export const getUserProfileById = async (req, res) => {
  try {
    const _id = getRequestUserId(req);

    if (!mongoose.isValidObjectId(_id)) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid user _id",
      });
    }

    const user = await User.findById(_id).select(SAFE_USER_SELECT);

    if (!user) {
      return sendError(res, {
        statusCode: 404,
        message: "User not found",
      });
    }

    return sendSuccess(res, {
      message: "User profile fetched successfully",
      data: user,
    });
  } catch (error) {
    console.error("Get user profile error:", error);

    return sendError(res, {
      statusCode: 500,
      message: "Internal server error",
    });
  }
};

export const updateUserProfileById = async (req, res) => {
  try {
    const _id = getRequestUserId(req);

    if (!mongoose.isValidObjectId(_id)) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid user _id",
      });
    }

    const { update, errors } = buildProfileUpdate(req.body);

    if (errors.length) {
      return sendError(res, {
        statusCode: 400,
        message: "Validation failed",
        details: errors,
      });
    }

    const user = await User.findByIdAndUpdate(_id, update, {
      new: true,
      runValidators: true,
    }).select(SAFE_USER_SELECT);

    if (!user) {
      return sendError(res, {
        statusCode: 404,
        message: "User not found",
      });
    }

    return sendSuccess(res, {
      message: "User profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update user profile error:", error);

    return sendError(res, {
      statusCode: 500,
      message: "Internal server error",
    });
  }
};
