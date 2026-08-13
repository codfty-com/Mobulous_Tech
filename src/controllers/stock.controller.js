import UserStock from "../models/userStock.js";
import { sendSuccess, sendError } from "../utils/http.js";
import mongoose from "mongoose";

/**
 * Add a new stock (POST)
 * POST /api/stocks
 */
export const addStock = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const stockData = {
      userId,
      ...req.body,
      lastUpdated: new Date(),
    };

    const stock = new UserStock(stockData);
    await stock.save();

    return sendSuccess(res, {
      statusCode: 201,
      message: "Stock added successfully",
      data: stock,
    });
  } catch (error) {
    console.error("Add stock error:", error);

    // Handle duplicate stock error
    if (error.code === 11000) {
      return sendError(res, {
        statusCode: 409,
        message: "You already have this stock in your collection",
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
    const userId = req.user.userId;
    const {
      symbol,
      sector,
      exchange,
      watchlist,
      tags,
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

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
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid stock ID",
      });
    }

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
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid stock ID",
      });
    }

    // Don't allow userId to be changed
    const updateData = { ...req.body };
    delete updateData.userId;
    updateData.lastUpdated = new Date();

    const stock = await UserStock.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!stock) {
      return sendError(res, {
        statusCode: 404,
        message: "Stock not found",
      });
    }

    return sendSuccess(res, {
      message: "Stock updated successfully",
      data: stock,
    });
  } catch (error) {
    console.error("Update stock error:", error);

    // Handle duplicate stock error
    if (error.code === 11000) {
      return sendError(res, {
        statusCode: 409,
        message: "You already have this stock symbol in your collection",
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
    const userId = req.user.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid stock ID",
      });
    }

    const stock = await UserStock.findOneAndDelete({ _id: id, userId });

    if (!stock) {
      return sendError(res, {
        statusCode: 404,
        message: "Stock not found",
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
 * Get portfolio summary (GET)
 * GET /api/stocks/summary
 */
export const getPortfolioSummary = async (req, res) => {
  try {
    const userId = req.user.userId;

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
    const userId = req.user.userId;
    const { page = 1, limit = 20, sortBy = "lastUpdated", sortOrder = "desc" } = req.query;

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
    const userId = req.user.userId;
    const { updates } = req.body; // Array of { id, currentPrice }

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
    const userId = req.user.userId;
    const { id } = req.params;
    const { watchlist } = req.body; // boolean

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid stock ID",
      });
    }

    const stock = await UserStock.findOneAndUpdate(
      { _id: id, userId },
      { 
        watchlist: Boolean(watchlist),
        lastUpdated: new Date(),
      },
      { new: true }
    );

    if (!stock) {
      return sendError(res, {
        statusCode: 404,
        message: "Stock not found",
      });
    }

    return sendSuccess(res, {
      message: `Stock ${stock.watchlist ? 'added to' : 'removed from'} watchlist`,
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
    const userId = req.user.userId;
    const { id } = req.params;
    const { enabled, targetPrice, stopLoss } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid stock ID",
      });
    }

    const updateData = {
      'alerts.enabled': Boolean(enabled),
      lastUpdated: new Date(),
    };

    if (targetPrice !== undefined) {
      updateData['alerts.targetPrice'] = targetPrice;
    }

    if (stopLoss !== undefined) {
      updateData['alerts.stopLoss'] = stopLoss;
    }

    const stock = await UserStock.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true }
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