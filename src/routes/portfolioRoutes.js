import express from "express";
import { authenticateRequest, requireAdmin } from "../middlewares/jwt.js";
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
import {
  createAccountSchema,
  createInstrumentSchema,
  updateAccountSchema,
  updateInstrumentSchema,
} from "../validators/portfolioCatalog.validators.js";
import {
  createAccount,
  createInstrument,
  deleteAccount,
  getAccounts,
  getInstruments,
  updateAccount,
  updateInstrument,
} from "../controllers/portfolioCatalog.controller.js";

const router = express.Router();

router.use("/portfolio", authenticateRequest);
router.get("/portfolio/dashboard", getPortfolioDashboard);
router.get("/portfolio/history", validateRequest(historyQuerySchema), getPortfolioHistory);
router.get("/portfolio/categories/:categoryKey", validateRequest(categoryParamsSchema), getPortfolioCategory);
router.get("/portfolio/accounts", getAccounts);
router.post("/portfolio/accounts", validateRequest(createAccountSchema), createAccount);
router.patch("/portfolio/accounts/:accountId", validateRequest(updateAccountSchema), updateAccount);
router.delete("/portfolio/accounts/:accountId", deleteAccount);
router.get("/portfolio/instruments", getInstruments);
router.post("/portfolio/instruments", requireAdmin, validateRequest(createInstrumentSchema), createInstrument);
router.patch("/portfolio/instruments/:instrumentId", requireAdmin, validateRequest(updateInstrumentSchema), updateInstrument);
router.post("/portfolio/holdings", validateRequest(createHoldingSchema), addPortfolioHolding);
router.patch("/portfolio/holdings/:holdingId", validateRequest({ ...holdingParamsSchema, ...updateHoldingSchema }), updatePortfolioHolding);
router.delete("/portfolio/holdings/:holdingId", validateRequest(holdingParamsSchema), removePortfolioHolding);

export default router;
