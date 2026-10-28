import mongoose from "mongoose";
import UserMutualFund from "../models/userMutualFund.js";
import { getMutualFundSnapshot } from "../services/mutualFundData.service.js";
import { AppError, sendError, sendSuccess } from "../utils/http.js";
import {
  addMutualFundTransaction,
  calculateMutualFundHolding,
  mutualFundSchemeFilter,
  mutualFundTransactions,
  withMutualFundSchemeLock,
} from "../services/mutualFundHolding.service.js";

const transactionOptions = ["buy", "sell"];
const validId = (id) => mongoose.isValidObjectId(id);
const bodyFor = (req) => req.validated?.body || req.body;
const queryFor = (req) => req.validated?.query || req.query;
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getRequestUserId = (req, res) => {
  const userId = req.user?.userId;
  if (!validId(userId)) {
    sendError(res, { statusCode: 400, message: "A valid userId is required" });
    return null;
  }
  return userId;
};
const getHoldingId = (req, res) => {
  const { id } = req.params;
  if (!validId(id)) {
    sendError(res, { statusCode: 400, message: "Invalid mutual fund ID. Use the _id returned from GET /api/mutual-funds." });
    return null;
  }
  return id;
};

// NAV comes from the existing MFAPI-backed service. An unavailable provider
// never prevents a user from seeing their previously saved holdings.
const refreshCurrentMutualFundNavs = async (userId) => {
  if (mongoose.connection.readyState !== 1 || mongoose.connection.db?.databaseName === "mutual_fund_holding_test") return;
  const rows = await UserMutualFund.find({ userId, schemeCode: { $exists: true, $ne: "" } }).select("_id schemeCode currentNav").lean();
  if (!rows.length) return;
  const results = await Promise.all(rows.map(async (row) => {
    try {
      const result = await getMutualFundSnapshot({ schemeCode: row.schemeCode });
      const currentNav = result.data?.latestNav;
      if (typeof currentNav !== "number") return null;
      return { updateOne: { filter: { _id: row._id, userId }, update: { $set: {
        currentNav, ...(row.currentNav != null ? { previousNav: row.currentNav } : {}), lastUpdated: new Date(),
      } } } };
    } catch (error) {
      console.warn(`Live mutual fund NAV refresh failed for ${row.schemeCode}:`, error.message);
      return null;
    }
  }));
  const operations = results.filter(Boolean);
  if (operations.length) await UserMutualFund.bulkWrite(operations);
};

export const lookupMutualFund = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    if (!userId) return null;
    const { schemeCode } = queryFor(req);
    const matches = await UserMutualFund.find(mutualFundSchemeFilter(userId, schemeCode)).sort({ createdAt: 1, _id: 1 }).lean();
    const transactions = matches.flatMap(mutualFundTransactions);
    const fund = matches.length ? UserMutualFund.hydrate({
      ...matches[0], schemeCode, transactions, ...calculateMutualFundHolding(transactions),
    }) : null;
    return sendSuccess(res, {
      message: fund ? "Existing mutual fund holding found" : "Mutual fund has not been added",
      data: { schemeCode, exists: Boolean(fund), mutualFund: fund, availableUnits: fund?.units ?? 0, canBuy: true, canSell: (fund?.units ?? 0) > 0 },
      transactionOptions,
    });
  } catch (error) {
    return sendError(res, { statusCode: error.statusCode || 500, message: error.statusCode ? error.message : "Failed to look up mutual fund holding" });
  }
};

export const addMutualFundHolding = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    if (!userId) return null;
    const { fund, created } = await addMutualFundTransaction(userId, { ...bodyFor(req), userId, lastUpdated: new Date() });
    return sendSuccess(res, {
      statusCode: created ? 201 : 200,
      message: created ? "Mutual fund added successfully" : "Mutual fund units updated successfully",
      data: fund, action: created ? "created" : "updated", transactionOptions,
    });
  } catch (error) {
    if (error.statusCode) return sendError(res, { statusCode: error.statusCode, message: error.message });
    if (error.code === 11000) return sendError(res, { statusCode: 409, message: "This scheme already exists in your mutual funds. Use POST /api/mutual-funds to add units." });
    if (error.name === "ValidationError") return sendError(res, { statusCode: 400, message: "Validation failed", details: Object.values(error.errors).map((item) => item.message) });
    console.error("Add mutual fund error:", error);
    return sendError(res, { message: "Failed to add mutual fund" });
  }
};

