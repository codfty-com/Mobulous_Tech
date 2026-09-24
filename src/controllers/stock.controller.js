import UserStock from "../models/userStock.js";
import { AppError, sendSuccess, sendError } from "../utils/http.js";
import mongoose from "mongoose";
import { getStockNetWorthHistory } from "../services/stockNetWorth.service.js";
import {
  addStockTransaction,
  stockTransactions,
  calculateHolding,
  stockSymbolFilter,
  withStockSymbolLock,
} from "../services/stockHolding.service.js";

const bodyFor = (req) => req.validated?.body || req.body;
const queryFor = (req) => req.validated?.query || req.query;
const validObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const transactionOptions = ["buy", "sell"];

const getIndianStockExchange = (symbol) => {
  const normalizedSymbol = String(symbol || "")
    .trim()
    .toUpperCase();

  if (normalizedSymbol.endsWith(".NS")) return "NSE";
  if (normalizedSymbol.endsWith(".BO")) return "BSE";

  return null;
};

const getIndianStockIdentityError = ({ symbol, exchange, currency }) => {
  const expectedExchange = getIndianStockExchange(symbol);

  if (!expectedExchange) {
    return "Only Indian NSE (.NS) and BSE (.BO) equity symbols can be added";
  }

  if (exchange !== expectedExchange) {
    return `Exchange must be ${expectedExchange} for ${symbol}`;
  }

  if (currency !== "INR") {
    return "Indian stocks must use INR currency";
  }

  return null;
};

const getRequestUserId = (req, res) => {
  const userId = req.user?.userId;

  if (!validObjectId(userId)) {
    sendError(res, {
      statusCode: 400,
      message: "A valid userId is required",
    });
    return null;
  }

  return userId;
};

const getStockId = (req, res) => {
  const { id } = req.params;

  if (!validObjectId(id)) {
    sendError(res, {
      statusCode: 400,
      message:
        "Invalid stock ID. Use the stock _id returned from GET /api/stocks.",
    });
    return null;
  }

  return id;
};

// Read-only selection check; POST rechecks under a lock when saving a trade.
export const lookupStock = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    if (!userId) return null;
    const { symbol } = queryFor(req);
    const matches = await UserStock.find(stockSymbolFilter(userId, symbol))
      .sort({ createdAt: 1, _id: 1 }).lean();
    const transactions = matches.flatMap(stockTransactions);
    const stock = matches.length
      ? UserStock.hydrate({
          ...matches[0], symbol, transactions, ...calculateHolding(transactions),
        })
      : null;
    return sendSuccess(res, {
      message: stock ? "Existing stock holding found" : "Stock has not been added",
      data: {
        symbol,
        exists: Boolean(stock),
        stock,
        availableQuantity: stock?.quantity ?? 0,
        canBuy: true,
        canSell: (stock?.quantity ?? 0) > 0,
      },
      transactionOptions,
    });
  } catch (error) {
    return sendError(res, {
      statusCode: error.statusCode || 500,
      message: error.statusCode ? error.message : "Failed to look up stock holding",
    });
  }
};

/**
 * Add a transaction to the user's unique stock holding (POST)
 * POST /api/stocks
 */
export const addStock = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);

    if (!userId) return null;

    const stockData = {
      ...bodyFor(req),
      userId,
      lastUpdated: new Date(),
    };

    const identityError = getIndianStockIdentityError(stockData);
    if (identityError) {
      return sendError(res, { statusCode: 400, message: identityError });
    }

    const { stock, created } = await addStockTransaction(userId, stockData);

    return sendSuccess(res, {
      statusCode: created ? 201 : 200,
      message: created
        ? "Stock added successfully"
        : "Stock quantity updated successfully",
      data: stock,
      action: created ? "created" : "updated",
      transactionOptions,
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, {
        statusCode: error.statusCode,
        message: error.message,
      });
    }
    console.error("Add stock error:", error);

    // Handle duplicate stock error
    if (error.code === 11000) {
      return sendError(res, {
        statusCode: 409,
        message:
          "A database uniqueness constraint blocked this stock transaction",
        details: {
          duplicateFields: Object.keys(
            error.keyPattern || error.keyValue || {},
          ),
          action:
            "Retry the request; this user and symbol must have only one stock record",
        },
      });
    }

    if (error.name === "ValidationError") {
      return sendError(res, {
        statusCode: 400,
        message: "Validation failed",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }

    return sendError(res, {
      statusCode: 500,
      message: "Failed to add stock",
    });
  }
};

