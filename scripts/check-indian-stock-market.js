import assert from "node:assert/strict";
import { mock } from "node:test";
import YahooFinance from "yahoo-finance2";
import MarketCollectionSnapshot from "../src/models/marketCollectionSnapshot.js";
import { TOP_SHARE_MARKET_SYMBOLS } from "../src/config/marketSymbols.js";
import {
  getIndianStockExchangeFromSymbol,
  INDIAN_MARKET_MOVER_COUNT,
  searchStockSymbols,
} from "../src/services/marketData.service.js";
import {
  getTopIndianGainerDetail,
  getTopIndianStocksByPeriod,
  searchIndianStocks,
} from "../src/controllers/indianStockMarket.controller.js";

assert.equal(TOP_SHARE_MARKET_SYMBOLS.length, 99);
assert.equal(
  TOP_SHARE_MARKET_SYMBOLS.every((symbol) => symbol.endsWith(".NS")),
  true,
  "The top-share list must contain only NSE symbols",
);
assert.equal(INDIAN_MARKET_MOVER_COUNT, 25);
assert.equal(getIndianStockExchangeFromSymbol("RELIANCE.NS"), "NSE");
assert.equal(getIndianStockExchangeFromSymbol("RELIANCE.BO"), "BSE");
assert.equal(getIndianStockExchangeFromSymbol("AAPL"), null);

const response = {
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
};

const originalConsoleError = console.error;
console.error = () => {};
try {
  await getTopIndianStocksByPeriod(
    { params: { period: "yearly" }, query: {} },
    response,
  );
} finally {
  console.error = originalConsoleError;
}

assert.equal(response.statusCode, 400);
assert.equal(response.body.success, false);
assert.deepEqual(response.body.details.supportedPeriods, ["daily", "weekly", "monthly"]);

response.statusCode = 200;
response.body = null;
console.error = () => {};
try {
  await getTopIndianGainerDetail(
    { params: { symbol: "AAPL" }, query: {} },
    response,
  );
} finally {
  console.error = originalConsoleError;
}

assert.equal(response.statusCode, 400);
assert.equal(response.body.success, false);
assert.equal(response.body.message, "Only NSE (.NS) symbols are supported");

response.statusCode = 200;
response.body = null;
console.error = () => {};
try {
  await searchIndianStocks(
    { query: { query: "reliance", region: "US" } },
    response,
    () => { throw new Error("Search should not continue for a non-Indian region"); },
  );
} finally {
  console.error = originalConsoleError;
}
assert.equal(response.statusCode, 400);
assert.equal(response.body.success, false);
assert.match(response.body.message, /Only Indian NSE/);

// Exercise the real search pipeline with deterministic provider/cache responses.
const equity = (symbol, shortname, quoteType = "EQUITY") => ({ symbol, shortname, quoteType });
const providerQuotes = [
  equity("GOLDBEES.NS", "Nippon India ETF Gold BeES"),
  equity("NIFTYBEES.NS", "Reliance Nifty BeES"),
  equity("RELATE.NS", "Reliance Investments"), // ETF revealed by enrichment
  equity("OLDNAME.NS", "Reliance Old Name"), // current name no longer matches
  equity("RELIANCE.NS", "Reliance Industries Limited"),
  equity("RPOWER.NS", "Reliance Power Limited"),
  equity("RCOM.BO", "Reliance Communications Limited"),
  equity("TCS.NS", "Tata Consultancy Services"),
  equity("RELFUND.NS", "Reliance Mutual Fund"),
  equity("RELETF.NS", "Reliance Basket", "ETF"),
  equity("RELIANCE", "Reliance Overseas"),
];
const snapshots = new Map();
let providerFails = false;
let enrichmentFails = false;
let requestedSymbols = [];
const searchMock = mock.method(YahooFinance.prototype, "search", async () => {
  if (providerFails) throw new Error("Provider unavailable");
  return { quotes: providerQuotes, count: providerQuotes.length };
});
mock.method(YahooFinance.prototype, "quote", async (symbols) => {
  if (enrichmentFails) throw new Error("Quotes unavailable");
  requestedSymbols = symbols;
  return Object.fromEntries(symbols.map((symbol) => [symbol,
    symbol === "RELATE.NS"
      ? { symbol, quoteType: "EQUITY", longName: "Reliance ETF Basket" }
      : symbol === "OLDNAME.NS"
        ? { symbol, quoteType: "EQUITY", shortName: "Unrelated Company", longName: "Unrelated Company Limited" }
        : { symbol, quoteType: "EQUITY" },
  ]));
});
mock.method(MarketCollectionSnapshot, "findOne", ({ cacheKey }) => ({
  lean: async () => snapshots.get(cacheKey) || null,
}));
mock.method(MarketCollectionSnapshot, "findOneAndUpdate", async ({ cacheKey }, snapshot) => {
  assert.match(cacheKey, /^indian_stock_search_v3:/);
  snapshots.set(cacheKey, snapshot);
  return { toObject: () => snapshot };
});

