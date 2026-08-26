import { verifyAccessToken } from "../services/jwt.service.js";
import { env } from "../config/env.js";
import { sendError } from "../utils/http.js";

/**
 * Middleware to authenticate requests using JWT access tokens
 * Expects: Authorization: Bearer <access_token>
 * Sets req.user with decoded token payload
 */
export const authenticateRequest = (req, res, next) => {
  if (env.skipJwtAuthForTesting) {
    req.user = {
      userId:
        req.get("x-test-user-id") ||
        req.query.userId ||
        req.body?.userId ||
        "000000000000000000000001",
      email: req.get("x-test-user-email") || "test@example.com",
      name: req.get("x-test-user-name") || "Test User",
      admin: true,
    };

    return next();
  }

  if (!env.jwtSecret) {
    return sendError(res, {
      statusCode: 500,
      message: "JWT authentication is not configured on the server",
    });
  }

  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return sendError(res, {
      statusCode: 401,
      message: "Authorization header must be: Bearer <access_token>",
    });
  }

  try {
    // Verify and decode the access token
    const decoded = verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      admin: decoded.admin || false,
    };

    return next();
  } catch (error) {
    // Handle specific token errors
    const message = error.message.includes("expired")
      ? "Access token has expired. Please refresh your token."
      : error.message.includes("invalid")
      ? "Invalid access token. Please login again."
      : "Authentication failed";

    return sendError(res, {
      statusCode: 401,
      message,
    });
  }
};

/**
 * Optional middleware to check if user is admin
 * Must be used after authenticateRequest
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, {
      statusCode: 401,
      message: "Authentication required",
    });
  }

  if (!req.user.admin) {
    return sendError(res, {
      statusCode: 403,
      message: "Admin access required",
    });
  }

  return next();
};
