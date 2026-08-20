import express from "express";
import { authenticateRequest } from "../middlewares/jwt.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  addStockSchema,
  updateStockSchema,
  getStocksQuerySchema,
  bulkUpdatePricesSchema,
  toggleWatchlistSchema,
  setAlertsSchema,
} from "../validators/stock.validators.js";
import {
  addStock,
  getStocks,
  getStockById,
  updateStock,
  deleteStock,
  getPortfolioSummary,
  getWatchlist,
  bulkUpdatePrices,
  toggleWatchlist,
  setAlerts,
} from "../controllers/stock.controller.js";

const router = express.Router();

// All stock routes require authentication
router.use("/stocks", authenticateRequest);

/**
 * @route   POST /api/stocks
 * @desc    Add a new stock to user's collection
 * @access  Private (JWT required)
 */
router.post("/stocks", validateRequest(addStockSchema), addStock);

/**
 * @route   GET /api/stocks
 * @desc    Get all stocks for authenticated user with filtering and pagination
 * @access  Private (JWT required)
 * @query   ?symbol=RELIANCE&sector=Energy&exchange=NSE&watchlist=true&page=1&limit=20&sortBy=symbol&sortOrder=asc
 */
router.get("/stocks", validateRequest(getStocksQuerySchema), getStocks);

/**
 * @route   GET /api/stocks/summary
 * @desc    Get portfolio summary with overall stats and sector breakdown
 * @access  Private (JWT required)
 */
router.get("/stocks/summary", getPortfolioSummary);

/**
 * @route   GET /api/stocks/watchlist
 * @desc    Get user's watchlist stocks only
 * @access  Private (JWT required)
 * @query   ?page=1&limit=20&sortBy=lastUpdated&sortOrder=desc
 */
router.get("/stocks/watchlist", getWatchlist);

/**
 * @route   PATCH /api/stocks/prices
 * @desc    Bulk update current prices for multiple stocks
 * @access  Private (JWT required)
 */
router.patch(
  "/stocks/prices",
  validateRequest(bulkUpdatePricesSchema),
  bulkUpdatePrices
);

/**
 * @route   GET /api/stocks/:id
 * @desc    Get a single stock by ID
 * @access  Private (JWT required)
 */
router.get("/stocks/:id", getStockById);

/**
 * @route   PUT /api/stocks/:id
 * @desc    Update a stock (complete replacement)
 * @access  Private (JWT required)
 */
router.put("/stocks/:id", validateRequest(updateStockSchema), updateStock);

/**
 * @route   PATCH /api/stocks/:id/watchlist
 * @desc    Add/Remove stock from watchlist
 * @access  Private (JWT required)
 */
router.patch(
  "/stocks/:id/watchlist",
  validateRequest(toggleWatchlistSchema),
  toggleWatchlist
);

/**
 * @route   PATCH /api/stocks/:id/alerts
 * @desc    Set price alerts for a stock
 * @access  Private (JWT required)
 */
router.patch(
  "/stocks/:id/alerts",
  validateRequest(setAlertsSchema),
  setAlerts
);

/**
 * @route   DELETE /api/stocks/:id
 * @desc    Delete a stock from user's collection
 * @access  Private (JWT required)
 */
router.delete("/stocks/:id", deleteStock);

export default router;