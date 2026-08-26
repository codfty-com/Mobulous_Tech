import mongoose from "mongoose";
import UserMutualFund from "../models/userMutualFund.js";
import { sendError, sendSuccess } from "../utils/http.js";

const validId = (id) => mongoose.isValidObjectId(id);
const bodyFor = (req) => req.validated?.body || req.body;
const queryFor = (req) => req.validated?.query || req.query;
const getRequestUserId = (req, res) => {
  const userId = req.user?.userId;

  if (!validId(userId)) {
    sendError(res, {
      statusCode: 400,
      message: "A valid userId is required",
    });
    return null;
  }

  return userId;
};

const getHoldingId = (req, res) => {
  const { id } = req.params;

  if (!validId(id)) {
    sendError(res, {
      statusCode: 400,
      message:
        "Invalid mutual fund holding ID. Use the holding _id returned from GET /api/mutual-fund-holdings.",
    });
    return null;
  }

  return id;
};

export const addMutualFundHolding = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);

    if (!userId) return null;

    const holding = await UserMutualFund.create({
      userId,
      ...bodyFor(req),
      lastUpdated: new Date(),
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Mutual fund holding added successfully",
      data: holding,
    });
  } catch (error) {
    console.error("Add mutual fund holding error:", error);
    return sendError(res, {
      statusCode: error.name === "ValidationError" ? 400 : 500,
      message:
        error.name === "ValidationError"
          ? "Validation failed"
          : "Failed to add mutual fund holding",
    });
  }
};

export const getMutualFundHoldings = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);

    if (!userId) return null;

    const {
      page = 1,
      limit = 50,
      search,
      transactionType,
      sortOrder = "desc",
    } = queryFor(req);
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    const filter = { userId };

    if (search) filter.fundName = { $regex: escapeRegex(search), $options: "i" };
    if (transactionType) filter.transactionType = transactionType;

    const [data, total] = await Promise.all([
      UserMutualFund.find(filter)
        .sort({ createdAt: sortOrder === "asc" ? 1 : -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit),
      UserMutualFund.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      message: "Mutual fund holdings fetched successfully",
      data,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error("Get mutual fund holdings error:", error);
    return sendError(res, { message: "Failed to fetch mutual fund holdings" });
  }
};

export const getMutualFundHoldingById = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    const id = getHoldingId(req, res);

    if (!userId || !id) return null;

    const data = await UserMutualFund.findOne({ _id: id, userId });

    return data
      ? sendSuccess(res, {
          message: "Mutual fund holding fetched successfully",
          data,
        })
      : sendError(res, {
          statusCode: 404,
          message: "Mutual fund holding not found",
        });
  } catch (error) {
    console.error("Get mutual fund holding error:", error);
    return sendError(res, { message: "Failed to fetch mutual fund holding" });
  }
};

export const updateMutualFundHolding = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    const id = getHoldingId(req, res);

    if (!userId || !id) return null;

    const updateData = { ...bodyFor(req) };
    delete updateData.userId;
    updateData.lastUpdated = new Date();

    const data = await UserMutualFund.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    return data
      ? sendSuccess(res, {
          message: "Mutual fund holding updated successfully",
          data,
        })
      : sendError(res, {
          statusCode: 404,
          message: "Mutual fund holding not found",
        });
  } catch (error) {
    console.error("Update mutual fund holding error:", error);
    return sendError(res, {
      statusCode: error.name === "ValidationError" ? 400 : 500,
      message:
        error.name === "ValidationError"
          ? "Validation failed"
          : "Failed to update mutual fund holding",
    });
  }
};

export const deleteMutualFundHolding = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    const id = getHoldingId(req, res);

    if (!userId || !id) return null;

    const data = await UserMutualFund.findOneAndDelete({ _id: id, userId });

    return data
      ? sendSuccess(res, {
          message: "Mutual fund holding deleted successfully",
          data: { id: data._id, fundName: data.fundName },
        })
      : sendError(res, {
          statusCode: 404,
          message: "Mutual fund holding not found",
        });
  } catch (error) {
    console.error("Delete mutual fund holding error:", error);
    return sendError(res, { message: "Failed to delete mutual fund holding" });
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
