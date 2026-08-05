import axios from "axios";
import YahooFinance from "yahoo-finance2";
import {
  DEFAULT_MARKET_KEYS,
  MARKET_SYMBOLS,
  TOP_SHARE_MARKET_SYMBOLS,
} from "../config/marketSymbols.js";
import MarketCollectionSnapshot from "../models/marketCollectionSnapshot.js";
import MarketSnapshot from "../models/marketSnapshot.js";

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

const CACHE_MINUTES = Number(process.env.MARKET_CACHE_DURATION_MINUTES || 2);
const MARKET_COLLECTION_CACHE_MINUTES = Number(
  process.env.MARKET_COLLECTION_CACHE_DURATION_MINUTES ||
    process.env.MARKET_CACHE_DURATION_MINUTES ||
    2,
);

export const DEFAULT_MARKET_REGION = "US";
export const DEFAULT_MARKET_COLLECTION_COUNT = 10;
export const HOME_MARKET_INDEX_KEYS = [
  "nifty",
  "sensex",
  "banknifty",
  "nasdaq",
];
export const MARKET_COLLECTION_TYPES = {
  trending: "trending_symbols",
  movers: "market_movers",
  topShares: "top_share_markets",
  news: "market_news",
};
export const DEFAULT_MARKET_NEWS_QUERY = "stock market";
export const DEFAULT_MARKET_NEWS_REGION = "US";
export const TOP_SHARE_MARKET_PERIODS = {
  daily: {
    id: "daily",
    label: "Daily",
    range: "1d",
    interval: "5m",
  },
  weekly: {
    id: "weekly",
    label: "Weekly",
    range: "5d",
    interval: "1d",
  },
  monthly: {
    id: "monthly",
    label: "Monthly",
    range: "1mo",
    interval: "1d",
  },
};
export const MARKET_MOVER_LISTS = {
  most_actives: {
    id: "most_actives",
    label: "Most Active",
    description: "Popular high-volume instruments from Yahoo's saved screener.",
  },
  day_gainers: {
    id: "day_gainers",
    label: "Top Gainers",
    description: "Best-performing instruments for the current trading day.",
  },
  day_losers: {
    id: "day_losers",
    label: "Top Losers",
    description: "Worst-performing instruments for the current trading day.",
  },
};

const QUOTE_FIELDS = [
  "symbol",
  "shortName",
  "longName",
  "currency",
  "exchange",
  "fullExchangeName",
  "marketState",
  "regularMarketPrice",
  "regularMarketChange",
  "regularMarketChangePercent",
  "regularMarketOpen",
  "regularMarketDayHigh",
  "regularMarketDayLow",
  "regularMarketPreviousClose",
  "regularMarketVolume",
  "regularMarketTime",
  "fiftyTwoWeekHigh",
  "fiftyTwoWeekLow",
];

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

const toDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value === "number") {
    const timestamp = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(timestamp);
  }

  return new Date(value);
};

const toNumberOrNull = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeRegion = (value) =>
  String(value || DEFAULT_MARKET_REGION).trim().toUpperCase();

const normalizeCount = (value, fallback = DEFAULT_MARKET_COLLECTION_COUNT) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(Math.max(Math.trunc(parsed), 1), 25);
};

const normalizeNewsCount = (value, fallback = 10) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
};

const normalizeTopShareCount = (value, fallback = TOP_SHARE_MARKET_SYMBOLS.length) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(
    Math.max(Math.trunc(parsed), 1),
    TOP_SHARE_MARKET_SYMBOLS.length,
  );
};

const normalizeTopShareSymbols = (symbols = []) => {
  const supportedSymbols = new Set(TOP_SHARE_MARKET_SYMBOLS);
  const invalidSymbols = [];
  const selectedSymbols = [];

  for (const rawSymbol of symbols) {
    const symbol = String(rawSymbol || "").trim().toUpperCase();

    if (!symbol) continue;

    if (!supportedSymbols.has(symbol)) {
      invalidSymbols.push(symbol);
      continue;
    }

    if (!selectedSymbols.includes(symbol)) {
      selectedSymbols.push(symbol);
    }
  }

  return { selectedSymbols, invalidSymbols };
};

const normalizeLang = (region, lang) =>
  String(lang || DEFAULT_REGION_LANGUAGE[region] || "en-US").trim();

const normalizeNewsQuery = (value) =>
  String(value || DEFAULT_MARKET_NEWS_QUERY).trim();

