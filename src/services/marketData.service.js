import YahooFinance from "yahoo-finance2";
import { DEFAULT_MARKET_KEYS, MARKET_SYMBOLS } from "../config/marketSymbols.js";
import MarketSnapshot from "../models/marketSnapshot.js";

const yahooFinance = new YahooFinance();

const CACHE_MINUTES = Number(process.env.MARKET_CACHE_DURATION_MINUTES || 2);

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

const saveSnapshots = async (snapshots) => {
  if (!snapshots.length) return;

  await Promise.all(
    snapshots.map((snapshot) =>
      MarketSnapshot.findOneAndUpdate(
        { key: snapshot.key },
        snapshot,
        {
          upsert: true,
          new: true,
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
