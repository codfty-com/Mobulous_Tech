import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import RefreshToken from "../models/refreshToken.js";
import crypto from "crypto";

/**
 * Generate Access Token (short-lived)
 * @param {Object} payload - { userId, email, name, admin }
 * @returns {string} JWT access token
 */
export const generateAccessToken = (payload) => {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    admin: payload.admin || false,
    type: "access",
  };

  return jwt.sign(tokenPayload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    issuer: env.appName,
    subject: String(payload.userId),
  });
};

/**
 * Generate Refresh Token (long-lived)
 * @param {Object} payload - { userId, email, name, admin }
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  if (!env.jwtRefreshSecret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  // Generate a unique token identifier
  const jti = crypto.randomBytes(32).toString("hex");

  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    admin: payload.admin || false,
    type: "refresh",
    jti, // JWT ID for token tracking
  };

  return jwt.sign(tokenPayload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
    issuer: env.appName,
    subject: String(payload.userId),
  });
};

/**
 * Verify Access Token
 * @param {string} token - JWT access token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export const verifyAccessToken = (token) => {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret, {
      issuer: env.appName,
    });

    if (decoded.type !== "access") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Access token has expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid access token");
    }
    throw error;
  }
};

/**
 * Verify Refresh Token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export const verifyRefreshToken = (token) => {
  if (!env.jwtRefreshSecret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  try {
    const decoded = jwt.verify(token, env.jwtRefreshSecret, {
      issuer: env.appName,
    });

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Refresh token has expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid refresh token");
    }
    throw error;
  }
};

/**
 * Calculate token expiry date
 * @param {string} expiresIn - Expiry duration (e.g., '15m', '7d')
 * @returns {Date} Expiry date
 */
const calculateExpiryDate = (expiresIn) => {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([smhd])$/);

  if (!match) {
    // Default to 7 days if format is invalid
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const [, value, unit] = match;
  const amount = parseInt(value, 10);

  const multipliers = {
    s: 1000, // seconds
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
  };

  return new Date(now.getTime() + amount * multipliers[unit]);
};

/**
 * Save Refresh Token to Database
 * @param {string} userId - User ID
 * @param {string} token - Refresh token string
 * @param {Object} deviceInfo - Device information { userAgent, ip }
 * @returns {Promise<Object>} Saved refresh token document
 */
export const saveRefreshToken = async (userId, token, deviceInfo = {}) => {
  const expiresAt = calculateExpiryDate(env.jwtRefreshExpiresIn);

  const refreshToken = new RefreshToken({
    userId,
    token,
    expiresAt,
    deviceInfo: {
      userAgent: deviceInfo.userAgent || "Unknown",
      ip: deviceInfo.ip || "Unknown",
    },
    lastUsedAt: new Date(),
  });

  await refreshToken.save();

  // Keep only the latest 5 refresh tokens per user (revoke older ones)
  await RefreshToken.revokeOldTokens(userId, 5);

  return refreshToken;
};

/**
 * Validate Refresh Token from Database
 * @param {string} token - Refresh token string
 * @returns {Promise<Object|null>} Refresh token document or null
 */
export const validateRefreshTokenInDb = async (token) => {
  const refreshToken = await RefreshToken.findOne({ token, isRevoked: false });

  if (!refreshToken) {
    return null;
  }

  if (!refreshToken.isValid()) {
    return null;
  }

  // Update last used timestamp
  refreshToken.lastUsedAt = new Date();
  await refreshToken.save();

  return refreshToken;
};

/**
 * Revoke Refresh Token
 * @param {string} token - Refresh token string
 * @returns {Promise<boolean>} True if revoked successfully
 */
export const revokeRefreshToken = async (token) => {
  const result = await RefreshToken.updateOne(
    { token, isRevoked: false },
    { $set: { isRevoked: true } }
  );

  return result.modifiedCount > 0;
};

/**
 * Revoke All Refresh Tokens for a User
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of tokens revoked
 */
export const revokeAllUserTokens = async (userId) => {
  return await RefreshToken.revokeAllForUser(userId);
};

/**
 * Generate Both Access and Refresh Tokens
 * @param {Object} user - User object { _id, email, name, admin }
 * @param {Object} deviceInfo - Device information { userAgent, ip }
 * @returns {Promise<Object>} { accessToken, refreshToken, expiresIn }
 */
export const generateTokenPair = async (user, deviceInfo = {}) => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    admin: user.admin || false,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Save refresh token to database
  await saveRefreshToken(user._id, refreshToken, deviceInfo);

  return {
    accessToken,
    refreshToken,
    expiresIn: env.jwtExpiresIn,
    tokenType: "Bearer",
  };
};

/**
 * Refresh Access Token using Refresh Token
 * @param {string} refreshToken - Refresh token string
 * @param {Object} deviceInfo - Device information { userAgent, ip }
 * @returns {Promise<Object>} { accessToken, refreshToken, expiresIn }
 * @throws {Error} If refresh token is invalid
 */
export const refreshAccessToken = async (refreshToken, deviceInfo = {}) => {
  // Verify JWT signature and expiry
  const decoded = verifyRefreshToken(refreshToken);

  // Validate token in database (not revoked)
  const dbToken = await validateRefreshTokenInDb(refreshToken);

  if (!dbToken) {
    throw new Error("Refresh token is invalid or has been revoked");
  }

  // Generate new access token
  const accessToken = generateAccessToken({
    userId: decoded.userId,
    email: decoded.email,
    name: decoded.name,
    admin: decoded.admin || false,
  });

  // Optionally: Generate new refresh token (refresh token rotation)
  // For now, we'll keep the same refresh token
  // To implement rotation, uncomment below and revoke old token:
  /*
  const newRefreshToken = generateRefreshToken({
    userId: decoded.userId,
    email: decoded.email,
  });
  
  await saveRefreshToken(decoded.userId, newRefreshToken, deviceInfo);
  await revokeRefreshToken(refreshToken);
  
  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: env.jwtExpiresIn,
    tokenType: "Bearer",
  };
  */

  return {
    accessToken,
    refreshToken, // Keep same refresh token
    expiresIn: env.jwtExpiresIn,
    tokenType: "Bearer",
  };
};

/**
 * Decode Token Without Verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token or null
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};

/**
 * Clean up expired refresh tokens
 * @returns {Promise<number>} Number of tokens deleted
 */
export const cleanupExpiredTokens = async () => {
  return await RefreshToken.cleanupExpired();
};