export const getMutualFundHoldings = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    if (!userId) return null;
    await refreshCurrentMutualFundNavs(userId);
    const { page = 1, limit = 50, search, schemeCode, transactionType, sortBy = "createdAt", sortOrder = "desc" } = queryFor(req);
    const filter = { userId };
    if (search) filter.fundName = { $regex: escapeRegex(search), $options: "i" };
    if (schemeCode) filter.schemeCode = { $regex: `^${escapeRegex(schemeCode)}$`, $options: "i" };
    if (transactionType) filter.$or = [{ "transactions.transactionType": transactionType }, { transactions: { $exists: false }, transactionType }];
    const [data, total, summary] = await Promise.all([
      UserMutualFund.find(filter).sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).skip((page - 1) * limit).limit(limit),
      UserMutualFund.countDocuments(filter), UserMutualFund.getUserPortfolioValue(userId),
    ]);
    return sendSuccess(res, {
      message: "Mutual funds fetched successfully", data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }, summary, transactionOptions,
    });
  } catch (error) {
    console.error("Get mutual funds error:", error);
    return sendError(res, { message: "Failed to fetch mutual funds" });
  }
};

export const getMutualFundBySchemeCode = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res); if (!userId) return null;
    const { schemeCode } = req.validated?.params || req.params;
    await refreshCurrentMutualFundNavs(userId);
    const fund = await UserMutualFund.findOne(mutualFundSchemeFilter(userId, schemeCode));
    return fund ? sendSuccess(res, { message: "Mutual fund details fetched successfully", data: fund, transactionOptions })
      : sendError(res, { statusCode: 404, message: `No mutual fund details found for scheme code ${schemeCode}` });
  } catch (error) {
    console.error("Get mutual fund by scheme code error:", error);
    return sendError(res, { message: "Failed to fetch mutual fund details" });
  }
};

export const getMutualFundHoldingById = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res); const id = getHoldingId(req, res);
    if (!userId || !id) return null;
    await refreshCurrentMutualFundNavs(userId);
    const data = await UserMutualFund.findOne({ _id: id, userId });
    return data ? sendSuccess(res, { message: "Mutual fund fetched successfully", data, transactionOptions })
      : sendError(res, { statusCode: 404, message: "Mutual fund not found" });
  } catch (error) {
    console.error("Get mutual fund error:", error);
    return sendError(res, { message: "Failed to fetch mutual fund" });
  }
};

