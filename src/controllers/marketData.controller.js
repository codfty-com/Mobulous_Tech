import { DEFAULT_MARKET_KEYS } from "../config/marketSymbols.js";
import {
  getMarketSnapshots,
  getSingleMarketSnapshot,
  getSupportedMarkets,
} from "../services/marketData.service.js";

const parseKeys = (value) => {
  if (!value) return DEFAULT_MARKET_KEYS;

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => item.split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseForceRefresh = (value) =>
  value === true || value === "true" || value === "1" || value === 1;

const sendMarketResponse = (res, message, payload) =>
  res.status(200).json({
    success: true,
    message,
    ...payload,
  });

const handleControllerError = (res, error) => {
  console.error("Market Data Error:", error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
    ...(error.details ? { details: error.details } : {}),
  });
};

export const getAvailableMarkets = async (req, res) => {
  try {
    return sendMarketResponse(res, "Supported markets fetched successfully", {
      data: getSupportedMarkets(),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getAllMarketData = async (req, res) => {
  try {
    const keys = parseKeys(req.query.keys);
    const forceRefresh = parseForceRefresh(req.query.forceRefresh);

    const result = await getMarketSnapshots({ keys, forceRefresh });

    return sendMarketResponse(res, "Market data fetched successfully", {
      source: result.source,
      invalidKeys: result.invalidKeys,
      count: result.data.length,
      ...(result.warning ? { warning: result.warning } : {}),
      data: result.data,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMarketDataByKey = async (req, res) => {
  try {
    const forceRefresh = parseForceRefresh(req.query.forceRefresh);

    const result = await getSingleMarketSnapshot({
      key: req.params.marketKey,
      forceRefresh,
    });

    if (!result.data) {
      return res.status(404).json({
        success: false,
        message: "Market data not found",
      });
    }

    return sendMarketResponse(res, "Market data fetched successfully", {
      source: result.source,
      invalidKeys: result.invalidKeys,
      ...(result.warning ? { warning: result.warning } : {}),
      data: result.data,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const refreshMarketData = async (req, res) => {
  try {
    const keys = parseKeys(req.body?.keys || req.query.keys);

    const result = await getMarketSnapshots({
      keys,
      forceRefresh: true,
    });

    return sendMarketResponse(res, "Market data refreshed successfully", {
      source: result.source,
      invalidKeys: result.invalidKeys,
      count: result.data.length,
      ...(result.warning ? { warning: result.warning } : {}),
      data: result.data,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};