const getConfiguredSymbolLabel = (symbol) => {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const market = Object.values(MARKET_SYMBOLS).find(
    (item) => item.symbol.toUpperCase() === normalizedSymbol,
  );

  return market?.displayName || normalizedSymbol;
};

const normalizeQuote = (marketConfig, quote, fetchedAt) => ({
  key: marketConfig.key,
  symbol: marketConfig.symbol,
  displayName:
    quote.longName || quote.shortName || marketConfig.displayName || marketConfig.key,
  type: marketConfig.type,
  exchange: quote.fullExchangeName || quote.exchange || marketConfig.exchange,
  currency: quote.currency || null,
  country: marketConfig.country,
  marketState: quote.marketState || "UNKNOWN",
  price: toNumberOrNull(quote.regularMarketPrice),
  change: toNumberOrNull(quote.regularMarketChange),
  changePercent: toNumberOrNull(quote.regularMarketChangePercent),
  open: toNumberOrNull(quote.regularMarketOpen),
  dayHigh: toNumberOrNull(quote.regularMarketDayHigh),
  dayLow: toNumberOrNull(quote.regularMarketDayLow),
  previousClose: toNumberOrNull(quote.regularMarketPreviousClose),
  volume: toNumberOrNull(quote.regularMarketVolume),
  fiftyTwoWeekHigh: toNumberOrNull(quote.fiftyTwoWeekHigh),
  fiftyTwoWeekLow: toNumberOrNull(quote.fiftyTwoWeekLow),
  marketTime: toDate(quote.regularMarketTime),
  source: "yahoo-finance2",
  lastFetchedAt: fetchedAt,
  cachedUntil: new Date(fetchedAt.getTime() + CACHE_MINUTES * 60 * 1000),
});

const normalizeMarketInstrument = ({
  symbol,
  displayName,
  shortName,
  longName,
  type,
  exchange,
  fullExchangeName,
  currency,
  marketState,
  price,
  change,
  changePercent,
  open,
  dayHigh,
  dayLow,
  previousClose,
  volume,
  marketTime,
  fiftyTwoWeekHigh,
  fiftyTwoWeekLow,
  region,
  rank,
  trendType,
}) => ({
  symbol: symbol || null,
  displayName: displayName || longName || shortName || symbol || null,
  shortName: shortName || null,
  longName: longName || null,
  type: type || null,
  exchange: fullExchangeName || exchange || null,
  currency: currency || null,
  region: region || null,
  marketState: marketState || "UNKNOWN",
  price: toNumberOrNull(price),
  change: toNumberOrNull(change),
  changePercent: toNumberOrNull(changePercent),
  open: toNumberOrNull(open),
  dayHigh: toNumberOrNull(dayHigh),
  dayLow: toNumberOrNull(dayLow),
  previousClose: toNumberOrNull(previousClose),
  volume: toNumberOrNull(volume),
  marketTime: toDate(marketTime),
  fiftyTwoWeekHigh: toNumberOrNull(fiftyTwoWeekHigh),
  fiftyTwoWeekLow: toNumberOrNull(fiftyTwoWeekLow),
  rank: toNumberOrNull(rank),
  trendType: trendType || null,
});

const normalizeTrendingItem = ({ symbol, quote, rank, region }) =>
  normalizeMarketInstrument({
    symbol,
    displayName: quote?.displayName,
    shortName: quote?.shortName,
    longName: quote?.longName,
    type: quote?.quoteType,
    exchange: quote?.exchange,
    fullExchangeName: quote?.fullExchangeName,
    currency: quote?.currency,
    marketState: quote?.marketState,
    price: quote?.regularMarketPrice,
    change: quote?.regularMarketChange,
    changePercent: quote?.regularMarketChangePercent,
    open: quote?.regularMarketOpen,
    dayHigh: quote?.regularMarketDayHigh,
    dayLow: quote?.regularMarketDayLow,
    previousClose: quote?.regularMarketPreviousClose,
    volume: quote?.regularMarketVolume,
    marketTime: quote?.regularMarketTime,
    fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: quote?.fiftyTwoWeekLow,
    rank,
    region,
    trendType: MARKET_COLLECTION_TYPES.trending,
  });

