import mongoose from "mongoose";
import { AppError } from "../utils/http.js";
import Asset from "../models/asset.js";
import Instrument from "../models/instrument.js";
import InvestmentAccount from "../models/investmentAccount.js";
import UserHolding from "../models/userHolding.js";
import PortfolioSnapshot from "../models/portfolioSnapshot.js";
import UserStock from "../models/userStock.js";

const round = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const metricsFor = ({ holdingCount = 0, investedAmount = 0, currentValue = 0, todayChange = 0 }) => {
  const invested = round(investedAmount);
  const current = round(currentValue);
  const totalGain = round(current - invested);
  return {
    holdingCount,
    investedAmount: invested,
    currentValue: current,
    totalGain,
    todayChange: round(todayChange),
    returnPercentage: invested === 0 ? 0 : round((totalGain / invested) * 100),
  };
};

const objectId = (id) => new mongoose.Types.ObjectId(id);
const instrumentLookup = {
  $lookup: { from: "instruments", localField: "instrumentId", foreignField: "_id", as: "instrument" },
};

const totalsPipeline = (match) => [
  { $match: match },
  instrumentLookup,
  { $unwind: "$instrument" },
  {
    $group: {
      _id: { categoryId: "$categoryId", categoryKey: "$categoryKey" },
      holdingCount: { $sum: 1 },
      investedAmount: { $sum: "$investedAmount" },
      currentValue: { $sum: { $multiply: ["$quantity", "$instrument.currentPrice"] } },
      todayChange: {
        $sum: {
          $multiply: [
            "$quantity",
            { $subtract: ["$instrument.currentPrice", { $ifNull: ["$instrument.previousClose", "$instrument.currentPrice"] }] },
          ],
        },
      },
    },
  },
];

const categoryFor = async (categoryKey) => {
  const category = await Asset.findOne({ key: categoryKey, isActive: true });
  if (!category) throw new AppError("Asset category not found", 404);
  return category;
};

const holdingDataFor = async ({ userId, body, existing }) => {
  const categoryKey = body.categoryKey ?? existing?.categoryKey;
  const instrumentId = body.instrumentId ?? String(existing?.instrumentId);
  const category = await categoryFor(categoryKey);
  const instrument = await Instrument.findOne({
    _id: instrumentId,
    categoryId: category._id,
    categoryKey: category.key,
    isActive: true,
  });
  if (!instrument) {
    throw new AppError("Instrument not found or does not belong to the selected category", 400);
  }

  const accountId = body.accountId !== undefined ? body.accountId : existing?.accountId ? String(existing.accountId) : null;
  if (accountId) {
    const account = await InvestmentAccount.findOne({ _id: accountId, userId, status: "active" });
    if (!account) throw new AppError("Investment account not found or is inactive", 400);
  }

  const quantity = body.quantity ?? existing?.quantity;
  const averagePurchasePrice = body.averagePurchasePrice ?? existing?.averagePurchasePrice;
  return {
    categoryId: category._id,
    categoryKey: category.key,
    instrumentId: instrument._id,
    accountId,
    quantity,
    averagePurchasePrice,
    investedAmount: quantity * averagePurchasePrice,
    ...(body.source !== undefined ? { source: body.source } : {}),
    ...(body.externalHoldingId !== undefined ? { externalHoldingId: body.externalHoldingId } : {}),
    ...(body.lastSyncedAt !== undefined ? { lastSyncedAt: body.lastSyncedAt } : {}),
  };
};

export const getDashboard = async (userId) => {
  const [categories, grouped, stockPortfolio] = await Promise.all([
    Asset.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).lean(),
    UserHolding.aggregate(totalsPipeline({ userId: objectId(userId) })),
    UserStock.getUserPortfolioValue(userId),
  ]);
  const byCategoryId = new Map(grouped.map((entry) => [String(entry._id.categoryId), entry]));
  const assets = categories.map((category) => {
    const values = byCategoryId.get(String(category._id)) || {};
    const holdingMetrics = metricsFor(values);
    const metrics = category.key === "stocks"
      ? metricsFor({
          holdingCount: holdingMetrics.holdingCount + stockPortfolio.totalStocks,
          investedAmount: holdingMetrics.investedAmount + stockPortfolio.totalInvestment,
          currentValue: holdingMetrics.currentValue + stockPortfolio.totalCurrentValue,
          todayChange: holdingMetrics.todayChange,
        })
      : holdingMetrics;
    return {
      assetId: category.assetId,
      categoryId: String(category._id),
      key: category.key,
      name: category.name,
      icon: category.icon,
      description: category.description,
      status: category.status,
      displayOrder: category.displayOrder,
      ...metrics,
    };
  });
  const portfolioMetrics = metricsFor(
    assets.reduce(
      (total, asset) => ({
        holdingCount: total.holdingCount + asset.holdingCount,
        investedAmount: total.investedAmount + asset.investedAmount,
        currentValue: total.currentValue + asset.currentValue,
        todayChange: total.todayChange + asset.todayChange,
      }),
      { holdingCount: 0, investedAmount: 0, currentValue: 0, todayChange: 0 },
    ),
  );
  return { portfolio: { ...portfolioMetrics, netWorth: portfolioMetrics.currentValue }, assets };
};

