import mongoose from "mongoose";
import Asset from "../models/asset.js";
import UserStock from "../models/userStock.js";
import UserMutualFund from "../models/userMutualFund.js";
import { sendError, sendSuccess } from "../utils/http.js";
import { getDashboard } from "../services/portfolio.service.js";

const bodyFor = (req) => req.validated?.body || req.body;
const queryFor = (req) => req.validated?.query || req.query;

const assetIdFor = (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) return req.params.id;
  sendError(res, { statusCode: 400, message: "Invalid asset ID" });
  return null;
};

const assetError = (res, error, fallbackMessage) => {
  console.error(`${fallbackMessage}:`, error);
  if (error.code === 11000) {
    return sendError(res, {
      statusCode: 409,
      message: "An asset with this key or assetId already exists",
    });
  }
  if (error.name === "ValidationError") {
    return sendError(res, {
      statusCode: 400,
      message: "Validation failed",
      details: Object.values(error.errors).map((item) => item.message),
    });
  }
  return sendError(res, { message: fallbackMessage });
};

export const getAssets = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!mongoose.isValidObjectId(userId)) {
      return sendError(res, { statusCode: 400, message: "A valid authenticated user is required" });
    }

    const { status, isActive } = queryFor(req);
    const filter = {};
    if (status) filter.status = status;
    if (isActive !== undefined) filter.isActive = isActive;

    const [categories, dashboard] = await Promise.all([
      Asset.find(filter).sort({ displayOrder: 1, name: 1 }),
      getDashboard(userId),
    ]);
    const valuesByCategoryId = new Map(
      dashboard.assets.map((asset) => [asset.categoryId, asset]),
    );
    const data = categories.map((category) => {
      const values = valuesByCategoryId.get(String(category._id));
      const categoryData = category.toJSON();
      const financialValues = values || {
        holdingCount: 0,
        investedAmount: 0,
        currentValue: 0,
        totalGain: 0,
        todayChange: 0,
        returnPercentage: 0,
      };

      return {
        ...categoryData,
        ...financialValues,
        // Convenient mobile-list alias. This is calculated per authenticated
        // user and is never stored on the asset-category master document.
        holdingAmount: financialValues.currentValue,
      };
    });

    return sendSuccess(res, {
      message: "Assets with holding amounts fetched successfully",
      data,
      count: data.length,
      portfolio: dashboard.portfolio,
      ...(status ? { status } : {}),
    });
  } catch (error) {
    return assetError(res, error, "Failed to fetch assets");
  }
};

export const getAssetById = async (req, res) => {
  try {
    const id = assetIdFor(req, res);
    if (!id) return null;
    const data = await Asset.findById(id);
    return data
      ? sendSuccess(res, { message: "Asset fetched successfully", data })
      : sendError(res, { statusCode: 404, message: "Asset not found" });
  } catch (error) {
    return assetError(res, error, "Failed to fetch asset");
  }
};

export const createAsset = async (req, res) => {
  try {
    const data = await Asset.create({
      ...bodyFor(req),
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    });
    return sendSuccess(res, { statusCode: 201, message: "Asset created successfully", data });
  } catch (error) {
    return assetError(res, error, "Failed to create asset");
  }
};

export const updateAsset = async (req, res) => {
  try {
    const id = assetIdFor(req, res);
    if (!id) return null;
    const data = await Asset.findByIdAndUpdate(
      id,
      { $set: { ...bodyFor(req), updatedBy: req.user.userId } },
      { new: true, runValidators: true },
    );
    return data
      ? sendSuccess(res, { message: "Asset updated successfully", data })
      : sendError(res, { statusCode: 404, message: "Asset not found" });
  } catch (error) {
    return assetError(res, error, "Failed to update asset");
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const id = assetIdFor(req, res);
    if (!id) return null;
    const data = await Asset.findByIdAndDelete(id);
    return data
      ? sendSuccess(res, {
          message: "Asset deleted successfully",
          data: { id: data._id, key: data.key, name: data.name },
        })
      : sendError(res, { statusCode: 404, message: "Asset not found" });
  } catch (error) {
    return assetError(res, error, "Failed to delete asset");
  }
};

const emptySummary = () => ({ investedValue: 0, currentValue: 0, holdingsCount: 0 });

export const getNetWorth = async (req, res) => {
  try {
    const requestedUserId = req.query.userId || req.user.userId;
    if (!mongoose.isValidObjectId(requestedUserId)) {
      return sendError(res, { statusCode: 400, message: "A valid userId is required" });
    }
    if (String(requestedUserId) !== String(req.user.userId) && !req.user.admin) {
      return sendError(res, { statusCode: 403, message: "You can only view your own net worth" });
    }

    const userId = new mongoose.Types.ObjectId(requestedUserId);
    const [stockPortfolio, mutualFundResult] = await Promise.all([
      UserStock.getUserPortfolioValue(requestedUserId),
      UserMutualFund.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            investedValue: { $sum: { $ifNull: ["$investedAmount", 0] } },
            currentValue: {
              $sum: {
                $cond: [
                  { $ne: [{ $ifNull: ["$currentNav", null] }, null] },
                  { $multiply: [{ $ifNull: ["$currentNav", 0] }, { $ifNull: ["$units", 0] }] },
                  { $ifNull: ["$investedAmount", 0] },
                ],
              },
            },
            holdingsCount: { $sum: 1 },
          },
        },
        { $project: { _id: 0, investedValue: 1, currentValue: 1, holdingsCount: 1 } },
      ]),
    ]);

    const stocks = {
      investedValue: stockPortfolio.totalInvestment,
      currentValue: stockPortfolio.totalCurrentValue,
      holdingsCount: stockPortfolio.totalStocks,
      quantity: stockPortfolio.totalQuantity,
      transactionCount: stockPortfolio.totalTransactions,
      buyTransactions: stockPortfolio.buyTransactions,
      sellTransactions: stockPortfolio.sellTransactions,
    };
    const mutualFunds = mutualFundResult[0] || emptySummary();
    const withReturns = (summary) => ({
      ...summary,
      profitLoss: summary.currentValue - summary.investedValue,
      profitLossPercentage: summary.investedValue
        ? ((summary.currentValue - summary.investedValue) / summary.investedValue) * 100
        : 0,
    });
    const totalInvestedValue = stocks.investedValue + mutualFunds.investedValue;
    const totalNetWorth = stocks.currentValue + mutualFunds.currentValue;
    const totalProfitLoss = totalNetWorth - totalInvestedValue;

    return sendSuccess(res, {
      message: "Net worth fetched successfully",
      data: {
        userId: String(requestedUserId),
        currency: "INR",
        totalNetWorth,
        totalInvestedValue,
        totalProfitLoss,
        totalProfitLossPercentage: totalInvestedValue
          ? (totalProfitLoss / totalInvestedValue) * 100
          : 0,
        holdingsCount: stocks.holdingsCount + mutualFunds.holdingsCount,
        breakdown: {
          stocks: withReturns(stocks),
          mutualFunds: withReturns(mutualFunds),
        },
        calculatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to calculate net worth:", error);
    return sendError(res, { message: "Failed to calculate net worth" });
  }
};
