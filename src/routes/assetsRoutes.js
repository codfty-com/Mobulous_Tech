import express from "express";
import {
  getAssetById,
  getAssets,
  getNetWorth,
} from "../controllers/assets.controller.js";
import { authenticateRequest } from "../middlewares/jwt.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  getAssetsQuerySchema,
} from "../validators/asset.validators.js";

const router = express.Router();

router.use("/assets", authenticateRequest);
router.get("/assets", validateRequest(getAssetsQuerySchema), getAssets);
router.get("/assets/net-worth", getNetWorth);
router.get("/assets/:id", getAssetById);

export default router;
