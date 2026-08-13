import express from "express";
import { authenticateRequest } from "../middlewares/jwt.js";
import {
  refreshToken,
  revokeToken,
  logoutAll,
  cleanupTokens,
  getCurrentUser,
} from "../controllers/auth.controller.js";

const router = express.Router();

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post("/auth/refresh-token", refreshToken);

/**
 * @route   POST /api/auth/revoke-token
 * @desc    Revoke a specific refresh token (logout from this device)
 * @access  Public
 */
router.post("/auth/revoke-token", revokeToken);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Revoke all refresh tokens for authenticated user (logout from all devices)
 * @access  Private (JWT required)
 */
router.post("/auth/logout-all", authenticateRequest, logoutAll);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user info
 * @access  Private (JWT required)
 */
router.get("/auth/me", authenticateRequest, getCurrentUser);

/**
 * @route   POST /api/auth/cleanup-tokens
 * @desc    Clean up expired tokens (maintenance endpoint)
 * @access  Public (should be restricted in production)
 */
router.post("/auth/cleanup-tokens", cleanupTokens);

export default router;
