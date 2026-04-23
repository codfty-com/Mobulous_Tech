export class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const sendSuccess = (
  res,
  { statusCode = 200, message, data, ...extra } = {},
) =>
  res.status(statusCode).json({
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    ...extra,
  });

export const sendError = (
  res,
  { statusCode = 500, message, details, ...extra } = {},
) =>
  res.status(statusCode).json({
    success: false,
    message: message || "Internal server error",
    ...(details !== undefined ? { details } : {}),
    ...extra,
  });

export const notFoundHandler = (req, res) =>
  sendError(res, {
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error("Unhandled error:", err);
  }

  sendError(res, {
    statusCode,
    message: err.message,
    details: err.details,
  });
};