const normalizeScreenerItem = ({ quote, rank, region, listId }) =>
  normalizeMarketInstrument({
    symbol: quote?.symbol,
    displayName: quote?.displayName,
    shortName: quote?.shortName,
    longName: quote?.longName,
    type: quote?.quoteType || quote?.typeDisp,
    exchange: quote?.exchange,
    fullExchangeName: quote?.fullExchangeName,
    currency: quote?.currency || quote?.financialCurrency,
    marketState: quote?.marketState,
    price: quote?.regularMarketPrice,
    change: quote?.regularMarketChange,
    changePercent: quote?.regularMarketChangePercent,
    open: quote?.regularMarketOpen,
    dayHigh: quote?.regularMarketDayHigh,
    dayLow: quote?.regularMarketDayLow,
    previousClose: quote?.regularMarketPreviousClose,
    volume: quote?.regularMarketVolume,
    marketTime: quote?.regularMarketTime,
    fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: quote?.fiftyTwoWeekLow,
    rank,
    region: quote?.region || region,
    trendType: listId,
  });

const getValidMarketConfigs = (keys = DEFAULT_MARKET_KEYS) => {
  const invalidKeys = [];
  const markets = [];

  for (const rawKey of keys) {
    const key = rawKey?.trim().toLowerCase();
    const config = MARKET_SYMBOLS[key];

    if (!config) {
      invalidKeys.push(rawKey);
      continue;
    }

    markets.push(config);
  }

  return { markets, invalidKeys };
};

const fetchQuotesFromYahoo = async (markets) => {
  const symbols = markets.map((market) => market.symbol);
  return yahooFinance.quote(symbols, {
    fields: QUOTE_FIELDS,
    return: "object",
  });
};

const fetchQuotesBySymbols = async (symbols) => {
  if (!symbols.length) return {};

  return yahooFinance.quote(symbols, {
    fields: QUOTE_FIELDS,
    return: "object",
  });
};

const saveSnapshots = async (snapshots) => {
  if (!snapshots.length) return;

  await Promise.all(
    snapshots.map((snapshot) =>
      MarketSnapshot.findOneAndUpdate(
        { key: snapshot.key },
        snapshot,
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
        },
      ),
    ),
  );
};

const sortSnapshots = (snapshots, keys) =>
  keys
    .map((key) => snapshots.find((snapshot) => snapshot.key === key))
    .filter(Boolean);

const getFreshCache = async (keys) => {
  const now = new Date();

  return MarketSnapshot.find({
    key: { $in: keys },
    cachedUntil: { $gt: now },
  }).lean();
};

const getAnyCache = async (keys) =>
  MarketSnapshot.find({
    key: { $in: keys },
  }).lean();

const buildCollectionCacheKey = ({ collectionType, region, listId, count, lang }) =>
  [collectionType, region, listId || "all", count, lang]
    .map((value) => String(value || "").trim())
    .join(":");

const buildTopSharesCacheKey = ({ period, count, symbols }) =>
  [
    MARKET_COLLECTION_TYPES.topShares,
    period,
    count,
    symbols?.length ? symbols.join(",") : "top-list",
  ].join(":");

const getFreshCollectionCache = async (cacheKey) => {
  const now = new Date();

  return MarketCollectionSnapshot.findOne({
    cacheKey,
    cachedUntil: { $gt: now },
  }).lean();
};

const getAnyCollectionCache = async (cacheKey) =>
  MarketCollectionSnapshot.findOne({
    cacheKey,
  }).lean();

const saveCollectionSnapshot = async ({
  cacheKey,
  collectionType,
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
      collectionType,
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
        fetchedAt.getTime() + MARKET_COLLECTION_CACHE_MINUTES * 60 * 1000,
      ),
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    },
  );

const buildCollectionResponse = (collection, source, warning) => ({
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
    {
      quotesCount: 0,
      newsCount: count,
      region,
      lang,
    },
    { validateResult: false },
  );

  return Array.isArray(result?.news) ? result.news : [];
};

const fetchMarketNewsFromYahoo = async ({ query, region, count, lang }) => {
  let effectiveRegion = region;
  let effectiveLang = lang;
  let articles = await fetchNewsFromYahooSearch({
    query,
    region: effectiveRegion,
    count,
    lang: effectiveLang,
  });
  let fallbackUsed = false;

  if (!articles.length && effectiveRegion !== DEFAULT_MARKET_NEWS_REGION) {
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
    meta: {
      query,
      requestedRegion: region,
      effectiveRegion,
      fallbackUsed,
    },
    data: articles.map(normalizeNewsArticle),
  };
};

