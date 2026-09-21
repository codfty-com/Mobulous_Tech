import assert from "node:assert/strict";
import { TOP_SHARE_MARKET_SYMBOLS } from "../src/config/marketSymbols.js";
import {
  getIndianStockExchangeFromSymbol,
  INDIAN_MARKET_MOVER_COUNT,
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

console.log("Indian NSE stock API configuration and validation checks passed.");
