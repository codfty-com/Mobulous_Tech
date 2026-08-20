import express from "express";
import { authenticateRequest } from "../middlewares/jwt.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  addMutualFundHoldingSchema,
  getMutualFundHoldingsQuerySchema,
  updateMutualFundHoldingSchema,
} from "../validators/mutualFundHolding.validators.js";
import {
  addMutualFundHolding,
  deleteMutualFundHolding,
  getMutualFundHoldingById,
  getMutualFundHoldings,
  updateMutualFundHolding,
} from "../controllers/mutualFundHolding.controller.js";

const router = express.Router();

// Scope authentication to this resource. The router is mounted both at `/`
// and `/api`, so unscoped middleware would otherwise intercept unrelated
// routes such as `/api/create-user` during the root-router pass.
router.use("/mutual-fund-holdings", authenticateRequest);
router.post("/mutual-fund-holdings", validateRequest(addMutualFundHoldingSchema), addMutualFundHolding);
router.get("/mutual-fund-holdings", validateRequest(getMutualFundHoldingsQuerySchema), getMutualFundHoldings);
router.get("/mutual-fund-holdings/:id", getMutualFundHoldingById);
router.patch("/mutual-fund-holdings/:id", validateRequest(updateMutualFundHoldingSchema), updateMutualFundHolding);
router.put("/mutual-fund-holdings/:id", validateRequest(updateMutualFundHoldingSchema), updateMutualFundHolding);
router.delete("/mutual-fund-holdings/:id", deleteMutualFundHolding);

export default router;