const fetchTrendingSymbolsFromYahoo = async ({ region, count, lang }) => {
  const response = await axios.get(
    `https://query2.finance.yahoo.com/v1/finance/trending/${encodeURIComponent(region)}`,
    {
      params: {
        count,
        region,
        lang,
      },
      timeout: 12000,
    },
  );
  const result = response.data?.finance?.result?.[0];

  if (!result?.quotes?.length) {
    throw new Error(`No trending symbols returned for region ${region}`);
  }

  const symbols = result.quotes
    .map((item) => item?.symbol)
    .filter(Boolean);

  let quoteMap = {};

  if (symbols.length) {
    try {
      quoteMap = await fetchQuotesBySymbols(symbols);
    } catch (error) {
      console.warn("Trending quote enrichment failed:", error.message);
    }
  }

  return {
    meta: {
      providerCount: toNumberOrNull(result.count),
      jobTimestamp: toDate(result.jobTimestamp),
      startInterval: toDate(result.startInterval),
      count,
      lang,
    },
    data: symbols.map((symbol, index) =>
      normalizeTrendingItem({
        symbol,
        quote: quoteMap[symbol],
        rank: index + 1,
        region,
      }),
    ),
  };
};

const fetchScreenerFromYahoo = async ({ listId, region, count, lang }) => {
  const result = await yahooFinance.screener(
    {
      scrIds: listId,
      count,
      region,
      lang,
    },
    undefined,
    { validateResult: false },
  );

  return {
    meta: {
      id: result.id,
      title: result.title,
      description: result.description,
      canonicalName: result.canonicalName,
      start: toNumberOrNull(result.start),
      count: toNumberOrNull(result.count),
      total: toNumberOrNull(result.total),
      lastUpdated: toDate(result.lastUpdated),
      creationDate: toDate(result.creationDate),
      isPremium: Boolean(result.isPremium),
    },
    data: (result.quotes || []).map((quote, index) =>
      normalizeScreenerItem({
        quote,
        rank: index + 1,
        region,
        listId,
      }),
    ),
  };
};

const buildYahooChartUrl = (symbol) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;

const normalizeChartPoints = ({ timestamps = [], quote = {}, adjustedClose = [] }) =>
  timestamps.map((timestamp, index) => ({
    time: toDate(timestamp),
    open: toNumberOrNull(quote.open?.[index]),
    high: toNumberOrNull(quote.high?.[index]),
    low: toNumberOrNull(quote.low?.[index]),
    close: toNumberOrNull(quote.close?.[index]),
    volume: toNumberOrNull(quote.volume?.[index]),
    adjustedClose: toNumberOrNull(adjustedClose[index]),
  }));

const normalizeChartResult = ({ symbol, rank, period, chartResult }) => {
  const quote = chartResult.indicators?.quote?.[0] || {};
  const adjustedClose =
    chartResult.indicators?.adjclose?.[0]?.adjclose || [];
  const points = normalizeChartPoints({
    timestamps: chartResult.timestamp || [],
    quote,
    adjustedClose,
  });
  const latestPoint = [...points]
    .reverse()
    .find((point) => point.close !== null) || null;

  return {
    rank,
    symbol,
    status: "ok",
    displayName: chartResult.meta?.longName || chartResult.meta?.shortName || symbol,
    period,
    currency: chartResult.meta?.currency || null,
    exchange: chartResult.meta?.fullExchangeName || chartResult.meta?.exchangeName || null,
    timezone: chartResult.meta?.timezone || null,
    marketState: chartResult.meta?.marketState || "UNKNOWN",
    regularMarketPrice: toNumberOrNull(chartResult.meta?.regularMarketPrice),
    previousClose: toNumberOrNull(chartResult.meta?.chartPreviousClose),
    latestPoint,
    points,
  };
};

const normalizeFailedChartResult = ({ symbol, rank, period, error }) => ({
  rank,
  symbol,
  status: "error",
  displayName: symbol,
  period,
  currency: null,
  exchange: null,
  timezone: null,
  marketState: "UNKNOWN",
  regularMarketPrice: null,
  previousClose: null,
  latestPoint: null,
  points: [],
  error: error?.message || "Unable to fetch symbol chart",
});

const fetchShareChartFromYahoo = async ({ symbol, rank, periodConfig }) => {
  const response = await axios.get(buildYahooChartUrl(symbol), {
    params: {
      range: periodConfig.range,
      interval: periodConfig.interval,
      includePrePost: false,
    },
    timeout: 12000,
  });

  const chart = response.data?.chart;
  const chartError = chart?.error;

  if (chartError) {
    throw new Error(chartError.description || `Yahoo chart error for ${symbol}`);
  }

  const chartResult = chart?.result?.[0];

  if (!chartResult) {
    throw new Error(`No chart data returned for ${symbol}`);
  }

  return normalizeChartResult({
    symbol,
    rank,
    period: periodConfig.id,
    chartResult,
  });
};

