import {
  GLOBAL_MARKET_NEWS_QUERY,
  GLOBAL_MARKET_NEWS_REGION,
  INDIA_MARKET_NEWS_QUERY,
  INDIA_MARKET_NEWS_REGION,
  getMarketNewsData,
} from "../services/news.service.js";

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

export const getMarketNews = async (req, res) => {
  try {
    const result = await getMarketNewsData({
      query: req.query.query || req.query.search,
      region: req.query.region,
      count: req.query.count,
      lang: req.query.lang,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendNewsResponse(res, "Market news fetched successfully", result);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// Curated feeds keep their region and search intent server-controlled. This
// prevents a client query parameter from turning the India endpoint back into
// the generic (and potentially US-fallback) news feed.
export const getGlobalMarketNews = async (req, res) => {
  try {
    const result = await getMarketNewsData({
      query: GLOBAL_MARKET_NEWS_QUERY,
      region: GLOBAL_MARKET_NEWS_REGION,
      count: req.query.count,
      lang: "en-US",
      feed: "global",
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendNewsResponse(res, "Global market news fetched successfully", result);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getIndiaMarketNews = async (req, res) => {
  try {
    const result = await getMarketNewsData({
      query: INDIA_MARKET_NEWS_QUERY,
      region: INDIA_MARKET_NEWS_REGION,
      count: req.query.count,
      lang: "en-IN",
      feed: "india",
      // Do not silently substitute US articles when Yahoo has no Indian
      // result. The caller can trust that returned articles are India-scoped.
      allowRegionFallback: false,
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

export const getLiveMarketNews = async (req, res) => {
  try {
    const result = await getMarketNewsData({
      query: req.query.query || req.query.search || "stock market today",
      region: req.query.region,
      count: req.query.count,
      lang: req.query.lang,
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return sendNewsResponse(res, "Live trading news fetched successfully", result);
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

    return sendNewsResponse(
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

    return sendNewsResponse(
      res,
      "Related market news fetched successfully",
      result,
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};
