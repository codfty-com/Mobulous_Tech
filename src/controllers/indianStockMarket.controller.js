import {
  getIndianMarketMoverData,
  getIndianMarketMoverDetail,
  getTopShareMarketData,
  searchStockSymbols,
} from "../services/marketData.service.js";

const parseForceRefresh = (value) =>
  value === true || value === "true" || value === "1" || value === 1;

const sendSearchError = (res, error) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Unable to search Indian stocks",
    ...(error.details ? { details: error.details } : {}),
  });

/**
 * Public symbol lookup used before a user adds a transaction. It deliberately
 * occupies GET /api/stocks only when `query` or `search` is supplied; the
 * same path without either parameter continues to the private portfolio list.
 */
export const searchIndianStocks = async (req, res, next) => {
  const query = req.query.query || req.query.search;

  if (!query) return next();

  try {
    const region = String(req.query.region || "IN").trim().toUpperCase();
    if (region !== "IN") {
      const error = new Error(
        "Only Indian NSE (.NS) and BSE (.BO) equity searches are supported",
      );
      error.statusCode = 400;
      throw error;
    }

    const requestedLimit = req.query.limit ?? req.query.count;
    if (requestedLimit !== undefined) {
      const limit = Number(requestedLimit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
        const error = new Error("limit must be an integer between 1 and 25");
        error.statusCode = 400;
        throw error;
      }
    }

    const result = await searchStockSymbols({
      query,
      region: "IN",
      count: requestedLimit,
      lang: req.query.lang,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return res.status(200).json({
      success: true,
      message: "Indian stocks fetched successfully",
      country: "India",
      region: "IN",
      exchanges: ["NSE", "BSE"],
      source: result.source,
      total: result.total,
      count: result.count,
      limit: result.limit,
      ...(result.warning ? { warning: result.warning } : {}),
      meta: result.meta,
      data: result.data,
    });
  } catch (error) {
    console.error("Indian stock search error:", error);
    return sendSearchError(res, error);
  }
};

export const getTopIndianStocksByPeriod = async (req, res) => {
  try {
    const period = String(req.params.period || "").trim().toLowerCase();
    const result = await getTopShareMarketData({
      period,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return res.status(200).json({
      success: true,
      message: `Top 99 Indian stocks ${period} market data fetched successfully`,
      country: "India",
      exchange: "NSE",
      period: result.meta.period,
      source: result.source,
      count: result.count,
      ...(result.warning ? { warning: result.warning } : {}),
      meta: result.meta,
      data: result.data,
    });
  } catch (error) {
    console.error("Indian stock market data error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch Indian stock market data",
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

const sendIndianMoversList = async (req, res, moverType) => {
  try {
    const result = await getIndianMarketMoverData({
      moverType,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return res.status(200).json({
      success: true,
      message: `Top 25 Indian ${result.list.label.toLowerCase()} fetched successfully`,
      country: "India",
      exchange: "NSE",
      list: result.list,
      source: result.source,
      count: result.count,
      ...(result.warning ? { warning: result.warning } : {}),
      meta: result.meta,
      data: result.data,
    });
  } catch (error) {
    console.error(`Indian ${moverType} data error:`, error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || `Unable to fetch Indian top ${moverType}`,
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

const sendIndianMoverDetail = async (req, res, moverType) => {
  try {
    const result = await getIndianMarketMoverDetail({
      moverType,
      symbol: req.params.symbol,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return res.status(200).json({
      success: true,
      message: `Indian ${moverType.slice(0, -1)} details fetched successfully`,
      country: "India",
      exchange: "NSE",
      list: result.list,
      source: result.source,
      parentSource: result.parentSource,
      ...(result.warning ? { warning: result.warning } : {}),
      data: result.data,
    });
  } catch (error) {
    console.error(`Indian ${moverType} detail error:`, error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || `Unable to fetch Indian top ${moverType} details`,
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

export const getTopIndianGainers = (req, res) =>
  sendIndianMoversList(req, res, "gainers");

export const getTopIndianGainerDetail = (req, res) =>
  sendIndianMoverDetail(req, res, "gainers");

export const getTopIndianLosers = (req, res) =>
  sendIndianMoversList(req, res, "losers");

export const getTopIndianLoserDetail = (req, res) =>
  sendIndianMoverDetail(req, res, "losers");
