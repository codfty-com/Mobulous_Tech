import YahooFinance from "yahoo-finance2";
import { MARKET_SYMBOLS } from "../config/marketSymbols.js";
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
const DEFAULT_REGION_LANGUAGE = {
  US: "en-US",
  IN: "en-IN",
  GB: "en-GB",
  AU: "en-AU",
  CA: "en-CA",
  SG: "en-SG",
  DE: "de-DE",
  FR: "fr-FR",
  ES: "es-ES",
  IT: "it-IT",
  JP: "ja-JP",
  HK: "zh-HK",
};

export const DEFAULT_MARKET_NEWS_QUERY = "stock market";
export const DEFAULT_MARKET_NEWS_REGION = "US";
export const GLOBAL_MARKET_NEWS_QUERY = "global financial markets";
export const GLOBAL_MARKET_NEWS_REGION = "US";
export const INDIA_MARKET_NEWS_QUERY = "Indian stock market Nifty Sensex";
export const INDIA_MARKET_NEWS_REGION = "IN";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    return new Date(value > 1_000_000_000_000 ? value : value * 1000);
  }

  return new Date(value);
};

const normalizeRegion = (value) =>
  String(value || DEFAULT_MARKET_NEWS_REGION)
    .trim()
    .toUpperCase();

const normalizeNewsCount = (value, fallback = 10) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
};

const normalizeLang = (region, lang) =>
  String(lang || DEFAULT_REGION_LANGUAGE[region] || "en-US").trim();

const normalizeNewsQuery = (value) =>
  String(value || DEFAULT_MARKET_NEWS_QUERY).trim();

const getConfiguredSymbolLabel = (symbol) => {
  const normalizedSymbol = String(symbol || "")
    .trim()
    .toUpperCase();
  const market = Object.values(MARKET_SYMBOLS).find(
    (item) => item.symbol.toUpperCase() === normalizedSymbol,
  );

  return market?.displayName || normalizedSymbol;
};

const buildCacheKey = ({ region, listId, count, lang }) =>
  [NEWS_COLLECTION_TYPE, region, listId || "all", count, lang]
    .map((value) => String(value || "").trim())
    .join(":");

const getFreshCache = async (cacheKey) =>
  MarketCollectionSnapshot.findOne({
    cacheKey,
    cachedUntil: { $gt: new Date() },
  }).lean();

const getAnyCache = async (cacheKey) =>
  MarketCollectionSnapshot.findOne({ cacheKey }).lean();

const saveSnapshot = async ({
  cacheKey,
  listId,
  region,
  lang,
  requestedCount,
  meta,
  data,
  fetchedAt,
}) =>
  MarketCollectionSnapshot.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      collectionType: NEWS_COLLECTION_TYPE,
      listId,
      region,
      lang,
      requestedCount,
      itemCount: data.length,
      source: "yahoo-finance2",
      meta,
      data,
      lastFetchedAt: fetchedAt,
      cachedUntil: new Date(
        fetchedAt.getTime() + NEWS_CACHE_MINUTES * 60 * 1000,
      ),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

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

const normalizeNewsArticle = (article) => {
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

const fetchNewsFromYahooSearch = async ({ query, region, count, lang }) => {
  const result = await yahooFinance.search(
    query,
    { quotesCount: 0, newsCount: count, region, lang },
    { validateResult: false },
  );

  return Array.isArray(result?.news) ? result.news : [];
};

const fetchMarketNewsFromYahoo = async ({
  query,
  region,
  count,
  lang,
  allowRegionFallback = true,
}) => {
  let effectiveRegion = region;
  let effectiveLang = lang;
  let articles = await fetchNewsFromYahooSearch({
    query,
    region: effectiveRegion,
    count,
    lang: effectiveLang,
  });
  let fallbackUsed = false;

  if (
    !articles.length &&
    allowRegionFallback &&
    effectiveRegion !== DEFAULT_MARKET_NEWS_REGION
  ) {
    effectiveRegion = DEFAULT_MARKET_NEWS_REGION;
    effectiveLang = normalizeLang(effectiveRegion);
    articles = await fetchNewsFromYahooSearch({
      query,
      region: effectiveRegion,
      count,
      lang: effectiveLang,
    });
    fallbackUsed = true;
  }

  if (!articles.length) {
    throw new Error(`No market news returned for query "${query}"`);
  }

  return {
    meta: { query, requestedRegion: region, effectiveRegion, fallbackUsed },
    data: articles.map(normalizeNewsArticle),
  };
};

export const getMarketNewsData = async ({
  query,
  symbol,
  symbols = [],
  region = DEFAULT_MARKET_NEWS_REGION,
  count,
  lang,
  feed,
  allowRegionFallback = true,
  forceRefresh = false,
} = {}) => {
  const normalizedRegion = normalizeRegion(region || DEFAULT_MARKET_NEWS_REGION);
  const normalizedCount = normalizeNewsCount(count);
  const normalizedLang = normalizeLang(normalizedRegion, lang);
  const requestedSymbols = [
    ...(symbol ? [symbol] : []),
    ...(Array.isArray(symbols) ? symbols : []),
  ]
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
  const queries = requestedSymbols.length
    ? requestedSymbols.map(getConfiguredSymbolLabel)
    : [normalizeNewsQuery(query)];
  const normalizedQuery = queries.join(",");
  // Named feeds never share caches with the configurable generic endpoint.
  const cacheListId = feed ? `${feed}:${normalizedQuery}` : normalizedQuery;
  const cacheKey = buildCacheKey({
    region: normalizedRegion,
    listId: cacheListId,
    count: normalizedCount,
    lang: normalizedLang,
  });

  if (!forceRefresh) {
    const cached = await getFreshCache(cacheKey);
    if (cached) return buildResponse(cached, "cache");
  }

  try {
    const fetchedAt = new Date();
    const results = await Promise.all(
      queries.map((newsQuery) =>
        fetchMarketNewsFromYahoo({
          query: newsQuery,
          region: normalizedRegion,
          count: normalizedCount,
          lang: normalizedLang,
          allowRegionFallback,
        }),
      ),
    );
    const seen = new Set();
    const data = results
      .flatMap((result) => result.data)
      .filter((article) => {
        const key = article.uuid || article.link;
        if (!key || seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const left = a.publishedAt ? a.publishedAt.getTime() : 0;
        const right = b.publishedAt ? b.publishedAt.getTime() : 0;
        return right - left;
      })
      .slice(0, normalizedCount);
    const fallbackUsed = results.some((result) => result.meta.fallbackUsed);
    const effectiveRegions = Array.from(
      new Set(results.map((result) => result.meta.effectiveRegion)),
    );

    const snapshot = await saveSnapshot({
      cacheKey,
      listId: cacheListId,
      region: normalizedRegion,
      lang: normalizedLang,
      requestedCount: normalizedCount,
      meta: {
        query: requestedSymbols.length ? null : queries[0],
        ...(feed ? { feed } : {}),
        symbols: requestedSymbols,
        queries,
        effectiveRegions,
        fallbackUsed,
      },
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
        "Live provider request failed, returning last cached market news instead",
      );
    }

    error.statusCode = 502;
    throw error;
  }
};
