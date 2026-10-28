import express from "express";
import {
  getAllMutualFundData,
  getMutualFundDataBySchemeCode,
  getMutualFundHistoryBySchemeCode,
  searchMutualFunds,
} from "../controllers/mutualFundData.controller.js";
import { authenticateRequest } from "../middlewares/jwt.js";

const router = express.Router();

// Match the stock search flow: a query makes this a public instrument lookup.
// Requests without a search query continue to the authenticated portfolio
// router, which owns GET/POST /api/mutual-funds.
router.get("/mutual-funds", (req, res, next) => {
  if (req.query.query || req.query.search) return searchMutualFunds(req, res, next);
  return next();
});

router.use("/mutual-fund-data", authenticateRequest);
router.get("/mutual-fund-data", getAllMutualFundData);
router.get("/mutual-fund-data/:schemeCode/history", getMutualFundHistoryBySchemeCode);
router.get("/mutual-fund-data/:schemeCode", getMutualFundDataBySchemeCode);

export default router;