/**
 * Get all stocks for authenticated user (GET)
 * GET /api/stocks
 */
export const getStocks = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);

    if (!userId) return null;

    const {
      symbol,
      sector,
      exchange,
      transactionType,
      watchlist,
      tags,
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = queryFor(req);

    // Build filter
    const filter = { userId };

    if (symbol) {
      filter.symbol = { $regex: symbol, $options: "i" };
    }

    if (sector) {
      filter.sector = { $regex: sector, $options: "i" };
    }

    if (exchange) {
      filter.exchange = exchange.toUpperCase();
    }

    if (transactionType) {
      filter.$or = [
        { "transactions.transactionType": transactionType },
        { transactions: { $exists: false }, transactionType },
      ];
    }

    if (watchlist !== undefined) {
      filter.watchlist = watchlist === "true";
    }

    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [stocks, total] = await Promise.all([
      UserStock.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      UserStock.countDocuments(filter),
    ]);

    // Calculate portfolio summary
    const portfolioSummary = await UserStock.getUserPortfolioValue(userId);

    return sendSuccess(res, {
      message: "Stocks fetched successfully",
      data: stocks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      summary: portfolioSummary,
      transactionOptions,
    });
  } catch (error) {
    console.error("Get stocks error:", error);
    return sendError(res, {
      statusCode: 500,
      message: "Failed to fetch stocks",
    });
  }
};

/**
 * Get single stock by ID (GET)
 * GET /api/stocks/:id
 */
export const getStockById = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    const id = getStockId(req, res);

    if (!userId || !id) return null;

    const stock = await UserStock.findOne({ _id: id, userId });

    if (!stock) {
      return sendError(res, {
        statusCode: 404,
        message: "Stock not found",
      });
    }

    return sendSuccess(res, {
      message: "Stock fetched successfully",
      data: stock,
      transactionOptions,
    });
  } catch (error) {
    console.error("Get stock by ID error:", error);
    return sendError(res, {
      statusCode: 500,
      message: "Failed to fetch stock",
    });
  }
};

/**
 * Update stock (PUT)
 * PUT /api/stocks/:id
 */
