const buildResult = (errors, data) =>
  errors.length ? { success: false, errors } : { success: true, data };

const normalizeKeys = (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const keys = Array.isArray(value)
    ? value.flatMap((item) => String(item).split(","))
    : String(value).split(",");

  return keys.map((item) => item.trim()).filter(Boolean);
};

const normalizeBoolean = (value) => {
  if (value === undefined || value === null || value === "") return false;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

export const marketQuerySchema = {
  query(query) {
    const errors = [];
    const keys = normalizeKeys(query.keys);

    if (keys && !keys.length) {
      errors.push("keys must include at least one market key");
    }

    return buildResult(errors, {
      keys,
      forceRefresh: normalizeBoolean(query.forceRefresh),
    });
  },
};

export const marketKeyParamsSchema = {
  params(params) {
    const errors = [];
    const marketKey = String(params.marketKey || "").trim().toLowerCase();

    if (!marketKey) {
      errors.push("marketKey is required");
    }

    return buildResult(errors, { marketKey });
  },
  query: marketQuerySchema.query,
};

export const refreshMarketSchema = {
  body(body) {
    return buildResult([], {
      keys: normalizeKeys(body.keys),
    });
  },
  query: marketQuerySchema.query,
};
