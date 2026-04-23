import { sendError } from "../utils/http.js";

const validationSources = ["body", "query", "params"];

export const validateRequest = (schema) => (req, res, next) => {
  const validated = {};
  const details = [];

  for (const source of validationSources) {
    const validator = schema[source];

    if (!validator) continue;

    const result = validator(req[source] || {});

    if (!result.success) {
      details.push(...result.errors.map((message) => `${source}: ${message}`));
      continue;
    }

    validated[source] = result.data;
  }

  if (details.length) {
    return sendError(res, {
      statusCode: 400,
      message: "Validation failed",
      details,
    });
  }

  req.validated = validated;
  return next();
};
