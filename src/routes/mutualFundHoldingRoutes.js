import express from "express";
import { authenticateRequest } from "../middlewares/jwt.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  addMutualFundHoldingSchema,
  bulkUpdateMutualFundNavsSchema,
  getMutualFundHoldingsQuerySchema,
  lookupMutualFundSchema,
  mutualFundSchemeParamsSchema,
  updateMutualFundHoldingSchema,
} from "../validators/mutualFundHolding.validators.js";
import {
  addMutualFundHolding,
  bulkUpdateMutualFundNavs,
  deleteMutualFundHolding,
  getMutualFundBySchemeCode,
  getMutualFundHoldingById,
  getMutualFundHoldings,
  getMutualFundPortfolioSummary,
  getOpenMutualFundHoldings,
  lookupMutualFund,
  updateMutualFundHolding,
} from "../controllers/mutualFundHolding.controller.js";

const router = express.Router();

// `/mutual-fund-holdings` remains available for existing clients. The new
// `/mutual-funds` portfolio routes mirror the stock flow and deliberately do
// not expose watchlist endpoints.
router.use(["/mutual-funds", "/mutual-fund-holdings"], authenticateRequest);

router.post("/mutual-funds", validateRequest(addMutualFundHoldingSchema), addMutualFundHolding);
router.get("/mutual-funds", validateRequest(getMutualFundHoldingsQuerySchema), getMutualFundHoldings);
router.get("/mutual-funds/lookup", validateRequest(lookupMutualFundSchema), lookupMutualFund);
router.get("/mutual-funds/summary", getMutualFundPortfolioSummary);
router.get("/mutual-funds/holdings", getOpenMutualFundHoldings);
router.patch("/mutual-funds/navs", validateRequest(bulkUpdateMutualFundNavsSchema), bulkUpdateMutualFundNavs);
router.get("/mutual-funds/scheme/:schemeCode", validateRequest(mutualFundSchemeParamsSchema), getMutualFundBySchemeCode);
router.get("/mutual-funds/:id", getMutualFundHoldingById);
router.patch("/mutual-funds/:id", validateRequest(updateMutualFundHoldingSchema), updateMutualFundHolding);
router.put("/mutual-funds/:id", validateRequest(updateMutualFundHoldingSchema), updateMutualFundHolding);
router.delete("/mutual-funds/:id", deleteMutualFundHolding);

router.post("/mutual-fund-holdings", validateRequest(addMutualFundHoldingSchema), addMutualFundHolding);
router.get("/mutual-fund-holdings", validateRequest(getMutualFundHoldingsQuerySchema), getMutualFundHoldings);
router.get("/mutual-fund-holdings/:id", getMutualFundHoldingById);
router.patch("/mutual-fund-holdings/:id", validateRequest(updateMutualFundHoldingSchema), updateMutualFundHolding);
router.put("/mutual-fund-holdings/:id", validateRequest(updateMutualFundHoldingSchema), updateMutualFundHolding);
router.delete("/mutual-fund-holdings/:id", deleteMutualFundHolding);

export default router;
