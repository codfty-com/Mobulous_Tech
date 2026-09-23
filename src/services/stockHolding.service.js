import UserStock from "../models/userStock.js";
import mongoose from "mongoose";
import StockWriteLock from "../models/stockWriteLock.js";
import { AppError } from "../utils/http.js";

// Legacy documents represent one transaction; new documents retain every trade.
export const stockTransactions = (stock) => stock.transactions?.length
  ? stock.transactions.map((entry) => entry.toObject ? entry.toObject() : entry)
  : [{
      _id: stock._id,
      quantity: stock.quantity,
      purchasePrice: stock.purchasePrice ?? 0,
      transactionType: stock.transactionType || "buy",
      transactionDate: stock.transactionDate || stock.purchaseDate || stock.createdAt,
    }];

export const calculateHolding = (transactions) => {
  const ordered = [...transactions].sort(
    (left, right) => new Date(left.transactionDate) - new Date(right.transactionDate),
  );
  let quantity = 0;
  let cost = 0;
  for (const trade of ordered) {
    if (trade.transactionType === "sell") {
      // Tolerate only floating point rounding at fractional-share boundaries.
      const tolerance = Number.EPSILON * Math.max(quantity, trade.quantity) * 8;
      if (trade.quantity - quantity > tolerance) {
        throw new AppError(`Cannot sell ${trade.quantity} shares. Available quantity on the transaction date is ${Math.max(quantity, 0)}.`, 409);
      }
      cost -= (quantity ? cost / quantity : 0) * trade.quantity;
      quantity -= trade.quantity;
      if (Math.abs(quantity) <= tolerance) { quantity = 0; cost = 0; }
    } else {
      quantity += trade.quantity;
      cost += trade.quantity * trade.purchasePrice;
    }
  }
  if (!Number.isFinite(quantity) || !Number.isFinite(cost)) {
    throw new AppError("Stock quantity or investment exceeds the supported range", 400);
  }
  return {
    quantity,
    purchasePrice: quantity ? cost / quantity : 0,
    purchaseDate: ordered[0]?.transactionDate,
    transactionDate: ordered.at(-1)?.transactionDate,
    transactionType: ordered.at(-1)?.transactionType || "buy",
  };
};

const escapedSymbol = (symbol) => symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const stockSymbolFilter = (userId, symbol) => ({
  userId,
  symbol: { $regex: `^\\s*${escapedSymbol(symbol.trim())}\\s*$`, $options: "i" },
});

export const withStockSymbolLock = async (userId, symbol, operation) => {
  const lockId = `${String(userId).toLowerCase()}:${symbol.trim().toUpperCase()}`;
  // An insert race on a previously unseen lock can produce E11000 instead of
  // a transient transaction error. Retry it with a fresh transaction.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      return await mongoose.connection.transaction(async (session) => {
        await StockWriteLock.updateOne(
          { _id: lockId },
          { $inc: { revision: 1 } },
          { upsert: true, session },
        );
        return operation(session);
      });
    } catch (error) {
      if (error.code === 11000 && error.keyValue?._id === lockId) continue;
      throw error;
    }
  }
  throw new AppError("Stock changed during this request. Please retry.", 409);
};

export const addStockTransaction = async (userId, data) => {
  const symbol = data.symbol.trim().toUpperCase();
  const transaction = {
    quantity: data.quantity,
    purchasePrice: data.purchasePrice,
    transactionType: data.transactionType || "buy",
    transactionDate: data.transactionDate || data.purchaseDate || new Date(),
  };
  return withStockSymbolLock(userId, symbol, async (session) => {
    // Match legacy casing/whitespace too. A stock name is metadata, never its
    // identity. Keep the oldest ID when previous versions created duplicates.
    const matches = await UserStock.find(stockSymbolFilter(userId, symbol))
      .sort({ createdAt: 1, _id: 1 }).session(session).lean();
    const existing = matches[0];
    const transactions = [...matches.flatMap(stockTransactions), transaction];
    const holding = calculateHolding(transactions);
    if (!existing) {
      const [stock] = await UserStock.create(
        [{ ...data, userId, symbol, ...holding, transactions }], { session },
      );
      return { stock, created: true };
    }

    const updates = { symbol, ...holding, transactions, lastUpdated: new Date() };
    if (matches.length > 1) {
      // Preserve the original documents before retiring duplicate top-level IDs.
      const backup = mongoose.connection.db.collection("userstocks_before_consolidation");
      for (const row of matches) {
        await backup.updateOne({ _id: row._id }, { $setOnInsert: row }, { upsert: true, session });
      }
      const latest = [...matches].sort((a, b) => new Date(a.lastUpdated || a.createdAt) - new Date(b.lastUpdated || b.createdAt)).at(-1);
      for (const key of ["name", "icon", "exchange", "sector", "currency", "marketCap", "dividendYield", "peRatio", "notes", "currentPrice"]) {
        if (latest[key] !== undefined) updates[key] = latest[key];
      }
      updates.watchlist = matches.some((row) => row.watchlist);
      updates.tags = [...new Set(matches.flatMap((row) => row.tags || []))];
      for (const [key, value] of Object.entries(latest.alerts || {})) updates[`alerts.${key}`] = value;
      await UserStock.deleteMany({ userId, _id: { $in: matches.slice(1).map((row) => row._id) } }, { session });
    }
    // Omitted metadata must not reset the user's watchlist, notes or alerts.
    for (const key of ["name", "icon", "exchange", "sector", "currency", "marketCap", "dividendYield", "peRatio", "notes", "tags", "watchlist", "currentPrice"]) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    for (const [key, value] of Object.entries(data.alerts || {})) {
      updates[`alerts.${key}`] = value;
    }
    const stock = await UserStock.findOneAndUpdate(
      { _id: existing._id, userId, __v: existing.__v ?? { $exists: false } },
      { $set: updates, $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true, session },
    );
    if (!stock) throw new AppError("Stock changed during this request. Please retry.", 409);
    return { stock, created: false };
  });
};
