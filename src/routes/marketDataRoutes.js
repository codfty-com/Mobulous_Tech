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

const router = express.Router();

router.get("/markets", getAvailableMarkets);
router.get("/stocks", searchStocks);
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
router.post("/market-data/refresh", refreshMarketData);
router.get("/market-news", getMarketNews);
router.get("/market-news/live", getLiveMarketNews);
router.get("/market-news/related", getRelatedMarketNews);
router.get("/market-news/symbol/:symbol", getMarketNewsBySymbol);

export default router;


