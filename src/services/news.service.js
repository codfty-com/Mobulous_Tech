import YahooFinance from "yahoo-finance2";
import MarketCollectionSnapshot from "../models/marketCollectionSnapshot.js";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  validation: {
    logErrors: false,
    logOptionsErrors: false,
    allowAdditionalProps: true,
  },
  versionCheck: false,
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    dir: () => {},
  },
});

const NEWS_CACHE_MINUTES = Number(
  process.env.MARKET_COLLECTION_CACHE_DURATION_MINUTES ||
    process.env.MARKET_CACHE_DURATION_MINUTES ||
    2,
);
const NEWS_COLLECTION_TYPE = "market_news";
const NEWS_LANGUAGE = "en-US";

const INDIA_MARKET_TICKERS = new Set(["^NSEI", "^BSESN"]);
const GLOBAL_MARKET_TICKERS = new Set([
  "^GSPC",
  "^DJI",
  "^IXIC",
  "^FTSE",
  "^N225",
  "^HSI",
  "^STOXX",
  "^SSEC",
  "^KS11",
]);

const hasRelatedTicker = (article, tickers) =>
  Array.isArray(article.relatedTickers) &&
  article.relatedTickers.some((ticker) =>
    tickers.has(String(ticker || "").trim().toUpperCase()),
  );

const isIndiaTradingArticle = (article) => {
  const title = String(article.title || "").toLowerCase();
  const hasIndianInstrument = Array.isArray(article.relatedTickers)
    ? article.relatedTickers.some((ticker) =>
        /\.(ns|bo)$/i.test(String(ticker || "").trim()),
      )
    : false;

  return (
    hasRelatedTicker(article, INDIA_MARKET_TICKERS) ||
    hasIndianInstrument ||
    /\b(india|indian|nifty|sensex|nse|bse)\b/.test(title)
  );
};

const NEWS_FEEDS = {
  india: {
    id: "india-trading-v1",
    region: "IN",
    // Yahoo currently exposes NIFTY/SENSEX news through this locale.
    providerRegion: "US",
    scope: "india-trading",
    queries: ["^NSEI", "^BSESN"],
    filter: isIndiaTradingArticle,
    balanceSources: false,
  },
  global: {
    id: "global-trading-v1",
    region: "GLOBAL",
    providerRegion: "US",
    scope: "global-trading",
    queries: ["^GSPC", "^FTSE", "^N225", "^HSI"],
    filter: (article) => hasRelatedTicker(article, GLOBAL_MARKET_TICKERS),
    balanceSources: true,
  },
};

const normalizeCount = (value, fallback = 10) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    return new Date(value > 1_000_000_000_000 ? value : value * 1000);
  }

  return new Date(value);
};

const normalizeArticle = (article) => {
  const thumbnail =
    article.thumbnail?.resolutions?.find((item) => item.tag === "140x140") ||
    article.thumbnail?.resolutions?.[0] ||
    null;

  return {
    uuid: article.uuid || null,
    title: article.title || null,
    publisher: article.publisher || null,
    link: article.link || null,
    publishedAt: toDate(article.providerPublishTime),
    type: article.type || null,
    thumbnail,
    relatedTickers: Array.isArray(article.relatedTickers)
      ? article.relatedTickers
      : [],
  };
};

const buildCacheKey = (feed, count) =>
  [NEWS_COLLECTION_TYPE, feed.region, feed.id, count, NEWS_LANGUAGE].join(":");

const getFreshCache = async (cacheKey) =>
  MarketCollectionSnapshot.findOne({
    cacheKey,
    cachedUntil: { $gt: new Date() },
  }).lean();

const getAnyCache = async (cacheKey) =>
  MarketCollectionSnapshot.findOne({ cacheKey }).lean();

const buildResponse = (collection, source, warning) => ({
  source,
  region: collection.region,
  lang: collection.lang,
  requestedCount: collection.requestedCount,
  count: Array.isArray(collection.data) ? collection.data.length : 0,
  ...(warning ? { warning } : {}),
  meta: collection.meta || {},
  data: collection.data || [],
});