const fetchTopShareMarketsFromYahoo = async ({ periodConfig, count, symbols }) => {
  const requestedSymbols = symbols?.length
    ? symbols
    : TOP_SHARE_MARKET_SYMBOLS.slice(0, count);
  const results = await Promise.allSettled(
    requestedSymbols.map((symbol, index) =>
      fetchShareChartFromYahoo({
        symbol,
        rank: index + 1,
        periodConfig,
      }),
    ),
  );

  const errors = [];
  const data = results
    .map((result, index) => {
      if (result.status === "fulfilled") return result.value;

      errors.push({
        symbol: requestedSymbols[index],
        message: result.reason?.message || "Unable to fetch symbol chart",
      });

      return normalizeFailedChartResult({
        symbol: requestedSymbols[index],
        rank: index + 1,
        period: periodConfig.id,
        error: result.reason,
      });
    })
    .filter(Boolean);

  if (!data.some((item) => item.status === "ok")) {
    throw new Error("No top share market data returned from provider");
  }

  return {
    meta: {
      period: periodConfig.id,
      range: periodConfig.range,
      interval: periodConfig.interval,
      providerUrlTemplate:
        "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
      requestedSymbols,
      failedSymbols: errors,
    },
    data,
  };
};

export const getSupportedMarketCollections = () => ({
  defaultRegion: DEFAULT_MARKET_REGION,
  defaultCount: DEFAULT_MARKET_COLLECTION_COUNT,
  cacheDurationMinutes: MARKET_COLLECTION_CACHE_MINUTES,
  lists: Object.values(MARKET_MOVER_LISTS),
  topShareMarketPeriods: Object.values(TOP_SHARE_MARKET_PERIODS),
  topShareMarketSymbols: TOP_SHARE_MARKET_SYMBOLS,
});

export const getSupportedMarkets = () =>
  DEFAULT_MARKET_KEYS.map((key) => MARKET_SYMBOLS[key]);

export const getMarketSnapshots = async ({
  keys = DEFAULT_MARKET_KEYS,
  forceRefresh = false,
} = {}) => {
  const { markets, invalidKeys } = getValidMarketConfigs(keys);

  if (!markets.length) {
    const error = new Error("No valid market keys were provided");
    error.statusCode = 400;
    error.details = {
      supportedKeys: DEFAULT_MARKET_KEYS,
      invalidKeys,
    };
    throw error;
  }

  const requestedKeys = markets.map((market) => market.key);

  if (!forceRefresh) {
    const cachedSnapshots = await getFreshCache(requestedKeys);

    if (cachedSnapshots.length === requestedKeys.length) {
      return {
        source: "cache",
        invalidKeys,
        data: sortSnapshots(cachedSnapshots, requestedKeys),
      };
    }
  }

  try {
    const fetchedAt = new Date();
    const quoteMap = await fetchQuotesFromYahoo(markets);

    const snapshots = markets
      .map((market) => {
        const quote = quoteMap[market.symbol];

        if (!quote) return null;

        return normalizeQuote(market, quote, fetchedAt);
      })
      .filter(Boolean);

    if (!snapshots.length) {
      throw new Error("No market data returned from provider");
    }

    await saveSnapshots(snapshots);

    return {
      source: "provider",
      invalidKeys,
      data: sortSnapshots(snapshots, requestedKeys),
    };
  } catch (error) {
    const fallbackCache = await getAnyCache(requestedKeys);

    if (fallbackCache.length) {
      return {
        source: "stale-cache",
        invalidKeys,
        warning:
          "Live provider request failed, returning last cached market data instead",
        data: sortSnapshots(fallbackCache, requestedKeys),
      };
    }

    error.statusCode = 502;
    throw error;
  }
};

export const getSingleMarketSnapshot = async ({
  key,
  forceRefresh = false,
} = {}) => {
  const result = await getMarketSnapshots({
    keys: [key],
    forceRefresh,
  });

  return {
    ...result,
    data: result.data[0] || null,
  };
};

