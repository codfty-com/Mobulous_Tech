import express from "express";
import {
  getAllMarketData,
  getAvailableMarkets,
  getMarketDataByKey,
  refreshMarketData,
} from "../controllers/marketData.controller.js";

const router = express.Router();

router.get("/markets", getAvailableMarkets);
router.get("/market-data", getAllMarketData);
router.get("/market-data/:marketKey", getMarketDataByKey);
router.post("/market-data/refresh", refreshMarketData);

export default router;
