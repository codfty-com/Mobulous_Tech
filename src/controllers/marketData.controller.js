import { DEFAULT_MARKET_KEYS } from "../config/marketSymbols.js";
import {
  getMarketMoverData,
  getMarketHomeData,
  getMarketNewsData,
  getMarketOverview,
  getMarketSnapshots,
  getSingleMarketSnapshot,
  getSupportedMarketCollections,
  getSupportedMarkets,
  getTopShareMarketData,
  getTrendingMarketSymbols,
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

const parseList = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseForceRefresh = (value) =>
  value === true || value === "true" || value === "1" || value === 1;

const parseCount = (value, fallback = 10) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return parsed;
};

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

export const getAvailableMarketCollections = async (req, res) => {
  try {
    return sendMarketResponse(
      res,
      "Supported market trend lists fetched successfully",
      {
        data: getSupportedMarketCollections(),
      },
    );
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

export const getTrendingSymbols = async (req, res) => {
  try {
    const result = await getTrendingMarketSymbols({
      region: req.query.region,
      count: parseCount(req.query.count),
      lang: req.query.lang,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendMarketResponse(
      res,
      "Trending market symbols fetched successfully",
      result,
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMarketMovers = async (req, res) => {
  try {
    const result = await getMarketMoverData({
      listId: req.query.list || req.query.listId,
      region: req.query.region,
      count: parseCount(req.query.count),
      lang: req.query.lang,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendMarketResponse(
      res,
      "Market movers fetched successfully",
      result,
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getTopShareMarkets = async (req, res) => {
  try {
    const result = await getTopShareMarketData({
      period: req.params.period || req.query.period || req.query.type,
      count: req.query.count,
      symbols: parseList(req.query.symbols || req.query.symbol || req.query.ticker),
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendMarketResponse(
      res,
      "Top share market data fetched successfully",
      result,
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMarketDataOverview = async (req, res) => {
  try {
    const result = await getMarketOverview({
      region: req.query.region,
      count: parseCount(req.query.count),
      lang: req.query.lang,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendMarketResponse(
      res,
      "Market overview fetched successfully",
      result,
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMarketHome = async (req, res) => {
  try {
    const result = await getMarketHomeData({
      region: req.query.region,
      count: parseCount(req.query.count, 20),
      topShareCount: req.query.topShareCount || req.query.nifty100Count,
      topSharePeriod: req.query.topSharePeriod || req.query.period,
      lang: req.query.lang,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendMarketResponse(res, "Market home data fetched successfully", result);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMarketNews = async (req, res) => {
  try {
    const result = await getMarketNewsData({
      query: req.query.query || req.query.search,
      region: req.query.region,
      count: req.query.count,
      lang: req.query.lang,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendMarketResponse(res, "Market news fetched successfully", result);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getLiveMarketNews = async (req, res) => {
  try {
    const result = await getMarketNewsData({
      query: req.query.query || req.query.search || "stock market today",
      region: req.query.region,
      count: req.query.count,
      lang: req.query.lang,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendMarketResponse(res, "Live trading news fetched successfully", result);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMarketNewsBySymbol = async (req, res) => {
  try {
    const result = await getMarketNewsData({
      symbol: req.params.symbol,
      region: req.query.region,
      count: req.query.count,
      lang: req.query.lang,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendMarketResponse(
      res,
      "Market news by symbol fetched successfully",
      result,
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getRelatedMarketNews = async (req, res) => {
  try {
    const result = await getMarketNewsData({
      symbols: parseList(req.query.symbols || req.query.symbol || req.query.ticker),
      query: req.query.query || req.query.search,
      region: req.query.region,
      count: req.query.count,
      lang: req.query.lang,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendMarketResponse(
      res,
      "Related market news fetched successfully",
      result,
    );
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
