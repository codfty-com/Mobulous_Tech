import express from "express";
import {
  getTopIndianGainerDetail,
  getTopIndianGainers,
  getTopIndianLoserDetail,
  getTopIndianLosers,
  getTopIndianStocksByPeriod,
} from "../controllers/indianStockMarket.controller.js";

const router = express.Router();

// The configured top-share list contains exactly 99 NSE (.NS) symbols.
// Supported periods: daily, weekly, monthly.
router.get("/indian-market/top-99-stocks/:period", getTopIndianStocksByPeriod);

// These endpoints always use live Yahoo Finance quotes from the configured
// NSE (.NS) universe and return exactly 25 ranked Indian shares.
router.get("/indian-market/top-gainers", getTopIndianGainers);
router.get("/indian-market/top-gainers/:symbol", getTopIndianGainerDetail);
router.get("/indian-market/top-losers", getTopIndianLosers);
router.get("/indian-market/top-losers/:symbol", getTopIndianLoserDetail);

export default router;