const saveSnapshot = async ({ cacheKey, feed, count, data, fetchedAt }) =>
  MarketCollectionSnapshot.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      collectionType: NEWS_COLLECTION_TYPE,
      listId: feed.id,
      region: feed.region,
      lang: NEWS_LANGUAGE,
      requestedCount: count,
      itemCount: data.length,
      source: "yahoo-finance2",
      meta: {
        feed: feed.id,
        scope: feed.scope,
        providerRegion: feed.providerRegion,
        queries: feed.queries,
        fallbackUsed: false,
      },
      data,
      lastFetchedAt: fetchedAt,
      cachedUntil: new Date(
        fetchedAt.getTime() + NEWS_CACHE_MINUTES * 60 * 1000,
      ),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

const fetchFeedArticles = async (feed, count) =>
  Promise.all(
    feed.queries.map(async (query) => {
      const result = await yahooFinance.search(
        query,
        {
          quotesCount: 0,
          newsCount: count,
          region: feed.providerRegion,
          lang: NEWS_LANGUAGE,
        },
        { validateResult: false },
      );

      return (Array.isArray(result?.news) ? result.news : [])
        .map(normalizeArticle)
        .filter(feed.filter)
        .sort(sortByPublishedAt);
    }),
  );

const sortByPublishedAt = (left, right) => {
  const leftTime = left.publishedAt ? left.publishedAt.getTime() : 0;
  const rightTime = right.publishedAt ? right.publishedAt.getTime() : 0;

  return rightTime - leftTime;
};

const addUniqueArticle = (articles, seen, article) => {
  const key = article.uuid || article.link;
  if (!key || seen.has(key)) return false;

  seen.add(key);
  articles.push(article);
  return true;
};

const selectArticles = (articlesBySource, count, balanceSources) => {
  const data = [];
  const seen = new Set();

  if (!balanceSources) {
    articlesBySource
      .flat()
      .sort(sortByPublishedAt)
      .some((article) => {
        addUniqueArticle(data, seen, article);
        return data.length === count;
      });

    return data;
  }

  while (data.length < count && articlesBySource.some((articles) => articles.length)) {
    for (const articles of articlesBySource) {
      while (articles.length && data.length < count) {
        if (addUniqueArticle(data, seen, articles.shift())) break;
      }
    }
  }

  return data;
};

const getNewsFeedData = async ({ feedName, count, forceRefresh = false }) => {
  const feed = NEWS_FEEDS[feedName];
  const normalizedCount = normalizeCount(count);
  const cacheKey = buildCacheKey(feed, normalizedCount);

  if (!forceRefresh) {
    const cached = await getFreshCache(cacheKey);
    if (cached) return buildResponse(cached, "cache");
  }

  try {
    const fetchedAt = new Date();
    const articlesBySource = await fetchFeedArticles(feed, normalizedCount);
    const data = selectArticles(
      articlesBySource,
      normalizedCount,
      feed.balanceSources,
    );

    if (!data.length) {
      throw new Error("No matching market news was returned by the provider");
    }

    const snapshot = await saveSnapshot({
      cacheKey,
      feed,
      count: normalizedCount,
      data,
      fetchedAt,
    });

    return buildResponse(snapshot.toObject(), "provider");
  } catch (error) {
    const fallbackCache = await getAnyCache(cacheKey);
    if (fallbackCache) {
      return buildResponse(
        fallbackCache,
        "stale-cache",
        "Live provider request failed, returning last cached news instead",
      );
    }

    error.statusCode = 502;
    throw error;
  }
};

export const getIndiaTradingNews = (options = {}) =>
  getNewsFeedData({ feedName: "india", ...options });

export const getGlobalTradingNews = (options = {}) =>
  getNewsFeedData({ feedName: "global", ...options });
