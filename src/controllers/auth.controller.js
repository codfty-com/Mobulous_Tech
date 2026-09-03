import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { sendSuccess, sendError } from "../utils/http.js";
import {
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  verifyRefreshToken,
} from "../services/jwt.service.js";

const EMAIL_PASSWORD_METHOD = "email_password";
const AUTH_COOKIE_NAMES = [
  "accessToken",
  "refreshToken",
  "token",
  "user",
  "userDetails",
];

const clearAuthCookies = (res) => {
  for (const cookieName of AUTH_COOKIE_NAMES) {
    res.clearCookie(cookieName, { path: "/" });
  }
};

/**
 * Refresh Access Token using Refresh Token
 * POST /api/auth/refresh-token
 */
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken?.trim();

    if (!refreshToken) {
      return sendError(res, {
        statusCode: 400,
        message: "Refresh token is required",
      });
    }

    // Get device info
    const deviceInfo = {
      userAgent: req.get("user-agent") || "Unknown",
      ip: req.ip || req.connection.remoteAddress || "Unknown",
    };

    // Refresh the access token
    const tokens = await refreshAccessToken(refreshToken, deviceInfo);

    return sendSuccess(res, {
      message: "Access token refreshed successfully",
      data: tokens,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    const statusCode = error.message.includes("expired")
      ? 401
      : error.message.includes("invalid") || error.message.includes("revoked")
      ? 401
      : 500;

    return sendError(res, {
      statusCode,
      message: error.message || "Failed to refresh access token",
    });
  }
};

/**
 * Revoke a specific refresh token (logout from this device)
 * POST /api/auth/revoke-token
 */
export const revokeToken = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken?.trim();

    if (!refreshToken) {
      return sendError(res, {
        statusCode: 400,
        message: "Refresh token is required",
      });
    }

    const revoked = await revokeRefreshToken(refreshToken);

    if (!revoked) {
      return sendError(res, {
        statusCode: 404,
        message: "Refresh token not found or already revoked",
      });
    }

    return sendSuccess(res, {
      message: "Token revoked successfully. You have been logged out.",
    });
  } catch (error) {
    console.error("Revoke token error:", error);

    return sendError(res, {
      statusCode: 500,
      message: "Failed to revoke token",
    });
  }
};

/**
 * Logout current user session
 * POST /api/auth/logout
 * Requires JWT authentication
 */
export const logout = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const refreshToken = req.body.refreshToken?.trim();
    let refreshTokenRevoked = false;

    if (!userId) {
      return sendError(res, {
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    if (refreshToken) {
      const decodedRefreshToken = verifyRefreshToken(refreshToken);

      if (String(decodedRefreshToken.userId) !== String(userId)) {
        return sendError(res, {
          statusCode: 403,
          message: "Refresh token does not belong to authenticated user",
        });
      }

      refreshTokenRevoked = await revokeRefreshToken(refreshToken);
    }

    clearAuthCookies(res);

    return sendSuccess(res, {
      message: "Logout successful",
      data: {
        refreshTokenRevoked,
        clearClientStorage: true,
      },
    });
  } catch (error) {
    console.error("Logout error:", error);

    const isRefreshTokenError = /refresh token|token type/i.test(
      error.message || "",
    );

    return sendError(res, {
      statusCode: isRefreshTokenError ? 401 : 500,
      message: isRefreshTokenError
        ? "Invalid or expired refresh token"
        : "Failed to logout",
    });
  }
};

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 * POST /api/auth/logout-all
 * Requires JWT authentication
 */
export const logoutAll = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return sendError(res, {
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const revokedCount = await revokeAllUserTokens(userId);

    return sendSuccess(res, {
      message: `Successfully logged out from all devices. ${revokedCount} session(s) terminated.`,
      data: {
        revokedCount,
      },
    });
  } catch (error) {
    console.error("Logout all error:", error);

    return sendError(res, {
      statusCode: 500,
      message: "Failed to logout from all devices",
    });
  }
};

/**
 * Clean up expired tokens (admin/maintenance endpoint)
 * POST /api/auth/cleanup-tokens
 */
export const cleanupTokens = async (req, res) => {
  try {
    const deletedCount = await cleanupExpiredTokens();

    return sendSuccess(res, {
      message: `Cleanup completed. ${deletedCount} expired token(s) removed.`,
      data: {
        deletedCount,
      },
    });
  } catch (error) {
    console.error("Cleanup tokens error:", error);

    return sendError(res, {
      statusCode: 500,
      message: "Failed to cleanup expired tokens",
    });
  }
};

/**
 * Get current user info from access token
 * GET /api/auth/me
 * Requires JWT authentication
 */
export const getCurrentUser = async (req, res) => {
  try {
    // User info is already in req.user from JWT middleware
    return sendSuccess(res, {
      message: "User info fetched successfully",
      data: req.user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return sendError(res, {
      statusCode: 500,
      message: "Failed to fetch user info",
    });
  }
};

/**
 * Change password for authenticated email/password user
 * POST /api/auth/change-password
 * Requires JWT authentication
 */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { oldPassword, newPassword } = req.validated?.body || req.body;

    if (!userId) {
      return sendError(res, {
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return sendError(res, {
        statusCode: 404,
        message: "User not found",
      });
    }

    if (!user.authMethods?.includes(EMAIL_PASSWORD_METHOD) || !user.password) {
      return sendError(res, {
        statusCode: 400,
        message:
          "Password change is available only for email/password accounts.",
      });
    }

    const isOldPasswordCorrect = await bcrypt.compare(
      oldPassword,
      user.password,
    );

    if (!isOldPasswordCorrect) {
      return sendError(res, {
        statusCode: 400,
        message: "Old password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpiry = null;
    user.lastLoginMethod = EMAIL_PASSWORD_METHOD;

    await user.save();

    return sendSuccess(res, {
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return sendError(res, {
      statusCode: 500,
      message: "Failed to change password",
    });
  }
};
