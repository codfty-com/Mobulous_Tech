import mongoose from "mongoose";
import { calculateHolding, stockTransactions } from "../src/services/stockHolding.service.js";
import UserStock from "../src/models/userStock.js";

// Run with stock writes paused. Each merge and its backup commit together.
export const migrateStockHoldings = async ({ apply = false } = {}) => {
  const groups = await UserStock.collection.aggregate([
    { $sort: { createdAt: 1, _id: 1 } },
    { $group: {
      _id: { userId: "$userId", symbol: { $toUpper: { $trim: { input: "$symbol" } } } },
      rows: { $push: "$$ROOT" },
    } },
  ]).toArray();
  const plans = [];
  for (const { _id: identity, rows } of groups) {
    if (rows.length === 1 && rows[0].transactions?.length && rows[0].symbol === identity.symbol) continue;
    const transactions = rows.flatMap(stockTransactions);
    const holding = calculateHolding(transactions);
    const first = rows[0];
    const latest = [...rows].sort((a, b) => new Date(a.lastUpdated || a.createdAt) - new Date(b.lastUpdated || b.createdAt)).at(-1);
    const merged = new UserStock({
      ...first,
      ...latest,
      _id: first._id,
      createdAt: first.createdAt,
      symbol: identity.symbol,
      ...holding,
      transactions,
      watchlist: rows.some((row) => row.watchlist),
      tags: [...new Set(rows.flatMap((row) => row.tags || []))],
      lastUpdated: new Date(),
      __v: (first.__v || 0) + 1,
    });
    await merged.validate();
    plans.push({ rows, merged: merged.toObject({ virtuals: false }) });
  }

  if (apply) {
    const backupName = "userstocks_before_consolidation";
    if (!(await mongoose.connection.db.listCollections({ name: backupName }).toArray()).length) {
      await mongoose.connection.db.createCollection(backupName);
    }
    const backup = mongoose.connection.db.collection(backupName);
    for (const { rows, merged } of plans) {
      await mongoose.connection.transaction(async (session) => {
        for (const row of rows) {
          await backup.updateOne({ _id: row._id }, { $setOnInsert: row }, { upsert: true, session });
        }
        await UserStock.collection.deleteMany({ _id: { $in: rows.slice(1).map((row) => row._id) } }, { session });
        await UserStock.collection.replaceOne({ _id: merged._id }, merged, { session });
      });
    }
    const indexes = await UserStock.collection.indexes().catch((error) => {
      if (error.code === 26) return [];
      throw error;
    });
    const identityIndex = indexes.find((index) => JSON.stringify(index.key) === JSON.stringify({ userId: 1, symbol: 1 }));
    if (identityIndex && !identityIndex.unique) await UserStock.collection.dropIndex(identityIndex.name);
    if (!identityIndex?.unique) {
      await UserStock.collection.createIndex({ userId: 1, symbol: 1 }, { unique: true, name: "userId_1_symbol_1" });
    }
  }
  return { applied: apply, holdingsToMigrate: plans.length, duplicateRowsToMerge: plans.reduce((total, plan) => total + plan.rows.length - 1, 0) };
};
