import mongoose from "mongoose";
import UserMutualFund from "../models/userMutualFund.js";
import { sendError, sendSuccess } from "../utils/http.js";

const validId = (id) => mongoose.isValidObjectId(id);
const bodyFor = (req) => req.validated?.body || req.body;

export const addMutualFundHolding = async (req, res) => {
  try {
    const holding = await UserMutualFund.create({ userId: req.user.userId, ...bodyFor(req), lastUpdated: new Date() });
    return sendSuccess(res, { statusCode: 201, message: "Mutual fund holding added successfully", data: holding });
  } catch (error) {
    console.error("Add mutual fund holding error:", error);
    return sendError(res, { statusCode: error.name === "ValidationError" ? 400 : 500, message: error.name === "ValidationError" ? "Validation failed" : "Failed to add mutual fund holding" });
  }
};

export const getMutualFundHoldings = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, sortOrder = "desc" } = req.validated?.query || req.query;
    const filter = { userId: req.user.userId };
    if (search) filter.fundName = { $regex: escapeRegex(search), $options: "i" };
    const [data, total] = await Promise.all([
      UserMutualFund.find(filter).sort({ createdAt: sortOrder === "asc" ? 1 : -1 }).skip((page - 1) * limit).limit(limit),
      UserMutualFund.countDocuments(filter),
    ]);
    return sendSuccess(res, { message: "Mutual fund holdings fetched successfully", data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Get mutual fund holdings error:", error);
    return sendError(res, { message: "Failed to fetch mutual fund holdings" });
  }
};

export const getMutualFundHoldingById = async (req, res) => {
  if (!validId(req.params.id)) return sendError(res, { statusCode: 400, message: "Invalid mutual fund holding ID" });
  try {
    const data = await UserMutualFund.findOne({ _id: req.params.id, userId: req.user.userId });
    return data ? sendSuccess(res, { message: "Mutual fund holding fetched successfully", data }) : sendError(res, { statusCode: 404, message: "Mutual fund holding not found" });
  } catch (error) {
    console.error("Get mutual fund holding error:", error);
    return sendError(res, { message: "Failed to fetch mutual fund holding" });
  }
};

export const updateMutualFundHolding = async (req, res) => {
  if (!validId(req.params.id)) return sendError(res, { statusCode: 400, message: "Invalid mutual fund holding ID" });
  try {
    const data = await UserMutualFund.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, { $set: { ...bodyFor(req), lastUpdated: new Date() } }, { new: true, runValidators: true });
    return data ? sendSuccess(res, { message: "Mutual fund holding updated successfully", data }) : sendError(res, { statusCode: 404, message: "Mutual fund holding not found" });
  } catch (error) {
    console.error("Update mutual fund holding error:", error);
    return sendError(res, { statusCode: error.name === "ValidationError" ? 400 : 500, message: error.name === "ValidationError" ? "Validation failed" : "Failed to update mutual fund holding" });
  }
};

export const deleteMutualFundHolding = async (req, res) => {
  if (!validId(req.params.id)) return sendError(res, { statusCode: 400, message: "Invalid mutual fund holding ID" });
  try {
    const data = await UserMutualFund.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    return data ? sendSuccess(res, { message: "Mutual fund holding deleted successfully", data: { id: data._id, fundName: data.fundName } }) : sendError(res, { statusCode: 404, message: "Mutual fund holding not found" });
  } catch (error) {
    console.error("Delete mutual fund holding error:", error);
    return sendError(res, { message: "Failed to delete mutual fund holding" });
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