export const getCategoryPortfolio = async (userId, categoryKey) => {
  const category = await categoryFor(categoryKey);
  const [grouped, holdings] = await Promise.all([
    UserHolding.aggregate(totalsPipeline({ userId: objectId(userId), categoryId: category._id })),
    UserHolding.aggregate([
      { $match: { userId: objectId(userId), categoryId: category._id } },
      instrumentLookup,
      { $unwind: "$instrument" },
      { $lookup: { from: "investmentaccounts", localField: "accountId", foreignField: "_id", as: "account" } },
      { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
      { $sort: { "instrument.name": 1 } },
    ]),
  ]);
  const summary = metricsFor(grouped[0] || {});
  return {
    category: {
      assetId: category.assetId,
      categoryId: String(category._id),
      key: category.key,
      name: category.name,
      icon: category.icon,
      status: category.status,
      ...summary,
    },
    holdings: holdings.map((holding) => {
      const currentPrice = holding.instrument.currentPrice;
      const previousClose = holding.instrument.previousClose ?? currentPrice;
      const values = metricsFor({
        holdingCount: 1,
        investedAmount: holding.investedAmount,
        currentValue: holding.quantity * currentPrice,
        todayChange: holding.quantity * (currentPrice - previousClose),
      });
      return {
        holdingId: String(holding._id),
        categoryKey: holding.categoryKey,
        quantity: holding.quantity,
        averagePurchasePrice: holding.averagePurchasePrice,
        source: holding.source,
        externalHoldingId: holding.externalHoldingId,
        lastSyncedAt: holding.lastSyncedAt,
        instrument: {
          id: String(holding.instrument._id), name: holding.instrument.name, symbol: holding.instrument.symbol,
          isin: holding.instrument.isin, exchange: holding.instrument.exchange, currency: holding.instrument.currency,
          currentPrice, previousClose, priceType: holding.instrument.priceType, priceUpdatedAt: holding.instrument.priceUpdatedAt,
        },
        account: holding.account
          ? { id: String(holding.account._id), provider: holding.account.provider, accountName: holding.account.accountName, status: holding.account.status }
          : null,
        ...values,
      };
    }),
  };
};

export const createHolding = async (userId, body) => {
  const data = await holdingDataFor({ userId, body });
  return UserHolding.create({ userId, ...data });
};

export const updateHolding = async (userId, holdingId, body) => {
  const existing = await UserHolding.findOne({ _id: holdingId, userId });
  if (!existing) throw new AppError("Holding not found", 404);
  const data = await holdingDataFor({ userId, body, existing });
  return UserHolding.findOneAndUpdate({ _id: holdingId, userId }, { $set: data }, { new: true, runValidators: true });
};

export const deleteHolding = async (userId, holdingId) => {
  const deleted = await UserHolding.findOneAndDelete({ _id: holdingId, userId });
  if (!deleted) throw new AppError("Holding not found", 404);
  return deleted;
};

const startDateFor = (period, now = new Date()) => {
  const date = new Date(now);
  if (period === "YTD") return new Date(date.getFullYear(), 0, 1);
  const amount = Number(period.slice(0, -1));
  const unit = period.at(-1);
  if (unit === "W") date.setDate(date.getDate() - amount * 7);
  if (unit === "M") date.setMonth(date.getMonth() - amount);
  if (unit === "Y") date.setFullYear(date.getFullYear() - amount);
  return date;
};

export const getHistory = async (userId, period) =>
  PortfolioSnapshot.find({ userId, snapshotDate: { $gte: startDateFor(period) } })
    .sort({ snapshotDate: 1 })
    .lean();

// Designed for a scheduled job; dashboard reads do not create historical records.
export const createPortfolioSnapshot = async (userId, snapshotDate = new Date()) => {
  const dashboard = await getDashboard(userId);
  const normalizedDate = new Date(snapshotDate);
  normalizedDate.setHours(0, 0, 0, 0);
  return PortfolioSnapshot.findOneAndUpdate(
    { userId, snapshotDate: normalizedDate },
    {
      $set: {
        totalInvestedAmount: dashboard.portfolio.investedAmount,
        totalCurrentValue: dashboard.portfolio.currentValue,
        categoryValues: dashboard.assets.map((asset) => ({
          categoryId: asset.categoryId, categoryKey: asset.key,
          investedAmount: asset.investedAmount, currentValue: asset.currentValue,
        })),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};
