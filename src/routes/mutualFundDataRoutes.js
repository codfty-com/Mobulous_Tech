import express from "express";
import {
  getAllMutualFundData,
  getMutualFundDataBySchemeCode,
  getMutualFundHistoryBySchemeCode,
  refreshMutualFundData,
  searchMutualFunds,
} from "../controllers/mutualFundData.controller.js";
import { authenticateRequest } from "../middlewares/jwt.js";

const router = express.Router();

// Public routes - No authentication required
router.get("/mutual-funds", searchMutualFunds);
router.get("/mutual-fund-data", getAllMutualFundData);
router.get("/mutual-fund-data/:schemeCode/history", getMutualFundHistoryBySchemeCode);
router.get("/mutual-fund-data/:schemeCode", getMutualFundDataBySchemeCode);

// Protected routes - Authentication required
router.post("/mutual-fund-data/refresh", authenticateRequest, refreshMutualFundData);

export default router;
