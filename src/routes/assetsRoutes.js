import express from "express";
import {
  createAsset,
  deleteAsset,
  getAssetById,
  getAssets,
  getNetWorth,
  updateAsset,
} from "../controllers/assets.controller.js";
import { authenticateRequest, requireAdmin } from "../middlewares/jwt.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  createAssetSchema,
  getAssetsQuerySchema,
  updateAssetSchema,
} from "../validators/asset.validators.js";

const router = express.Router();

router.get("/assets", validateRequest(getAssetsQuerySchema), getAssets);
router.get("/assets/net-worth", authenticateRequest, getNetWorth);
router.post("/assets", authenticateRequest, requireAdmin, validateRequest(createAssetSchema), createAsset);
router.get("/assets/:id", getAssetById);
router.patch("/assets/:id", authenticateRequest, requireAdmin, validateRequest(updateAssetSchema), updateAsset);
router.put("/assets/:id", authenticateRequest, requireAdmin, validateRequest(updateAssetSchema), updateAsset);
router.delete("/assets/:id", authenticateRequest, requireAdmin, deleteAsset);

export default router;
