import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { sendError } from "../utils/http.js";

export const authenticateRequest = (req, res, next) => {
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
      message: "Bearer token is required",
    });
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch (error) {
    return sendError(res, {
      statusCode: 401,
      message: "Invalid or expired token",
    });
  }
};
