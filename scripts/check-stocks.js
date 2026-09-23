import UserStock from "../src/models/userStock.js";
import assert from "node:assert/strict";
import { calculateHolding } from "../src/services/stockHolding.service.js";
import axios from "axios";
import { getStockNetWorth, setAlerts } from "../src/controllers/stock.controller.js";
import { getStockNetWorthHistory } from "../src/services/stockNetWorth.service.js";
import {
  addStockSchema,
  netWorthQuerySchema,
  updateStockSchema,
} from "../src/validators/stock.validators.js";

const userId = "000000000000000000000001";
const trade = (quantity, transactionType, purchasePrice = 100) => ({ quantity, transactionType, purchasePrice, transactionDate: new Date("2026-01-01") });
assert.equal(calculateHolding([trade(0.1, "buy"), trade(0.2, "buy"), trade(0.3, "sell")]).quantity, 0);
assert.throws(() => calculateHolding([trade(1e-11, "sell")]), /Cannot sell/);
assert.equal(calculateHolding([trade(1e-11, "buy"), trade(5e-12, "sell")]).quantity, 5e-12);
assert.equal(calculateHolding([trade(10, "buy", 0), trade(10, "buy", 100)]).purchasePrice, 50);
const makeResponse = () => ({
  statusCode: 0,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const buy = addStockSchema.body({
  symbol: "RELIANCE.NS",
  name: "Reliance Industries",
  quantity: 10,
  price: 2500,
  transactionType: "buy",
});
const sell = addStockSchema.body({
  symbol: "RELIANCE.NS",
  name: "Reliance Industries",
  quantity: 4,
  price: 2700,
  transactionType: "SELL",
});

if (!buy.success || !sell.success || sell.data.transactionType !== "sell") {
  throw new Error("Valid buy/sell payload was rejected");
}
if (addStockSchema.body({ symbol: "ABC", name: "ABC Ltd", quantity: 0, price: 10 }).success) {
  throw new Error("Zero quantity was accepted");
}
if (addStockSchema.body({ symbol: "ABC", name: "ABC Ltd", quantity: 1 }).success) {
  throw new Error("A transaction without price was accepted");
}
const indianStock = addStockSchema.body({
  symbol: "reliance.ns",
  name: "Reliance Industries",
  quantity: 1,
  price: 2500,
});
if (
  !indianStock.success ||
  indianStock.data.exchange !== "NSE" ||
  indianStock.data.currency !== "INR"
) {
  throw new Error("Indian stock identity was not normalised");
}
if (
  addStockSchema.body({
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: 1,
    price: 200,
  }).success ||
  addStockSchema.body({
    symbol: "RELIANCE.NS",
    name: "Reliance Industries",
    quantity: 1,
    price: 2500,
    exchange: "BSE",
  }).success
) {
  throw new Error("A non-Indian or exchange-mismatched stock was accepted");
}
if (updateStockSchema.body({}).success) {
  throw new Error("An empty stock update was accepted");
}
if (
  netWorthQuerySchema.query({ period: "3 months" }).data.period !== "3months" ||
  netWorthQuerySchema.query({ period: "1y" }).data.period !== "1year" ||
  netWorthQuerySchema.query({ period: "two weeks" }).success
) {
  throw new Error("Net-worth period validation is incorrect");
}

const originalAxiosGet = axios.get;
axios.get = async () => ({
  data: {
    chart: {
      result: [{
        timestamp: [Date.UTC(2026, 0, 1, 18) / 1000, Date.UTC(2026, 0, 2, 18) / 1000],
        indicators: { quote: [{ close: [100, 110] }] },
      }],
    },
  },
});
const periodHistory = await getStockNetWorthHistory({
  period: "3months",
  transactions: [{
    symbol: "RELIANCE.NS",
    quantity: 5,
    purchasePrice: 100,
    transactionType: "buy",
    transactionDate: new Date(Date.UTC(2026, 0, 2)),
  }],
});
axios.get = originalAxiosGet;
if (
  periodHistory.performance.netContributions !== 500 ||
  periodHistory.performance.profitLoss !== 50 ||
  periodHistory.performance.profitLossPercentage !== 10
) {
  throw new Error("Net-worth period profit calculation is incorrect");
}

const sellDocument = new UserStock({ userId, ...sell.data });
await sellDocument.validate();
const sellJson = sellDocument.toJSON();
if (
  sellJson.transactionType !== "sell" ||
  sellJson.signedQuantity !== -4 ||
  sellJson.price !== 2700 ||
  sellJson.transactionValue !== 10800
) {
  throw new Error("Sell transaction output fields are incorrect");
}

const originalFindOneAndUpdate = UserStock.findOneAndUpdate;
let capturedAlertUpdate;
UserStock.findOneAndUpdate = async (filter, update) => {
  capturedAlertUpdate = update.$set;
  return {
    _id: "000000000000000000000002",
    symbol: "RELIANCE.NS",
    alerts: { enabled: true, targetPrice: 3000 },
  };
};
const alertResponse = makeResponse();
await setAlerts(
  {
    user: { userId },
    params: { id: "000000000000000000000002" },
    validated: { body: { targetPrice: 3000 } },
  },
  alertResponse,
);
UserStock.findOneAndUpdate = originalFindOneAndUpdate;

if (
  alertResponse.statusCode !== 200 ||
  capturedAlertUpdate["alerts.targetPrice"] !== 3000 ||
  "alerts.enabled" in capturedAlertUpdate
) {
  throw new Error("Partial alert update incorrectly changed the enabled state");
}

const originalGetUserPortfolioValue = UserStock.getUserPortfolioValue;
let netWorthUserId;
UserStock.getUserPortfolioValue = async (requestedUserId) => {
  netWorthUserId = requestedUserId;
  return {
    totalCurrentValue: 31500,
    totalInvestment: 28000,
    totalProfitLoss: 3500,
    totalProfitLossPercentage: 12.5,
    totalStocks: 2,
    totalQuantity: 15,
  };
};
const netWorthResponse = makeResponse();
await getStockNetWorth(
  {
    user: { userId },
    query: { userId: "000000000000000000000099" },
  },
  netWorthResponse,
);
UserStock.getUserPortfolioValue = originalGetUserPortfolioValue;

if (
  netWorthResponse.statusCode !== 200 ||
  netWorthUserId !== userId ||
  netWorthResponse.body.data.totalNetWorth !== 31500 ||
  netWorthResponse.body.data.totalInvestedValue !== 28000 ||
  netWorthResponse.body.data.holdingsCount !== 2
) {
  throw new Error("Stock net-worth endpoint did not remain scoped to the JWT user");
}

console.log("Stock validation, output, alerts, and net-worth unit checks passed.");
