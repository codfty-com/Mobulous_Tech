import { DEFAULT_MUTUAL_FUND_SCHEME_CODES } from "../config/mutualFundSchemes.js";
import {
  getMutualFundHistory,
  getMutualFundSnapshot,
  getMutualFundSnapshots,
  searchMutualFundSchemes,
} from "../services/mutualFundData.service.js";

const parseSchemeCodes = (value) => {
  if (!value) return DEFAULT_MUTUAL_FUND_SCHEME_CODES;

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

const sendMutualFundResponse = (res, message, payload) =>
  res.status(200).json({
    success: true,
    message,
    ...payload,
  });

const handleControllerError = (res, error) => {
  console.error("Mutual Fund Data Error:", error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
    ...(error.details ? { details: error.details } : {}),
  });
};

export const searchMutualFunds = async (req, res) => {
  try {
    const result = await searchMutualFundSchemes({
      query: req.query.query || req.query.search,
      limit: req.query.limit,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendMutualFundResponse(
      res,
      "Mutual fund schemes fetched successfully",
      {
        source: result.source,
        query: result.query,
        total: result.total,
        count: result.count,
        limit: result.limit,
        ...(result.meta ? { meta: result.meta } : {}),
        ...(result.warning ? { warning: result.warning } : {}),
        data: result.data,
      },
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getAllMutualFundData = async (req, res) => {
  try {
    const schemeCodes = parseSchemeCodes(req.query.schemeCodes);
    const forceRefresh = parseForceRefresh(req.query.forceRefresh);

    const result = await getMutualFundSnapshots({
      schemeCodes,
      forceRefresh,
    });

    return sendMutualFundResponse(res, "Mutual fund data fetched successfully", {
      source: result.source,
      invalidSchemeCodes: result.invalidSchemeCodes,
      notFoundSchemeCodes: result.notFoundSchemeCodes,
      count: result.data.length,
      ...(result.warning ? { warning: result.warning } : {}),
      data: result.data,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMutualFundDataBySchemeCode = async (req, res) => {
  try {
    const forceRefresh = parseForceRefresh(req.query.forceRefresh);
    const result = await getMutualFundSnapshot({
      schemeCode: req.params.schemeCode,
      forceRefresh,
    });

    if (!result.data) {
      return res.status(404).json({
        success: false,
        message: "Mutual fund data not found",
      });
    }

    return sendMutualFundResponse(res, "Mutual fund data fetched successfully", {
      source: result.source,
      ...(result.warning ? { warning: result.warning } : {}),
      data: result.data,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMutualFundHistoryBySchemeCode = async (req, res) => {
  try {
    const forceRefresh = parseForceRefresh(req.query.forceRefresh);
    const result = await getMutualFundHistory({
      schemeCode: req.params.schemeCode,
      limit: req.query.limit,
      forceRefresh,
    });

    if (!result.data) {
      return res.status(404).json({
        success: false,
        message: "Mutual fund history not found",
      });
    }

    return sendMutualFundResponse(
      res,
      "Mutual fund history fetched successfully",
      {
        source: result.source,
        ...(result.warning ? { warning: result.warning } : {}),
        data: result.data,
      },
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const refreshMutualFundData = async (req, res) => {
  try {
    const schemeCodes = parseSchemeCodes(
      req.body?.schemeCodes || req.body?.schemeCode || req.query.schemeCodes,
    );
    const result = await getMutualFundSnapshots({
      schemeCodes,
      forceRefresh: true,
    });

    return sendMutualFundResponse(
      res,
      "Mutual fund data refreshed successfully",
      {
        source: result.source,
        invalidSchemeCodes: result.invalidSchemeCodes,
        notFoundSchemeCodes: result.notFoundSchemeCodes,
        count: result.data.length,
        ...(result.warning ? { warning: result.warning } : {}),
        data: result.data,
      },
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};
