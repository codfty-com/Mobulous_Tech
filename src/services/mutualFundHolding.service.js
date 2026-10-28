import mongoose from "mongoose";
import UserMutualFund from "../models/userMutualFund.js";
import MutualFundWriteLock from "../models/mutualFundWriteLock.js";
import { AppError } from "../utils/http.js";
import { calculateMutualFundHolding, mutualFundTransactions } from "../utils/mutualFundLedger.js";

export { calculateMutualFundHolding, mutualFundTransactions } from "../utils/mutualFundLedger.js";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const mutualFundSchemeFilter = (userId, schemeCode) => ({
  userId,
  schemeCode: { $regex: `^\\s*${escapeRegex(schemeCode)}\\s*$`, $options: "i" },
});

export const withMutualFundSchemeLock = async (userId, schemeCode, operation) => {
  const lockId = `${String(userId).toLowerCase()}:${String(schemeCode).trim()}`;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      return await mongoose.connection.transaction(async (session) => {
        await MutualFundWriteLock.updateOne({ _id: lockId }, { $inc: { revision: 1 } }, { upsert: true, session });
        return operation(session);
      });
    } catch (error) {
      if (error.code === 11000 && error.keyValue?._id === lockId) continue;
      throw error;
    }
  }
  throw new AppError("Mutual fund changed during this request. Please retry.", 409);
};

export const addMutualFundTransaction = async (userId, data) => {
  const schemeCode = String(data.schemeCode).trim();
  const transaction = {
    units: data.units,
    purchaseNav: data.purchaseNav,
    transactionType: data.transactionType || "buy",
    transactionDate: data.transactionDate || data.purchaseDate || new Date(),
  };
  return withMutualFundSchemeLock(userId, schemeCode, async (session) => {
    const matches = await UserMutualFund.find(mutualFundSchemeFilter(userId, schemeCode))
      .sort({ createdAt: 1, _id: 1 }).session(session).lean();
    const existing = matches[0];
    const transactions = [...matches.flatMap(mutualFundTransactions), transaction];
    const holding = calculateMutualFundHolding(transactions);
    if (!existing) {
      const [fund] = await UserMutualFund.create(
        [{ ...data, userId, schemeCode, ...holding, transactions }], { session },
      );
      return { fund, created: true };
    }

    const updates = { schemeCode, ...holding, transactions, lastUpdated: new Date() };
    if (matches.length > 1) {
      const backup = mongoose.connection.db.collection("usermutualfunds_before_consolidation");
      for (const row of matches) await backup.updateOne({ _id: row._id }, { $setOnInsert: row }, { upsert: true, session });
      const latest = [...matches].sort((a, b) => new Date(a.lastUpdated || a.createdAt) - new Date(b.lastUpdated || b.createdAt)).at(-1);
      for (const key of ["fundName", "icon", "folioNumber", "fundHouse", "category", "notes", "tags", "currentNav", "previousNav"]) {
        if (latest[key] !== undefined) updates[key] = latest[key];
      }
      await UserMutualFund.deleteMany({ userId, _id: { $in: matches.slice(1).map((row) => row._id) } }, { session });
    }
    for (const key of ["fundName", "icon", "folioNumber", "fundHouse", "category", "notes", "tags", "currentNav", "previousNav"]) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    const fund = await UserMutualFund.findOneAndUpdate(
      { _id: existing._id, userId, __v: existing.__v ?? { $exists: false } },
      { $set: updates, $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true, session },
    );
    if (!fund) throw new AppError("Mutual fund changed during this request. Please retry.", 409);
    return { fund, created: false };
  });
};
