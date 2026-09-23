import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import axios from "axios";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import UserStock from "../src/models/userStock.js";
import User from "../src/models/user.js";
import stockRoutes from "../src/routes/stockRoutes.js";
import { env } from "../src/config/env.js";
import { generateAccessToken } from "../src/services/jwt.service.js";
import { migrateStockHoldings } from "./migrate-stock-holdings.js";

const database = await MongoMemoryReplSet.create({ replSet: { count: 1 }, instanceOpts: [{ launchTimeout: 60000 }] });
let server;
try {
  // Always use an isolated local database; never the application's MONGO_URI.
  await mongoose.connect(database.getUri(), { dbName: "stock_holding_test", autoIndex: false });
  await UserStock.createIndexes();
  env.skipJwtAuthForTesting = false;
  env.jwtSecret = "stock-holding-integration-test";
  const userId = "000000000000000000000001";
  const otherUserId = "000000000000000000000002";
  await User.create([
    { _id: userId, email: "holder@example.com", isEmailVerified: true },
    { _id: otherUserId, email: "other-holder@example.com", isEmailVerified: true },
  ]);
  const token = generateAccessToken({ userId });
  const otherToken = generateAccessToken({ userId: otherUserId });
  const app = express();
  app.use(express.json());
  app.use("/api", stockRoutes);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const request = async (method, path, body, jwt = token) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/stocks${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  const payload = { symbol: "RELIANCE.NS", name: "Reliance Industries", quantity: 10, price: 100, transactionDate: "2026-01-01" };
  assert.equal((await request("GET", "/lookup?symbol=RELIANCE.NS", undefined, "")).status, 401);
  assert.equal((await request("GET", "/lookup?symbol=RELIANCE.NS&query=reliance", undefined, "")).status, 401);
  for (const query of ["", "?symbol=AAPL", "?symbol=RELIANCE", "?symbol=x&symbol=y"]) {
    assert.equal((await request("GET", `/lookup${query}`)).status, 400);
  }
  const absent = await request("GET", "/lookup?symbol=RELIANCE.NS");
  assert.equal(absent.status, 200);
  assert.deepEqual(absent.body.data, { symbol: "RELIANCE.NS", exists: false, stock: null, availableQuantity: 0, canBuy: true, canSell: false });
  assert.equal((await request("POST", "", payload, "")).status, 401);
  const first = await request("POST", "", { ...payload, watchlist: true, notes: "Keep this", alerts: { enabled: true, targetPrice: 300 }, userId: otherUserId });
  assert.equal(first.status, 201);
  assert.equal(first.body.action, "created");
  assert.equal(first.body.data.userId, userId);
  const id = first.body.data._id;
  const added = await request("POST", "", { ...payload, symbol: " reliance.ns ", quantity: 5, price: 160, transactionDate: "2026-01-02", alerts: { stopLoss: 80 } });
  assert.equal(added.status, 200);
  assert.equal(added.body.action, "updated");
  assert.equal(added.body.data._id, id);
  assert.equal(added.body.data.quantity, 15);
  assert.equal(added.body.data.purchasePrice, 120);
  assert.equal(added.body.data.totalInvestment, 1800);
  assert.equal(added.body.data.watchlist, true);
  assert.equal(added.body.data.notes, "Keep this");
  assert.deepEqual(added.body.data.alerts, { enabled: true, targetPrice: 300, stopLoss: 80 });
  assert.equal(added.body.data.transactions.length, 2);
  const selected = await request("GET", "/lookup?symbol=%20reliance.ns%20");
  assert.equal(selected.body.data.stock._id, id);
  assert.equal(selected.body.data.availableQuantity, 15);
  assert.equal(selected.body.data.stock.totalInvestment, 1800);
  assert.equal(selected.body.data.canSell, true);
  assert.equal((await request("GET", "/lookup?symbol=RELIANCE.NS", undefined, otherToken)).body.data.exists, false);
  const listing = await request("GET", "");
  assert.equal(listing.body.pagination.total, 1);
  assert.equal(listing.body.data[0].quantity, 15);
  assert.equal(listing.body.summary.totalTransactions, 2);
  assert.equal(listing.body.summary.totalInvestment, 1800);
  const other = await request("POST", "", payload, otherToken);
  assert.equal(other.status, 201);
  assert.notEqual(other.body.data._id, id);
  assert.equal((await request("GET", `/${id}`, undefined, otherToken)).status, 404);
  for (const quantity of [0, -1, "invalid"]) {
    assert.equal((await request("POST", "", { ...payload, quantity })).status, 400);
  }
  assert.equal((await request("POST", "", { ...payload, transactionType: "sell", quantity: 16, transactionDate: "2026-01-03" })).status, 409);
  assert.equal((await request("POST", "", { ...payload, transactionType: "sell", quantity: 1, transactionDate: "2025-12-01" })).status, 409);
  const sold = await request("POST", "", { ...payload, transactionType: "sell", quantity: 5, price: 200, transactionDate: "2026-01-03" });
  assert.equal(sold.status, 200);
  assert.equal(sold.body.data._id, id);
  assert.equal(sold.body.data.quantity, 10);
  assert.equal(sold.body.data.purchasePrice, 120);
  const summary = await UserStock.getUserPortfolioValue(userId);
  assert.equal(summary.totalQuantity, 10);
  assert.equal(summary.totalInvestment, 800);
  assert.equal(summary.totalCurrentValue, 2000);
  assert.equal(summary.totalTransactions, 3);
  assert.equal(summary.sellTransactions, 1);
  assert.equal((await UserStock.getUserHoldings(userId))[0].quantity, 10);
  assert.equal((await UserStock.getStocksBySector(userId))[0].quantity, 10);
  assert.equal(await UserStock.getNetQuantity(userId, { symbol: payload.symbol }), 10);
  const originalAxiosGet = axios.get;
  try {
    axios.get = async () => ({ data: { chart: { result: [{
      timestamp: [1, 2, 3].map((day) => Date.UTC(2026, 0, day, 18) / 1000),
      indicators: { quote: [{ close: [100, 160, 200] }] },
    }] } } });
    const historical = await request("GET", "/net-worth?period=3months");
    assert.equal(historical.status, 200);
    assert.deepEqual(historical.body.data.history.map((point) => point.totalNetWorth), [1000, 2400, 2000]);
  } finally {
    axios.get = originalAxiosGet;
  }
  assert.equal((await request("GET", "?transactionType=sell")).body.pagination.total, 1);
  assert.equal((await request("PATCH", `/${id}`, { quantity: 99 })).status, 409);
  assert.equal((await request("PATCH", `/${id}`, { notes: "Updated" })).status, 200);
  const correctedTrade = await request("PATCH", `/${id}`, { transactionId: sold.body.data.transactions[1]._id, quantity: 6 });
  assert.equal(correctedTrade.status, 200);
  assert.equal(correctedTrade.body.data.quantity, 11);
  assert.equal(correctedTrade.body.data.transactions.length, 3);
  assert.equal(correctedTrade.body.data.transactions[1].quantity, 6);
  assert.equal((await request("PATCH", `/${id}`, { transactionId: sold.body.data.transactions[2]._id, quantity: 99 })).status, 409);
  assert.equal((await request("PATCH", `/${id}`, { transactionId: "000000000000000000000099", quantity: 1 })).status, 404);

  const parallelPayload = { ...payload, symbol: "TCS.NS", quantity: 1 };
  const concurrent = await Promise.all(Array.from({ length: 8 }, () => request("POST", "", parallelPayload)));
  assert.equal(concurrent.filter((result) => result.status === 201).length, 1);
  assert.equal(concurrent.filter((result) => result.status === 200).length, 7);
  const concurrentStock = await UserStock.findOne({ userId, symbol: "TCS.NS" });
  assert.equal(concurrentStock.quantity, 8);
  assert.equal(concurrentStock.transactions.length, 8);
  assert.equal(await UserStock.countDocuments({ userId, symbol: "TCS.NS" }), 1);
  const competingSells = await Promise.all(Array.from({ length: 2 }, () => request("POST", "", { ...parallelPayload, quantity: 5, transactionType: "sell", transactionDate: "2026-01-02" })));
  assert.deepEqual(competingSells.map((result) => result.status).sort(), [200, 409]);
  const closed = await request("POST", "", { ...parallelPayload, quantity: 3, transactionType: "sell", transactionDate: "2026-01-03" });
  assert.equal(closed.body.data.quantity, 0);
  assert.equal(closed.body.data.purchasePrice, 0);
  const closedLookup = await request("GET", "/lookup?symbol=TCS.NS");
  assert.equal(closedLookup.body.data.exists, true);
  assert.equal(closedLookup.body.data.canSell, false);
  const reopened = await request("POST", "", { ...parallelPayload, quantity: 2, price: 170, transactionDate: "2026-01-04" });
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.data._id, String(concurrentStock._id));
  assert.equal(reopened.body.data.quantity, 2);
  assert.equal(reopened.body.data.purchasePrice, 170);

  const single = await request("POST", "", { ...payload, symbol: "INFY.NS" });
  const corrected = await request("PATCH", `/${single.body.data._id}`, { quantity: 2, price: 150 });
  assert.equal(corrected.body.data.quantity, 2);
  assert.equal(corrected.body.data.transactions[0].quantity, 2);
  assert.equal(corrected.body.data.transactions[0].purchasePrice, 150);
  assert.equal((await request("PATCH", `/${single.body.data._id}`, { symbol: "RELIANCE.NS" })).status, 409);
  assert.equal((await request("DELETE", `/${id}`)).status, 200);
  assert.equal((await request("GET", `/${id}`)).status, 404);

  // Simulate a pre-change database, then verify consolidation and index migration.
  await UserStock.collection.drop();
  await UserStock.collection.createIndex({ userId: 1, symbol: 1 });
  const legacy = [
    { quantity: 10, purchasePrice: 100, transactionType: "buy", transactionDate: new Date("2026-01-01"), symbol: " reliance.ns " },
    { quantity: 5, purchasePrice: 160, transactionType: "buy", transactionDate: new Date("2026-01-02"), symbol: "RELIANCE.NS" },
    { quantity: 5, purchasePrice: 200, transactionType: "sell", transactionDate: new Date("2026-01-03"), symbol: "RELIANCE.NS" },
  ].map((trade) => ({ ...trade, _id: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId(userId), name: "Reliance Industries", currentPrice: 200, currency: "INR", exchange: "NSE", createdAt: trade.transactionDate }));
  await UserStock.collection.insertMany(legacy);
  const legacyLookup = await request("GET", "/lookup?symbol=RELIANCE.NS");
  assert.equal(legacyLookup.body.data.availableQuantity, 10);
  assert.equal(legacyLookup.body.data.stock.purchasePrice, 120);
  assert.equal(legacyLookup.body.data.stock._id, String(legacy[0]._id));
  assert.equal(await UserStock.countDocuments(), 3, "Selection must not write holdings");
  const preview = await migrateStockHoldings();
  assert.equal(preview.duplicateRowsToMerge, 2);
  assert.equal(await UserStock.countDocuments(), 3);
  await migrateStockHoldings({ apply: true });
  assert.equal(await UserStock.countDocuments(), 1);
  const migrated = await UserStock.findOne();
  assert.equal(String(migrated._id), String(legacy[0]._id));
  assert.equal(migrated.quantity, 10);
  assert.equal(migrated.purchasePrice, 120);
  assert.equal(migrated.transactions.length, 3);
  assert.equal(await mongoose.connection.db.collection("userstocks_before_consolidation").countDocuments(), 3);
  assert.equal((await UserStock.collection.indexes()).find((index) => index.name === "userId_1_symbol_1").unique, true);
  assert.equal((await migrateStockHoldings({ apply: true })).holdingsToMigrate, 0);
  const afterMigration = await request("POST", "", { ...payload, quantity: 2, price: 120, transactionDate: "2026-01-04" });
  assert.equal(afterMigration.status, 200);
  assert.equal(afterMigration.body.data.quantity, 12);
  assert.equal(await UserStock.countDocuments(), 1);

  // The reported production state: legacy duplicate rows and a NON-UNIQUE
  // index. POST must work without a successful global migration, even if an
  // unrelated symbol has invalid sell history.
  await UserStock.collection.drop();
  await UserStock.collection.createIndex({ userId: 1, symbol: 1 });
  const duplicateRows = legacy.map((row, index) => ({
    ...row, _id: new mongoose.Types.ObjectId(),
    watchlist: index === 0, notes: "Preserve duplicate metadata",
  }));
  await UserStock.collection.insertMany([
    ...duplicateRows,
    { ...legacy[0], _id: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId(otherUserId) },
    { ...legacy[2], _id: new mongoose.Types.ObjectId(), symbol: "OTHER.NS", quantity: 500 },
  ]);
  const legacyAdds = await Promise.all(Array.from({ length: 8 }, () => request("POST", "", {
    ...payload, symbol: " reliance.ns ", quantity: 2, price: 120, transactionDate: "2026-01-04",
  })));
  assert.ok(legacyAdds.every((result) => result.status === 200));
  assert.ok(legacyAdds.every((result) => result.body.data._id === String(duplicateRows[0]._id)));
  assert.equal(await UserStock.countDocuments({ userId, symbol: "RELIANCE.NS" }), 1);
  const repaired = await UserStock.findOne({ userId, symbol: "RELIANCE.NS" });
  assert.equal(repaired.quantity, 26);
  assert.equal(repaired.purchasePrice, 120);
  assert.equal(repaired.currentPrice, 120);
  assert.equal(repaired.transactions.length, 11);
  assert.equal(repaired.watchlist, true);
  assert.equal(repaired.notes, "Preserve duplicate metadata");
  assert.equal(await UserStock.countDocuments(), 3);
  assert.equal(await mongoose.connection.db.collection("userstocks_before_consolidation").countDocuments(), 6);
  const newWithoutIndex = await Promise.all(Array.from({ length: 8 }, () => request("POST", "", { ...parallelPayload, symbol: "WIPRO.NS" })));
  assert.equal(newWithoutIndex.filter((result) => result.status === 201).length, 1);
  assert.equal(newWithoutIndex.filter((result) => result.status === 200).length, 7);
  assert.equal(await UserStock.countDocuments({ userId, symbol: "WIPRO.NS" }), 1);
  assert.equal((await UserStock.findOne({ userId, symbol: "WIPRO.NS" })).quantity, 8);
  console.log("Stock API integration checks passed, including legacy duplicates and concurrent requests without a unique stock index.");
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await database.stop();
}