export const updateStock = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    const id = getStockId(req, res);

    if (!userId || !id) return null;

    const existingStock = await UserStock.findOne({ _id: id, userId });
    if (!existingStock) {
      return sendError(res, { statusCode: 404, message: "Stock not found" });
    }

    // Don't allow userId to be changed.
    const updateData = { ...bodyFor(req) };
    delete updateData.userId;
    const { transactionId } = updateData;
    delete updateData.transactionId;
    updateData.lastUpdated = new Date();

    // The request validator normalises a changed symbol to its matching
    // exchange. This additional combined-state check also prevents a caller
    // from changing only exchange/currency and making an existing listing
    // inconsistent.
    if (
      updateData.symbol !== undefined ||
      updateData.exchange !== undefined ||
      updateData.currency !== undefined
    ) {
      const identityError = getIndianStockIdentityError({
        symbol: updateData.symbol ?? existingStock.symbol,
        exchange: updateData.exchange ?? existingStock.exchange,
        currency: updateData.currency ?? existingStock.currency,
      });
      if (identityError) {
        return sendError(res, { statusCode: 400, message: identityError });
      }
    }

    const tradeFields = [
      "quantity",
      "purchasePrice",
      "transactionType",
      "transactionDate",
      "purchaseDate",
    ];
    if (tradeFields.some((key) => updateData[key] !== undefined)) {
      const transactions = stockTransactions(existingStock);
      if (transactions.length > 1 && !transactionId) {
        return sendError(res, {
          statusCode: 409,
          message:
            "Provide transactionId to edit an existing transaction, or use POST /api/stocks to add a buy or sell.",
        });
      }
      const index = transactionId
        ? transactions.findIndex((trade) => String(trade._id) === transactionId)
        : 0;
      if (index < 0)
        return sendError(res, {
          statusCode: 404,
          message: "Stock transaction not found",
        });
      const transaction = { ...transactions[index] };
      for (const key of tradeFields.filter((key) => key !== "purchaseDate")) {
        if (updateData[key] !== undefined) transaction[key] = updateData[key];
      }
      if (updateData.purchaseDate && !updateData.transactionDate)
        transaction.transactionDate = updateData.purchaseDate;
      transactions[index] = transaction;
      updateData.transactions = transactions;
      Object.assign(updateData, calculateHolding(updateData.transactions));
    }

    const saveUpdate = (session) => UserStock.findOneAndUpdate(
      { _id: id, userId, __v: existingStock.__v ?? { $exists: false } },
      { $set: updateData, $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true, ...(session ? { session } : {}) },
    );
    const stock = updateData.symbol && updateData.symbol !== existingStock.symbol
      ? await withStockSymbolLock(userId, updateData.symbol, async (session) => {
          const duplicate = await UserStock.exists({
            ...stockSymbolFilter(userId, updateData.symbol), _id: { $ne: id },
          }).session(session);
          if (duplicate) throw new AppError("This symbol already exists in your stocks. Use POST /api/stocks to add quantity.", 409);
          return saveUpdate(session);
        })
      : await saveUpdate();

    if (!stock) {
      return sendError(res, {
        statusCode: 409,
        message: "Stock changed during this request. Please retry.",
      });
    }

    return sendSuccess(res, {
      message: "Stock updated successfully",
      data: stock,
      transactionOptions,
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, {
        statusCode: error.statusCode,
        message: error.message,
      });
    }
    // Handle duplicate stock error
    if (error.code === 11000) {
      return sendError(res, {
        statusCode: 409,
        message:
          "This symbol already exists in your stocks. Use POST /api/stocks to add quantity.",
        details: {
          duplicateFields: Object.keys(
            error.keyPattern || error.keyValue || {},
          ),
          action: "Use POST /api/stocks to add quantity to an existing symbol",
        },
      });
    }

    if (error.name === "ValidationError") {
      return sendError(res, {
        statusCode: 400,
        message: "Validation failed",
        details: Object.values(error.errors).map((err) => err.message),
      });
    }

    console.error("Update stock error:", error);
    return sendError(res, {
      statusCode: 500,
      message: "Failed to update stock",
    });
  }
};

/**
 * Delete stock (DELETE)
 * DELETE /api/stocks/:id
 */
export const deleteStock = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    const id = getStockId(req, res);

    if (!userId || !id) return null;

    const existingStock = await UserStock.findOne({ _id: id, userId });

    if (!existingStock) {
      return sendError(res, { statusCode: 404, message: "Stock not found" });
    }

    if (
      !existingStock.transactions?.length &&
      existingStock.transactionType === "buy"
    ) {
      const remainingQuantity = await UserStock.getNetQuantity(userId, {
        symbol: existingStock.symbol,
        exchange: existingStock.exchange,
        excludeId: id,
      });
      if (remainingQuantity < 0) {
        return sendError(res, {
          statusCode: 409,
          message:
            "Cannot delete this buy transaction because later sell transactions depend on it",
        });
      }
    }

    const stock = await UserStock.findOneAndDelete({
      _id: id,
      userId,
      __v: existingStock.__v ?? { $exists: false },
    });

    if (!stock) {
      return sendError(res, {
        statusCode: 409,
        message: "Stock changed during this request. Please retry.",
      });
    }

    return sendSuccess(res, {
      message: "Stock deleted successfully",
      data: {
        id: stock._id,
        symbol: stock.symbol,
        name: stock.name,
      },
    });
  } catch (error) {
    console.error("Delete stock error:", error);
    return sendError(res, {
      statusCode: 500,
      message: "Failed to delete stock",
    });
  }
};

