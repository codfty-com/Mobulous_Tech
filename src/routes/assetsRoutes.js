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

router.use("/assets", authenticateRequest);
router.get("/assets", validateRequest(getAssetsQuerySchema), getAssets);
router.get("/assets/net-worth", getNetWorth);
router.post("/assets", requireAdmin, validateRequest(createAssetSchema), createAsset);
router.get("/assets/:id", getAssetById);
router.patch("/assets/:id", requireAdmin, validateRequest(updateAssetSchema), updateAsset);
router.put("/assets/:id", requireAdmin, validateRequest(updateAssetSchema), updateAsset);
router.delete("/assets/:id", requireAdmin, deleteAsset);

export default router;