export const getTrendingMarketSymbols = async ({
  region = DEFAULT_MARKET_REGION,
  count = DEFAULT_MARKET_COLLECTION_COUNT,
  lang,
  forceRefresh = false,
} = {}) => {
  const normalizedRegion = normalizeRegion(region);
  const normalizedCount = normalizeCount(count);
  const normalizedLang = normalizeLang(normalizedRegion, lang);
  const cacheKey = buildCollectionCacheKey({
    collectionType: MARKET_COLLECTION_TYPES.trending,
    region: normalizedRegion,
    count: normalizedCount,
    lang: normalizedLang,
  });

  if (!forceRefresh) {
    const cached = await getFreshCollectionCache(cacheKey);

    if (cached) {
      return buildCollectionResponse(cached, "cache");
    }
  }

  try {
    const fetchedAt = new Date();
    const providerResult = await fetchTrendingSymbolsFromYahoo({
      region: normalizedRegion,
      count: normalizedCount,
      lang: normalizedLang,
    });

    const snapshot = await saveCollectionSnapshot({
      cacheKey,
      collectionType: MARKET_COLLECTION_TYPES.trending,
      region: normalizedRegion,
      lang: normalizedLang,
      requestedCount: normalizedCount,
      meta: providerResult.meta,
      data: providerResult.data,
      fetchedAt,
    });

    return buildCollectionResponse(snapshot.toObject(), "provider");
  } catch (error) {
    const fallbackCache = await getAnyCollectionCache(cacheKey);

    if (fallbackCache) {
      return buildCollectionResponse(
        fallbackCache,
        "stale-cache",
        "Live provider request failed, returning last cached trending data instead",
      );
    }

    error.statusCode = 502;
    throw error;
  }
};

export const getMarketMoverData = async ({
  listId = "most_actives",
  region = DEFAULT_MARKET_REGION,
  count = DEFAULT_MARKET_COLLECTION_COUNT,
  lang,
  forceRefresh = false,
} = {}) => {
  const normalizedListId = String(listId || "").trim().toLowerCase();

  if (!MARKET_MOVER_LISTS[normalizedListId]) {
    const error = new Error("Unsupported market movers list");
    error.statusCode = 400;
    error.details = {
      supportedLists: Object.keys(MARKET_MOVER_LISTS),
    };
    throw error;
  }

  const normalizedRegion = normalizeRegion(region);
  const normalizedCount = normalizeCount(count);
  const normalizedLang = normalizeLang(normalizedRegion, lang);
  const cacheKey = buildCollectionCacheKey({
    collectionType: MARKET_COLLECTION_TYPES.movers,
    region: normalizedRegion,
    listId: normalizedListId,
    count: normalizedCount,
    lang: normalizedLang,
  });

  if (!forceRefresh) {
    const cached = await getFreshCollectionCache(cacheKey);

    if (cached) {
      return {
        list: MARKET_MOVER_LISTS[normalizedListId],
        ...buildCollectionResponse(cached, "cache"),
      };
    }
  }

  try {
    const fetchedAt = new Date();
    const providerResult = await fetchScreenerFromYahoo({
      listId: normalizedListId,
      region: normalizedRegion,
      count: normalizedCount,
      lang: normalizedLang,
    });

    const snapshot = await saveCollectionSnapshot({
      cacheKey,
      collectionType: MARKET_COLLECTION_TYPES.movers,
      listId: normalizedListId,
      region: normalizedRegion,
      lang: normalizedLang,
      requestedCount: normalizedCount,
      meta: providerResult.meta,
      data: providerResult.data,
      fetchedAt,
    });

    return {
      list: MARKET_MOVER_LISTS[normalizedListId],
      ...buildCollectionResponse(snapshot.toObject(), "provider"),
    };
  } catch (error) {
    const fallbackCache = await getAnyCollectionCache(cacheKey);

    if (fallbackCache) {
      return {
        list: MARKET_MOVER_LISTS[normalizedListId],
        ...buildCollectionResponse(
          fallbackCache,
          "stale-cache",
          "Live provider request failed, returning last cached market movers instead",
        ),
      };
    }

    error.statusCode = 502;
    throw error;
  }
};