/**
 * Get consolidated open stock holdings for the authenticated user.
 * GET /api/stocks/holdings
 */
export const getStockHoldings = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    if (!userId) return null;

    const data = await UserStock.getUserHoldings(userId);
    return sendSuccess(res, {
      message: "Stock holdings fetched successfully",
      data,
      count: data.length,
      summary: UserStock.summarizeHoldings(data),
      transactionOptions,
    });
  } catch (error) {
    console.error("Get stock holdings error:", error);
    return sendError(res, { message: "Failed to fetch stock holdings" });
  }
};

/**
 * Get the authenticated user's stock-only net worth.
 * GET /api/stocks/net-worth
 *
 * The user id is intentionally read only from the verified JWT payload. This
 * prevents a caller from using a query or body parameter to access another
 * user's portfolio value.
 */
export const getStockNetWorth = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    if (!userId) return null;

    const { period = "all" } = queryFor(req);
    const calculatedAt = new Date();
    const [portfolio, transactions] = await Promise.all([
      UserStock.getUserPortfolioValue(userId),
      period === "all"
        ? Promise.resolve([])
        : UserStock.find({ userId })
            .select(
              "symbol quantity purchasePrice transactionType transactionDate transactions",
            )
            .lean(),
    ]);

    const history =
      period === "all"
        ? null
        : await getStockNetWorthHistory({
            transactions: transactions.flatMap((stock) =>
              stockTransactions(stock).map((trade) => ({
                ...trade,
                symbol: stock.symbol,
              })),
            ),
            period,
          });

    const performance = history
      ? history.performance
      : {
          available: true,
          period: "all",
          label: "All time",
          startDate: null,
          endDate: calculatedAt,
          startNetWorth: null,
          endNetWorth: portfolio.totalCurrentValue,
          profitLoss: portfolio.totalProfitLoss,
          profitLossPercentage: portfolio.totalProfitLossPercentage,
        };

    return sendSuccess(res, {
      message: "Stock net worth fetched successfully",
      data: {
        currency: "INR",
        totalNetWorth: portfolio.totalCurrentValue,
        totalHoldingAmount: portfolio.totalHoldingAmount,
        todayChange: portfolio.todayChange,
        todayChangePercentage: portfolio.todayChangePercentage,
        todayChangeStatus: portfolio.todayChangeStatus,
        profitLossStatus: portfolio.profitLossStatus,
        totalInvestedValue: portfolio.totalInvestment,
        totalProfitLoss: portfolio.totalProfitLoss,
        totalProfitLossPercentage: portfolio.totalProfitLossPercentage,
        holdingsCount: portfolio.totalStocks,
        totalQuantity: portfolio.totalQuantity,
        period: performance,
        history: history?.points || [],
        ...(history?.unavailableSymbols?.length
          ? {
              warning:
                "Historical performance excludes symbols whose market-price history is unavailable.",
              unavailableSymbols: history.unavailableSymbols,
            }
          : {}),
        calculatedAt,
      },
    });
  } catch (error) {
    console.error("Get stock net worth error:", error);
    return sendError(res, {
      statusCode: 500,
      message: "Failed to fetch stock net worth",
    });
  }
};

/**
 * Get portfolio summary (GET)
 * GET /api/stocks/summary
 */
export const getPortfolioSummary = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);

    if (!userId) return null;

    const [portfolioValue, sectorBreakdown] = await Promise.all([
      UserStock.getUserPortfolioValue(userId),
      UserStock.getStocksBySector(userId),
    ]);

    return sendSuccess(res, {
      message: "Portfolio summary fetched successfully",
      data: {
        overall: portfolioValue,
        bySector: sectorBreakdown,
      },
    });
  } catch (error) {
    console.error("Get portfolio summary error:", error);
    return sendError(res, {
      statusCode: 500,
      message: "Failed to fetch portfolio summary",
    });
  }
};

