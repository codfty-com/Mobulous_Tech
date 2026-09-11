import assert from "node:assert/strict";
import mongoose from "mongoose";
import Asset from "../src/models/asset.js";
import UserHolding from "../src/models/userHolding.js";
import { env } from "../src/config/env.js";
import { authenticateRequest } from "../src/middlewares/jwt.js";
import { deleteHolding, getCategoryPortfolio, getDashboard, updateHolding } from "../src/services/portfolio.service.js";
import {
  categoryParamsSchema,
  createHoldingSchema,
  historyQuerySchema,
} from "../src/validators/portfolio.validators.js";

const userOne = "000000000000000000000001";
const userTwo = "000000000000000000000002";
const stockCategory = new mongoose.Types.ObjectId("000000000000000000000101");
const fundCategory = new mongoose.Types.ObjectId("000000000000000000000102");

Asset.find = () => ({
  sort: () => ({
    lean: async () => [
      { _id: stockCategory, assetId: "01", key: "stocks", name: "Stocks", icon: "stock.svg", status: "available", displayOrder: 0 },
      { _id: fundCategory, assetId: "02", key: "mutual_funds", name: "Mutual Funds", icon: "fund.svg", status: "available", displayOrder: 1 },
      { _id: new mongoose.Types.ObjectId("000000000000000000000103"), assetId: "03", key: "etf", name: "ETF", icon: "etf.svg", status: "disabled", displayOrder: 2 },
    ],
  }),
});

UserHolding.aggregate = async (pipeline) => {
  const userId = String(pipeline[0].$match.userId);
  if (userId === userOne) {
    return [
      { _id: { categoryId: stockCategory, categoryKey: "stocks" }, holdingCount: 2, investedAmount: 224000, currentValue: 254855, todayChange: -150.78 },
      { _id: { categoryId: fundCategory, categoryKey: "mutual_funds" }, holdingCount: 1, investedAmount: 101000, currentValue: 182400, todayChange: -21 },
    ];
  }
  return [{ _id: { categoryId: stockCategory, categoryKey: "stocks" }, holdingCount: 1, investedAmount: 0, currentValue: 50, todayChange: 2 }];
};

const firstDashboard = await getDashboard(userOne);
assert.equal(firstDashboard.portfolio.holdingCount, 3);
assert.equal(firstDashboard.portfolio.investedAmount, 325000);
assert.equal(firstDashboard.portfolio.currentValue, 437255);
assert.equal(firstDashboard.portfolio.netWorth, 437255);
assert.equal(firstDashboard.portfolio.totalGain, 112255);
assert.equal(firstDashboard.portfolio.todayChange, -171.78);
assert.equal(firstDashboard.portfolio.returnPercentage, 34.54);
assert.equal(firstDashboard.assets[2].currentValue, 0);
assert.equal(firstDashboard.assets[2].holdingCount, 0);

const secondDashboard = await getDashboard(userTwo);
assert.equal(secondDashboard.portfolio.currentValue, 50);
assert.equal(secondDashboard.assets[1].currentValue, 0);
assert.equal(secondDashboard.portfolio.returnPercentage, 0);

const validHolding = createHoldingSchema.body({
  categoryKey: "stocks",
  instrumentId: "000000000000000000000201",
  quantity: 10,
  averagePurchasePrice: 0,
});
assert.equal(validHolding.success, true);
assert.equal(createHoldingSchema.body({ categoryKey: "invalid key", instrumentId: "bad", quantity: 0, averagePurchasePrice: -1 }).success, false);
assert.equal(categoryParamsSchema.params({ categoryKey: "stocks" }).success, true);
assert.equal(categoryParamsSchema.params({ categoryKey: "stocks!" }).success, false);
assert.equal(historyQuerySchema.query({ period: "1M" }).success, true);
assert.equal(historyQuerySchema.query({ period: "10Y" }).success, false);

const authState = { skip: env.skipJwtAuthForTesting, secret: env.jwtSecret };
env.skipJwtAuthForTesting = false;
env.jwtSecret = "test-secret";
const unauthenticatedResponse = {
  statusCode: 0,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
};
authenticateRequest({ get: () => "" }, unauthenticatedResponse, () => assert.fail("Unauthenticated request continued"));
assert.equal(unauthenticatedResponse.statusCode, 401);
env.skipJwtAuthForTesting = authState.skip;
env.jwtSecret = authState.secret;

let ownershipFilter;
UserHolding.findOne = async (filter) => {
  ownershipFilter = filter;
  return null;
};
await assert.rejects(() => updateHolding(userOne, "000000000000000000000301", { quantity: 2 }), /Holding not found/);
assert.equal(String(ownershipFilter.userId), userOne);
assert.equal(String(ownershipFilter._id), "000000000000000000000301");
UserHolding.findOneAndDelete = async (filter) => {
  ownershipFilter = filter;
  return null;
};
await assert.rejects(() => deleteHolding(userOne, "000000000000000000000301"), /Holding not found/);
assert.equal(String(ownershipFilter.userId), userOne);

Asset.findOne = async () => null;
await assert.rejects(() => getCategoryPortfolio(userOne, "not_a_category"), /Asset category not found/);

console.log("Portfolio authentication, ownership, dashboard, isolation, zero-value, calculation, and validation checks passed.");
