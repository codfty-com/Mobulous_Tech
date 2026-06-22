import express from "express";
import {
  getAllMutualFundData,
  getMutualFundDataBySchemeCode,
  getMutualFundHistoryBySchemeCode,
  refreshMutualFundData,
  searchMutualFunds,
} from "../controllers/mutualFundData.controller.js";

const router = express.Router();

router.get("/mutual-funds", searchMutualFunds);
router.get("/mutual-fund-data", getAllMutualFundData);
router.get("/mutual-fund-data/:schemeCode/history", getMutualFundHistoryBySchemeCode);
router.get("/mutual-fund-data/:schemeCode", getMutualFundDataBySchemeCode);
router.post("/mutual-fund-data/refresh", refreshMutualFundData);

export default router;
