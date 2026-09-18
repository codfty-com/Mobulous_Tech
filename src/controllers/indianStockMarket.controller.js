import {
  getIndianMarketMoverData,
  getIndianMarketMoverDetail,
  getTopShareMarketData,
} from "../services/marketData.service.js";

const parseForceRefresh = (value) =>
  value === true || value === "true" || value === "1" || value === 1;

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
