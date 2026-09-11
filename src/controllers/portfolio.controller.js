import mongoose from "mongoose";
import { sendError, sendSuccess } from "../utils/http.js";
import {
  createHolding,
  deleteHolding,
  getCategoryPortfolio,
  getDashboard,
  getHistory,
  updateHolding,
} from "../services/portfolio.service.js";

const bodyFor = (req) => req.validated?.body || req.body;
const queryFor = (req) => req.validated?.query || req.query;

const requestUserId = (req, res) => {
  const userId = req.user?.userId;
  if (!mongoose.isValidObjectId(userId)) {
    sendError(res, { statusCode: 400, message: "A valid authenticated user is required" });
    return null;
  }
  return userId;
};

const portfolioError = (res, error, fallbackMessage) => {
  console.error(`${fallbackMessage}:`, error);
  if (error.statusCode) return sendError(res, { statusCode: error.statusCode, message: error.message, details: error.details });
  if (error.code === 11000) return sendError(res, { statusCode: 409, message: "A matching holding already exists for this account" });
  if (error.name === "ValidationError") {
    return sendError(res, { statusCode: 400, message: "Validation failed", details: Object.values(error.errors).map((item) => item.message) });
  }
  return sendError(res, { message: fallbackMessage });
};

export const getPortfolioDashboard = async (req, res) => {
  try {
    const userId = requestUserId(req, res);
    if (!userId) return null;
    return sendSuccess(res, { message: "Portfolio dashboard fetched successfully", data: await getDashboard(userId) });
  } catch (error) {
    return portfolioError(res, error, "Failed to fetch portfolio dashboard");
  }
};

export const getPortfolioCategory = async (req, res) => {
  try {
    const userId = requestUserId(req, res);
    if (!userId) return null;
    const data = await getCategoryPortfolio(userId, req.params.categoryKey.toLowerCase());
    return sendSuccess(res, { message: "Portfolio category fetched successfully", data });
  } catch (error) {
    return portfolioError(res, error, "Failed to fetch portfolio category");
  }
};

export const addPortfolioHolding = async (req, res) => {
  try {
    const userId = requestUserId(req, res);
    if (!userId) return null;
    const data = await createHolding(userId, bodyFor(req));
    return sendSuccess(res, { statusCode: 201, message: "Portfolio holding added successfully", data });
  } catch (error) {
    return portfolioError(res, error, "Failed to add portfolio holding");
  }
};

export const updatePortfolioHolding = async (req, res) => {
  try {
    const userId = requestUserId(req, res);
    if (!userId) return null;
    const data = await updateHolding(userId, req.params.holdingId, bodyFor(req));
    return sendSuccess(res, { message: "Portfolio holding updated successfully", data });
  } catch (error) {
    return portfolioError(res, error, "Failed to update portfolio holding");
  }
};

export const removePortfolioHolding = async (req, res) => {
  try {
    const userId = requestUserId(req, res);
    if (!userId) return null;
    const data = await deleteHolding(userId, req.params.holdingId);
    return sendSuccess(res, { message: "Portfolio holding deleted successfully", data: { id: data._id } });
  } catch (error) {
    return portfolioError(res, error, "Failed to delete portfolio holding");
  }
};

export const getPortfolioHistory = async (req, res) => {
  try {
    const userId = requestUserId(req, res);
    if (!userId) return null;
    const { period } = queryFor(req);
    const data = await getHistory(userId, period);
    return sendSuccess(res, { message: "Portfolio history fetched successfully", data, period, count: data.length });
  } catch (error) {
    return portfolioError(res, error, "Failed to fetch portfolio history");
  }
};