try {
  await searchIndianStocks(
    { query: { query: "reliance", region: "IN", limit: "3" } },
    response,
    () => assert.fail("Search must be handled"),
  );
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data.map((item) => item.symbol), [
    "RELIANCE.NS", "RPOWER.NS", "RCOM.BO",
  ]);
  assert.deepEqual(response.body.data.map((item) => item.rank), [1, 2, 3]);
  assert.equal(response.body.count, 3);
  assert.equal(response.body.total, 3);
  assert.equal(requestedSymbols.includes("GOLDBEES.NS"), false);
  assert.equal(requestedSymbols.includes("TCS.NS"), false);

  const cached = await searchStockSymbols({ query: "reliance", count: 3 });
  assert.equal(cached.source, "cache");
  assert.deepEqual(cached.data, response.body.data);
  assert.equal(searchMock.mock.callCount(), 1);

  // Even an incorrectly populated cache must not leak funds or unrelated rows.
  const snapshot = [...snapshots.values()][0];
  snapshot.data.unshift(
    { symbol: "GOLDBEES.NS", displayName: "Nippon India ETF Gold BeES", type: "EQUITY" },
    { symbol: "RELBEES.NS", displayName: "Reliance ETF", type: "EQUITY" },
    { symbol: "TCS.NS", displayName: "Tata Consultancy Services", type: "EQUITY" },
    { symbol: "REL.NS", displayName: "Reliance Fund", type: "MUTUALFUND" },
  );
  snapshot.itemCount = snapshot.data.length;
  const filteredCache = await searchStockSymbols({ query: "reliance", count: 3 });
  assert.deepEqual(filteredCache.data, cached.data);
  assert.equal(filteredCache.count, 3);
  assert.equal(filteredCache.total, 3);
  providerFails = true;
  const stale = await searchStockSymbols({ query: "reliance", count: 3, forceRefresh: true });
  assert.equal(stale.source, "stale-cache");
  assert.deepEqual(stale.data, cached.data);
  providerFails = false;

  for (const [query, expected] of [
    ["  rElIaNcE   PoWeR  ", ["RPOWER.NS"]],
    ["rpow", ["RPOWER.NS"]],
    ["RCOM.BO", ["RCOM.BO"]],
    ["Nippon", []],
    ["GOLDBEES", []],
    ["no matching company", []],
    [".*", []],
  ]) {
    const result = await searchStockSymbols({ query, forceRefresh: true });
    assert.deepEqual(result.data.map((item) => item.symbol), expected, query);
    assert.equal(result.count, expected.length);
    assert.equal(result.total, expected.length);
  }

  enrichmentFails = true;
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await searchStockSymbols({ query: "reliance power", forceRefresh: true });
    assert.deepEqual(result.data.map((item) => item.symbol), ["RPOWER.NS"]);
    assert.equal(result.meta.quoteEnriched, false);
  } finally {
    console.warn = originalWarn;
  }
} finally {
  mock.restoreAll();
}

console.log("Indian NSE stock API configuration, validation and search filtering checks passed.");
