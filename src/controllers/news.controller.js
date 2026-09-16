import {
  getGlobalTradingNews,
  getIndiaTradingNews,
} from "../services/news.service.js";

const parseForceRefresh = (value) =>
  value === true || value === "true" || value === "1" || value === 1;

const sendNewsResponse = (res, message, payload) =>
  res.status(200).json({
    success: true,
    message,
    ...payload,
  });

const handleControllerError = (res, error) => {
  console.error("News Error:", error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
    ...(error.details ? { details: error.details } : {}),
  });
};

// India is the default news feed. Its scope, sources, and locale are owned by
// the service and cannot be changed with request query parameters.
export const getIndiaMarketNews = async (req, res) => {
  try {
    const result = await getIndiaTradingNews({
      count: req.query.count,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendNewsResponse(
      res,
      "India trading market news fetched successfully",
      result,
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getGlobalMarketNews = async (req, res) => {
  try {
    const result = await getGlobalTradingNews({
      count: req.query.count,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendNewsResponse(
      res,
      "Global trading market news fetched successfully",
      result,
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};
