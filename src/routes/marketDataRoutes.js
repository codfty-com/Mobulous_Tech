import express from "express";
import {
  getAllMarketData,
  getAvailableMarketCollections,
  getAvailableMarkets,
  getLiveMarketNews,
  getMarketDataByKey,
  getMarketHome,
  getMarketDataOverview,
  getMarketMoverById,
  getMarketMovers,
  getMarketNews,
  getMarketNewsBySymbol,
  getRelatedMarketNews,
  getTopGainerById,
  getTopGainerDetailsList,
  getTopLoserById,
  getTopShareMarkets,
  getTrendingSymbols,
  refreshMarketData,
  searchStocks,
} from "../controllers/marketData.controller.js";
import { authenticateRequest } from "../middlewares/jwt.js";

const router = express.Router();

router.use(authenticateRequest);
router.get("/markets", getAvailableMarkets);
// Symbol search continues to the stock router when no search term is given.
router.get("/stocks", (req, res, next) => {
  if (req.query.query || req.query.search) return searchStocks(req, res, next);
  return next();
});
router.get("/market-trend-lists", getAvailableMarketCollections);
router.get("/market-data", getAllMarketData);
router.get("/market-data/trending", getTrendingSymbols);
router.get("/market-data/movers", getMarketMovers);
router.get("/market-data/movers/:listId/:id", getMarketMoverById);
router.get("/market-data/top-gainers/details", getTopGainerDetailsList);
router.get("/market-data/top-gainers/:id", getTopGainerById);
router.get("/market-data/top-losers/:id", getTopLoserById);
router.get("/market-data/top-shares", getTopShareMarkets);
router.get("/market-data/top-shares/:period", getTopShareMarkets);
router.get("/market-data/overview", getMarketDataOverview);
router.get("/market-data/home", getMarketHome);
router.get("/market-data/:marketKey", getMarketDataByKey);
router.get("/market-news", getMarketNews);
router.get("/market-news/live", getLiveMarketNews);
router.get("/market-news/related", getRelatedMarketNews);
router.get("/market-news/symbol/:symbol", getMarketNewsBySymbol);

router.post("/market-data/refresh", refreshMarketData);

export default router;


