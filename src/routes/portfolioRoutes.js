import express from "express";
import { authenticateRequest } from "../middlewares/jwt.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  addPortfolioHolding,
  getPortfolioCategory,
  getPortfolioDashboard,
  getPortfolioHistory,
  removePortfolioHolding,
  updatePortfolioHolding,
} from "../controllers/portfolio.controller.js";
import {
  categoryParamsSchema,
  createHoldingSchema,
  historyQuerySchema,
  holdingParamsSchema,
  updateHoldingSchema,
} from "../validators/portfolio.validators.js";

const router = express.Router();

router.use("/portfolio", authenticateRequest);
router.get("/portfolio/dashboard", getPortfolioDashboard);
router.get("/portfolio/history", validateRequest(historyQuerySchema), getPortfolioHistory);
router.get("/portfolio/categories/:categoryKey", validateRequest(categoryParamsSchema), getPortfolioCategory);
router.post("/portfolio/holdings", validateRequest(createHoldingSchema), addPortfolioHolding);
router.patch("/portfolio/holdings/:holdingId", validateRequest({ ...holdingParamsSchema, ...updateHoldingSchema }), updatePortfolioHolding);
router.delete("/portfolio/holdings/:holdingId", validateRequest(holdingParamsSchema), removePortfolioHolding);

export default router;
