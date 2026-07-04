import express from "express";
import {
  getAllMarketData,
  getAvailableMarketCollections,
  getAvailableMarkets,
  getLiveMarketNews,
  getMarketDataByKey,
  getMarketHome,
  getMarketDataOverview,
  getMarketMovers,
  getMarketNews,
  getMarketNewsBySymbol,
  getRelatedMarketNews,
  getTopShareMarkets,
  getTrendingSymbols,
  refreshMarketData,
} from "../controllers/marketData.controller.js";

const router = express.Router();

router.get("/markets", getAvailableMarkets);
router.get("/market-trend-lists", getAvailableMarketCollections);
router.get("/market-data", getAllMarketData);
router.get("/market-data/trending", getTrendingSymbols);
router.get("/market-data/movers", getMarketMovers);
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