export const updateMutualFundHolding = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res); const id = getHoldingId(req, res);
    if (!userId || !id) return null;
    const existing = await UserMutualFund.findOne({ _id: id, userId });
    if (!existing) return sendError(res, { statusCode: 404, message: "Mutual fund not found" });
    const updateData = { ...bodyFor(req) }; delete updateData.userId;
    const { transactionId } = updateData; delete updateData.transactionId;
    if (updateData.schemeCode && updateData.schemeCode !== existing.schemeCode) {
      return sendError(res, { statusCode: 409, message: "schemeCode cannot be changed. Delete this holding and add the selected scheme instead." });
    }
    const tradeFields = ["units", "purchaseNav", "transactionType", "transactionDate", "purchaseDate"];
    if (tradeFields.some((field) => updateData[field] !== undefined)) {
      const transactions = mutualFundTransactions(existing);
      if (transactions.length > 1 && !transactionId) return sendError(res, { statusCode: 409, message: "Provide transactionId to edit a transaction, or use POST /api/mutual-funds to add a buy or sell." });
      const index = transactionId ? transactions.findIndex((trade) => String(trade._id) === transactionId) : 0;
      if (index < 0) return sendError(res, { statusCode: 404, message: "Mutual fund transaction not found" });
      const transaction = { ...transactions[index] };
      for (const field of ["units", "purchaseNav", "transactionType", "transactionDate"]) if (updateData[field] !== undefined) transaction[field] = updateData[field];
      if (updateData.purchaseDate && !updateData.transactionDate) transaction.transactionDate = updateData.purchaseDate;
      transactions[index] = transaction;
      updateData.transactions = transactions;
      Object.assign(updateData, calculateMutualFundHolding(transactions));
    }
    delete updateData.purchaseDate;
    updateData.lastUpdated = new Date();
    const data = await withMutualFundSchemeLock(userId, existing.schemeCode, (session) => UserMutualFund.findOneAndUpdate(
      { _id: id, userId, __v: existing.__v ?? { $exists: false } },
      { $set: updateData, $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true, session },
    ));
    if (!data) return sendError(res, { statusCode: 409, message: "Mutual fund changed during this request. Please retry." });
    return sendSuccess(res, { message: "Mutual fund updated successfully", data, transactionOptions });
  } catch (error) {
    if (error.statusCode) return sendError(res, { statusCode: error.statusCode, message: error.message });
    if (error.name === "ValidationError") return sendError(res, { statusCode: 400, message: "Validation failed", details: Object.values(error.errors).map((item) => item.message) });
    console.error("Update mutual fund error:", error);
    return sendError(res, { message: "Failed to update mutual fund" });
  }
};

export const deleteMutualFundHolding = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res); const id = getHoldingId(req, res);
    if (!userId || !id) return null;
    const existing = await UserMutualFund.findOne({ _id: id, userId });
    if (!existing) return sendError(res, { statusCode: 404, message: "Mutual fund not found" });
    const data = await withMutualFundSchemeLock(userId, existing.schemeCode, (session) => UserMutualFund.findOneAndDelete({ _id: id, userId, __v: existing.__v ?? { $exists: false } }, { session }));
    return data ? sendSuccess(res, { message: "Mutual fund deleted successfully", data: { id: data._id, schemeCode: data.schemeCode, fundName: data.fundName } })
      : sendError(res, { statusCode: 409, message: "Mutual fund changed during this request. Please retry." });
  } catch (error) {
    console.error("Delete mutual fund error:", error);
    return sendError(res, { message: "Failed to delete mutual fund" });
  }
};

export const getMutualFundPortfolioSummary = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res); if (!userId) return null;
    await refreshCurrentMutualFundNavs(userId);
    const summary = await UserMutualFund.getUserPortfolioValue(userId);
    return sendSuccess(res, { message: "Mutual fund portfolio summary fetched successfully", data: summary, transactionOptions });
  } catch (error) {
    console.error("Get mutual fund summary error:", error);
    return sendError(res, { message: "Failed to fetch mutual fund portfolio summary" });
  }
};

export const getOpenMutualFundHoldings = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res); if (!userId) return null;
    await refreshCurrentMutualFundNavs(userId);
    const data = await UserMutualFund.getUserHoldings(userId);
    return sendSuccess(res, { message: "Mutual fund holdings fetched successfully", data, count: data.length, summary: UserMutualFund.summarizeHoldings(data), transactionOptions });
  } catch (error) {
    console.error("Get open mutual fund holdings error:", error);
    return sendError(res, { message: "Failed to fetch mutual fund holdings" });
  }
};

export const bulkUpdateMutualFundNavs = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res); if (!userId) return null;
    const updates = bodyFor(req).updates;
    const result = await Promise.all(updates.map((update) => UserMutualFund.findOneAndUpdate(
      { _id: update.id, userId }, { $set: { currentNav: update.currentNav, ...(update.previousNav !== undefined ? { previousNav: update.previousNav } : {}), lastUpdated: new Date() } }, { new: true },
    )));
    return sendSuccess(res, { message: "Mutual fund NAVs updated successfully", data: result.filter(Boolean), requested: updates.length, updated: result.filter(Boolean).length });
  } catch (error) {
    console.error("Bulk update mutual fund NAVs error:", error);
    return sendError(res, { message: "Failed to update mutual fund NAVs" });
  }
};
