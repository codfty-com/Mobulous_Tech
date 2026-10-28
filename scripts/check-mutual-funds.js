import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import User from "../src/models/user.js";
import UserMutualFund from "../src/models/userMutualFund.js";
import apiRouter from "../src/routes/apiRoutes.js";
import { env } from "../src/config/env.js";
import { generateAccessToken } from "../src/services/jwt.service.js";

const database = await MongoMemoryReplSet.create({ replSet: { count: 1 }, instanceOpts: [{ launchTimeout: 60000 }] });
let server;
try {
  await mongoose.connect(database.getUri(), { dbName: "mutual_fund_holding_test", autoIndex: false });
  await UserMutualFund.createIndexes();
  env.skipJwtAuthForTesting = false;
  env.jwtSecret = "mutual-fund-integration-test";
  const userId = "000000000000000000000001";
  await User.create({ _id: userId, email: "mutual-fund@example.com", isEmailVerified: true });
  const token = generateAccessToken({ userId });
  // Mount the complete production API composition. Mutual-fund search is
  // registered before the authenticated portfolio router, so this verifies
  // that non-search requests continue through to the buy/sell endpoints.
  const app = express(); app.use(express.json()); app.use("/api", apiRouter);
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const request = async (method, path, body, jwt = token) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/mutual-funds${path}`, {
      method, headers: { "Content-Type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };

  assert.equal((await request("GET", "/lookup?schemeCode=122639", undefined, "")).status, 401);
  const absent = await request("GET", "/lookup?schemeCode=122639");
  assert.deepEqual(absent.body.data, { schemeCode: "122639", exists: false, mutualFund: null, availableUnits: 0, canBuy: true, canSell: false });
  const first = await request("POST", "", { schemeCode: "122639", fundName: "Example Flexi Cap Fund", units: 10, purchaseNav: 100, currentNav: 120, transactionDate: "2026-01-01" });
  assert.equal(first.status, 201); assert.equal(first.body.data.units, 10);
  const id = first.body.data._id;
  const added = await request("POST", "", { schemeCode: "122639", fundName: "Example Flexi Cap Fund", units: 5, price: 160, transactionDate: "2026-01-02" });
  assert.equal(added.status, 200); assert.equal(added.body.data._id, id); assert.equal(added.body.data.units, 15); assert.equal(added.body.data.purchaseNav, 120);
  const sold = await request("POST", "", { schemeCode: "122639", fundName: "Example Flexi Cap Fund", units: 4, purchaseNav: 180, transactionType: "sell", transactionDate: "2026-01-03" });
  assert.equal(sold.status, 200); assert.equal(sold.body.data.units, 11); assert.equal(sold.body.data.investedAmount, 1320); assert.equal(sold.body.data.transactions.length, 3);
  assert.equal((await request("POST", "", { schemeCode: "122639", fundName: "Example Flexi Cap Fund", units: 12, purchaseNav: 180, transactionType: "sell" })).status, 409);
  const selected = await request("GET", "/lookup?schemeCode=122639");
  assert.equal(selected.body.data.availableUnits, 11); assert.equal(selected.body.data.canSell, true);
  const holdings = await request("GET", "/holdings");
  assert.equal(holdings.body.count, 1); assert.equal(holdings.body.data[0].units, 11); assert.equal(holdings.body.summary.totalInvestment, 1320);
  const summary = await request("GET", "/summary");
  assert.equal(summary.body.data.totalMutualFunds, 1); assert.equal(summary.body.data.totalTransactions, 3);
  assert.equal((await request("PATCH", `/${id}`, { units: 8 })).status, 409);
  assert.equal((await request("GET", "/scheme/122639")).body.data._id, id);
  console.log("Mutual fund API integration checks passed through the production router, including buy/sell ledger and oversell prevention.");
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await database.stop();
}
