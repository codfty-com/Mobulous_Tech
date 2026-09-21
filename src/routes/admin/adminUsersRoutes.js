import express from "express";
import {
  getAllUsers,
  permanentlyDeleteUserById,
  softDeleteUserById,
} from "../../controllers/adminUsers.controller.js";
import { getUserProfileById } from "../../controllers/userProfileController.js";
import { authenticateRequest, requireAdmin } from "../../middlewares/jwt.js";

const router = express.Router();

// Mounted by adminRoutes at /admin/users.
router.use(authenticateRequest, requireAdmin);
router.get("/", getAllUsers);
router.get("/:_id", getUserProfileById);
router.delete("/:_id", softDeleteUserById);
router.delete("/:_id/permanent", permanentlyDeleteUserById);

export default router;