export const getTopShareMarketData = async ({
  period = "daily",
  count,
  symbols,
  forceRefresh = false,
} = {}) => {
  const normalizedPeriod = String(period || "daily").trim().toLowerCase();
  const periodConfig = TOP_SHARE_MARKET_PERIODS[normalizedPeriod];

  if (!periodConfig) {
    const error = new Error("Unsupported top share market period");
    error.statusCode = 400;
    error.details = {
      supportedPeriods: Object.keys(TOP_SHARE_MARKET_PERIODS),
    };
    throw error;
  }

  const { selectedSymbols, invalidSymbols } = normalizeTopShareSymbols(symbols);

  if (symbols?.length && !selectedSymbols.length) {
    const error = new Error("No supported top share symbols were provided");
    error.statusCode = 400;
    error.details = {
      supportedSymbols: TOP_SHARE_MARKET_SYMBOLS,
      invalidSymbols,
    };
    throw error;
  }

  const normalizedCount = selectedSymbols.length
    ? selectedSymbols.length
    : normalizeTopShareCount(count);
  const cacheKey = buildTopSharesCacheKey({
    period: normalizedPeriod,
    count: normalizedCount,
    symbols: selectedSymbols,
  });

  if (!forceRefresh) {
    const cached = await getFreshCollectionCache(cacheKey);

    if (cached) {
      const response = buildCollectionResponse(cached, "cache");

      if (invalidSymbols.length) {
        response.meta = {
          ...response.meta,
          invalidSymbols,
        };
      }

      return response;
    }
  }

  try {
    const fetchedAt = new Date();
    const providerResult = await fetchTopShareMarketsFromYahoo({
      periodConfig,
      count: normalizedCount,
      symbols: selectedSymbols,
    });

    const snapshot = await saveCollectionSnapshot({
      cacheKey,
      collectionType: MARKET_COLLECTION_TYPES.topShares,
      listId: normalizedPeriod,
      region: "IN",
      lang: "en-IN",
      requestedCount: normalizedCount,
      meta: {
        ...providerResult.meta,
        selectionMode: selectedSymbols.length ? "selected" : "top-list",
      },
      data: providerResult.data,
      fetchedAt,
    });

    const response = buildCollectionResponse(snapshot.toObject(), "provider");

    if (invalidSymbols.length) {
      response.meta = {
        ...response.meta,
        invalidSymbols,
      };
    }

    return response;
  } catch (error) {
    const fallbackCache = await getAnyCollectionCache(cacheKey);

    if (fallbackCache) {
      const response = buildCollectionResponse(
        fallbackCache,
        "stale-cache",
        "Live provider request failed, returning last cached top share data instead",
      );

      if (invalidSymbols.length) {
        response.meta = {
          ...response.meta,
          invalidSymbols,
        };
      }

      return response;
    }

    error.statusCode = 502;
    throw error;
  }
};

