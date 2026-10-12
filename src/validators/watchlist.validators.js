const buildResult = (errors, data) =>
  errors.length ? { success: false, errors } : { success: true, data };

export const watchlistSymbolSchema = {
  body(body) {
    const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
    const errors = [];
    if (!/^[A-Z0-9&-]+\.(NS|BO)$/.test(symbol)) {
      errors.push("A valid Indian NSE (.NS) or BSE (.BO) stock symbol is required");
    }
    return buildResult(errors, { symbol });
  },
};

export const watchlistQuerySchema = {
  query(query) {
    const errors = [];
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    if (!Number.isInteger(page) || page < 1) errors.push("Page must be a positive integer");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push("Limit must be an integer between 1 and 100");
    return buildResult(errors, { page, limit });
  },
};