/**
 * Get watchlist stocks (GET)
 * GET /api/stocks/watchlist
 */
export const getWatchlist = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);

    if (!userId) return null;

    const {
      page = 1,
      limit = 20,
      sortBy = "lastUpdated",
      sortOrder = "desc",
    } = queryFor(req);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [stocks, total] = await Promise.all([
      UserStock.find({ userId, watchlist: true })
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      UserStock.countDocuments({ userId, watchlist: true }),
    ]);

    return sendSuccess(res, {
      message: "Watchlist fetched successfully",
      data: stocks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get watchlist error:", error);
    return sendError(res, {
      statusCode: 500,
      message: "Failed to fetch watchlist",
    });
  }
};

/**
 * Bulk update current prices (PATCH)
 * PATCH /api/stocks/prices
 */
export const bulkUpdatePrices = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);

    if (!userId) return null;

    const { updates } = bodyFor(req); // Array of { id, currentPrice }

    if (!Array.isArray(updates) || updates.length === 0) {
      return sendError(res, {
        statusCode: 400,
        message: "Updates array is required",
      });
    }

    if (updates.length > 50) {
      return sendError(res, {
        statusCode: 400,
        message: "Cannot update more than 50 stocks at once",
      });
    }

    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id, userId },
        update: {
          $set: {
            currentPrice: update.currentPrice,
            ...(update.previousClose !== undefined ? { previousClose: update.previousClose } : {}),
            lastUpdated: new Date(),
          },
        },
      },
    }));

    const result = await UserStock.bulkWrite(bulkOps);

    return sendSuccess(res, {
      message: "Stock prices updated successfully",
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Bulk update prices error:", error);
    return sendError(res, {
      statusCode: 500,
      message: "Failed to update stock prices",
    });
  }
};

/**
 * Add/Remove stock from watchlist (PATCH)
 * PATCH /api/stocks/:id/watchlist
 */
export const toggleWatchlist = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    const id = getStockId(req, res);
    const { watchlist } = bodyFor(req); // boolean

    if (!userId || !id) return null;

    const stock = await UserStock.findOneAndUpdate(
      { _id: id, userId },
      {
        watchlist: Boolean(watchlist),
        lastUpdated: new Date(),
      },
      { new: true },
    );

    if (!stock) {
      return sendError(res, {
        statusCode: 404,
        message: "Stock not found",
      });
    }

    return sendSuccess(res, {
      message: `Stock ${stock.watchlist ? "added to" : "removed from"} watchlist`,
      data: {
        id: stock._id,
        symbol: stock.symbol,
        watchlist: stock.watchlist,
      },
    });
  } catch (error) {
    console.error("Toggle watchlist error:", error);
    return sendError(res, {
      statusCode: 500,
      message: "Failed to update watchlist",
    });
  }
};

/**
 * Set price alerts for stock (PATCH)
 * PATCH /api/stocks/:id/alerts
 */
export const setAlerts = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    const id = getStockId(req, res);
    const { enabled, targetPrice, stopLoss } = bodyFor(req);

    if (!userId || !id) return null;

    const updateData = { lastUpdated: new Date() };

    if (enabled !== undefined) {
      updateData["alerts.enabled"] = enabled;
    }

    if (targetPrice !== undefined) {
      updateData["alerts.targetPrice"] = targetPrice;
    }

    if (stopLoss !== undefined) {
      updateData["alerts.stopLoss"] = stopLoss;
    }

    const stock = await UserStock.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true },
    );

    if (!stock) {
      return sendError(res, {
        statusCode: 404,
        message: "Stock not found",
      });
    }

    return sendSuccess(res, {
      message: "Price alerts updated successfully",
      data: {
        id: stock._id,
        symbol: stock.symbol,
        alerts: stock.alerts,
      },
    });
  } catch (error) {
    console.error("Set alerts error:", error);
    return sendError(res, {
      statusCode: 500,
      message: "Failed to set price alerts",
    });
  }
};