export const getMarketNewsData = async ({
  query,
  symbol,
  symbols = [],
  region = DEFAULT_MARKET_NEWS_REGION,
  count,
  lang,
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
  const cacheKey = buildCollectionCacheKey({
    collectionType: MARKET_COLLECTION_TYPES.news,
    region: normalizedRegion,
    listId: normalizedQuery,
    count: normalizedCount,
    lang: normalizedLang,
  });

  if (!forceRefresh) {
    const cached = await getFreshCollectionCache(cacheKey);

    if (cached) {
      return buildCollectionResponse(cached, "cache");
    }
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

    const snapshot = await saveCollectionSnapshot({
      cacheKey,
      collectionType: MARKET_COLLECTION_TYPES.news,
      listId: normalizedQuery,
      region: normalizedRegion,
      lang: normalizedLang,
      requestedCount: normalizedCount,
      meta: {
        query: requestedSymbols.length ? null : queries[0],
        symbols: requestedSymbols,
        queries,
        effectiveRegions,
        fallbackUsed,
      },
      data,
      fetchedAt,
    });

    return buildCollectionResponse(snapshot.toObject(), "provider");
  } catch (error) {
    const fallbackCache = await getAnyCollectionCache(cacheKey);

    if (fallbackCache) {
      return buildCollectionResponse(
        fallbackCache,
        "stale-cache",
        "Live provider request failed, returning last cached market news instead",
      );
    }

    error.statusCode = 502;
    throw error;
  }
};

export const getMarketOverview = async ({
  region = DEFAULT_MARKET_REGION,
  count = DEFAULT_MARKET_COLLECTION_COUNT,
  lang,
  forceRefresh = false,
} = {}) => {
  const normalizedRegion = normalizeRegion(region);
  const normalizedCount = normalizeCount(count);
  const normalizedLang = normalizeLang(normalizedRegion, lang);

  const [trending, mostActives, dayGainers, dayLosers] = await Promise.all([
    getTrendingMarketSymbols({
      region: normalizedRegion,
      count: normalizedCount,
      lang: normalizedLang,
      forceRefresh,
    }),
    getMarketMoverData({
      listId: "most_actives",
      region: normalizedRegion,
      count: normalizedCount,
      lang: normalizedLang,
      forceRefresh,
    }),
    getMarketMoverData({
      listId: "day_gainers",
      region: normalizedRegion,
      count: normalizedCount,
      lang: normalizedLang,
      forceRefresh,
    }),
    getMarketMoverData({
      listId: "day_losers",
      region: normalizedRegion,
      count: normalizedCount,
      lang: normalizedLang,
      forceRefresh,
    }),
  ]);

  return {
    region: normalizedRegion,
    lang: normalizedLang,
    count: normalizedCount,
    sources: {
      trending: trending.source,
      mostActives: mostActives.source,
      dayGainers: dayGainers.source,
      dayLosers: dayLosers.source,
    },
    data: {
      trending,
      mostActives,
      dayGainers,
      dayLosers,
    },
  };
};

const settleHomeSection = async (name, loader) => {
  try {
    return {
      name,
      success: true,
      ...(await loader()),
    };
  } catch (error) {
    return {
      name,
      success: false,
      source: "error",
      message: error.message || "Unable to fetch market section",
      ...(error.details ? { details: error.details } : {}),
      data: [],
    };
  }
};

export const getMarketHomeData = async ({
  region = "IN",
  count = 20,
  topShareCount,
  topSharePeriod = "daily",
  lang,
  forceRefresh = false,
} = {}) => {
  const normalizedRegion = normalizeRegion(region);
  const normalizedCount = normalizeCount(count, 20);
  const normalizedLang = normalizeLang(normalizedRegion, lang);
  const normalizedTopShareCount = normalizeTopShareCount(topShareCount);

  const [
    marketIndices,
    trendingStocks,
    mostActive,
    topGainers,
    topLosers,
    nifty100,
    marketNews,
  ] = await Promise.all([
    settleHomeSection("marketIndices", async () => {
      const result = await getMarketSnapshots({
        keys: HOME_MARKET_INDEX_KEYS,
        forceRefresh,
      });

      return {
        source: result.source,
        count: result.data.length,
        invalidKeys: result.invalidKeys,
        ...(result.warning ? { warning: result.warning } : {}),
        data: result.data,
      };
    }),
    settleHomeSection("trendingStocks", () =>
      getTrendingMarketSymbols({
        region: normalizedRegion,
        count: normalizedCount,
        lang: normalizedLang,
        forceRefresh,
      }),
    ),
    settleHomeSection("mostActive", () =>
      getMarketMoverData({
        listId: "most_actives",
        region: normalizedRegion,
        count: normalizedCount,
        lang: normalizedLang,
        forceRefresh,
      }),
    ),
    settleHomeSection("topGainers", () =>
      getMarketMoverData({
        listId: "day_gainers",
        region: normalizedRegion,
        count: normalizedCount,
        lang: normalizedLang,
        forceRefresh,
      }),
    ),
    settleHomeSection("topLosers", () =>
      getMarketMoverData({
        listId: "day_losers",
        region: normalizedRegion,
        count: normalizedCount,
        lang: normalizedLang,
        forceRefresh,
      }),
    ),
    settleHomeSection("nifty100", () =>
      getTopShareMarketData({
        period: topSharePeriod,
        count: normalizedTopShareCount,
        forceRefresh,
      }),
    ),
    settleHomeSection("marketNews", () =>
      getMarketNewsData({
        query: "stock market today",
        region: normalizedRegion,
        count: normalizedCount,
        lang: normalizedLang,
        forceRefresh,
      }),
    ),
  ]);

  return {
    region: normalizedRegion,
    lang: normalizedLang,
    count: normalizedCount,
    topShareCount: normalizedTopShareCount,
    topSharePeriod,
    data: {
      marketIndices,
      trendingStocks,
      mostActive,
      topGainers,
      topLosers,
      nifty100,
      marketNews,
      mutualFunds: {
        name: "mutualFunds",
        success: true,
        source: "route",
        route: "/api/mutual-fund-data",
        message: "Use the mutual fund endpoints for this section.",
        data: [],
      },
      etfs: {
        name: "etfs",
        success: false,
        source: "not-configured",
        message: "ETF provider/source is not configured yet.",
        data: [],
      },
      ipo: {
        name: "ipo",
        success: false,
        source: "not-configured",
        message: "IPO provider/source is not configured yet.",
        data: [],
      },
      watchlist: {
        name: "watchlist",
        success: false,
        source: "not-configured",
        message: "Watchlist needs user authentication and a user-watchlist model.",
        data: [],
      },
    },
  };
};

