import express from "express";
import {
  getAllMutualFundData,
  getMutualFundDataBySchemeCode,
  getMutualFundHistoryBySchemeCode,
  searchMutualFunds,
} from "../controllers/mutualFundData.controller.js";
import { authenticateRequest } from "../middlewares/jwt.js";

const router = express.Router();

router.use(["/mutual-funds", "/mutual-fund-data"], authenticateRequest);
router.get("/mutual-funds", searchMutualFunds);
router.get("/mutual-fund-data", getAllMutualFundData);
router.get("/mutual-fund-data/:schemeCode/history", getMutualFundHistoryBySchemeCode);
router.get("/mutual-fund-data/:schemeCode", getMutualFundDataBySchemeCode);

export default router;
