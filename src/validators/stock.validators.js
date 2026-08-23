const MARKET_CAP_OPTIONS = ["Large Cap", "Mid Cap", "Small Cap", "Micro Cap", ""];

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : value;

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const num = Number(value);
  return isNaN(num) ? undefined : num;
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const normalizeDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};

const normalizeTags = (value) => {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return undefined;
};

const buildResult = (errors, data) =>
  errors.length ? { success: false, errors } : { success: true, data };

const normalizeTransactionType = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

export const addStockSchema = {
  body(body) {
    const errors = [];

    // Required fields
    const symbol = normalizeString(body.symbol)?.toUpperCase();
    const name = normalizeString(body.name);
    const quantity = normalizeNumber(body.quantity);

    // Optional fields
    const icon = normalizeString(body.icon);
    const purchasePrice = normalizeNumber(body.purchasePrice ?? body.price);
    const currentPrice = normalizeNumber(body.currentPrice ?? body.price);
    const exchange = normalizeString(body.exchange)?.toUpperCase();
    const sector = normalizeString(body.sector);
    const currency = normalizeString(body.currency)?.toUpperCase();
    const purchaseDate = normalizeDate(body.purchaseDate ?? body.transactionDate);
    const transactionDate = normalizeDate(body.transactionDate ?? body.purchaseDate);
    const transactionType = normalizeTransactionType(body.transactionType ?? "buy");
    const marketCap = normalizeString(body.marketCap);
    const dividendYield = normalizeNumber(body.dividendYield);
    const peRatio = normalizeNumber(body.peRatio);
    const notes = normalizeString(body.notes);
    const tags = normalizeTags(body.tags);
    const watchlist = body.watchlist === undefined ? false : normalizeBoolean(body.watchlist);

    // Alerts object
    const alerts = {};
    if (body.alerts && typeof body.alerts === "object") {
      alerts.enabled = Boolean(body.alerts.enabled);
      if (body.alerts.targetPrice !== undefined) {
        alerts.targetPrice = normalizeNumber(body.alerts.targetPrice);
      }
      if (body.alerts.stopLoss !== undefined) {
        alerts.stopLoss = normalizeNumber(body.alerts.stopLoss);
      }
    }

    // Validation
    if (!symbol) {
      errors.push("Stock symbol is required");
    } else if (symbol.length < 1 || symbol.length > 20) {
      errors.push("Stock symbol must be between 1-20 characters");
    }

    if (!name) {
      errors.push("Stock name is required");
    } else if (name.length < 2) {
      errors.push("Stock name must be at least 2 characters long");
    } else if (name.length > 100) {
      errors.push("Stock name cannot exceed 100 characters");
    }

    if (quantity === undefined) {
      errors.push("Quantity is required");
    } else if (quantity < 0) {
      errors.push("Quantity cannot be negative");
    }

    if (purchasePrice !== undefined && purchasePrice < 0) {
      errors.push("Purchase price cannot be negative");
    }

    if (body.price !== undefined && purchasePrice === undefined) {
      errors.push("Price must be a valid number");
    }

    if (currentPrice !== undefined && currentPrice < 0) {
      errors.push("Current price cannot be negative");
    }

    if (icon && icon.length > 500) {
      errors.push("Icon URL cannot exceed 500 characters");
    }

    if ((body.purchaseDate || body.transactionDate) && !transactionDate) {
      errors.push("Transaction date must be a valid date");
    }

    if (!["buy", "sell"].includes(transactionType)) {
      errors.push("Transaction type must be either buy or sell");
    }

    if (dividendYield !== undefined && dividendYield < 0) {
      errors.push("Dividend yield cannot be negative");
    }

    if (peRatio !== undefined && peRatio < 0) {
      errors.push("PE ratio cannot be negative");
    }

    if (marketCap && !MARKET_CAP_OPTIONS.includes(marketCap)) {
      errors.push(`Market cap must be one of: ${MARKET_CAP_OPTIONS.filter(Boolean).join(", ")}`);
    }

    if (notes && notes.length > 500) {
      errors.push("Notes cannot exceed 500 characters");
    }

    if (watchlist === undefined) {
      errors.push("Watchlist must be a boolean");
    }

    if (alerts.targetPrice !== undefined && alerts.targetPrice < 0) {
      errors.push("Target price cannot be negative");
    }

    if (alerts.stopLoss !== undefined && alerts.stopLoss < 0) {
      errors.push("Stop loss cannot be negative");
    }

    const data = {
      symbol,
      name,
      quantity,
    };

    // Add optional fields only if they have values
    if (icon) data.icon = icon;
    if (purchasePrice !== undefined) data.purchasePrice = purchasePrice;
    if (currentPrice !== undefined) data.currentPrice = currentPrice;
    if (exchange) data.exchange = exchange;
    if (sector) data.sector = sector;
    if (currency) data.currency = currency;
    if (purchaseDate) data.purchaseDate = purchaseDate;
    if (transactionDate) data.transactionDate = transactionDate;
    data.transactionType = transactionType;
    if (marketCap) data.marketCap = marketCap;
    if (dividendYield !== undefined) data.dividendYield = dividendYield;
    if (peRatio !== undefined) data.peRatio = peRatio;
    if (notes) data.notes = notes;
    if (tags) data.tags = tags;
    data.watchlist = watchlist;

    if (Object.keys(alerts).length > 0) {
      data.alerts = alerts;
    }

    return buildResult(errors, data);
  },
};

export const updateStockSchema = {
  body(body) {
    const errors = [];
    const data = {};

    // All fields are optional for update
    if (body.symbol !== undefined) {
      const symbol = normalizeString(body.symbol)?.toUpperCase();
      if (!symbol) {
        errors.push("Stock symbol cannot be empty");
      } else if (symbol.length < 1 || symbol.length > 20) {
        errors.push("Stock symbol must be between 1-20 characters");
      } else {
        data.symbol = symbol;
      }
    }

    if (body.name !== undefined) {
      const name = normalizeString(body.name);
      if (!name) {
        errors.push("Stock name cannot be empty");
      } else if (name.length < 2) {
        errors.push("Stock name must be at least 2 characters long");
      } else if (name.length > 100) {
        errors.push("Stock name cannot exceed 100 characters");
      } else {
        data.name = name;
      }
    }

    if (body.icon !== undefined) {
      const icon = normalizeString(body.icon);
      if (icon && icon.length > 500) {
        errors.push("Icon URL cannot exceed 500 characters");
      } else {
        data.icon = icon || "";
      }
    }

    if (body.quantity !== undefined) {
      const quantity = normalizeNumber(body.quantity);
      if (quantity === undefined) {
        errors.push("Quantity must be a valid number");
      } else if (quantity < 0) {
        errors.push("Quantity cannot be negative");
      } else {
        data.quantity = quantity;
      }
    }

    if (body.purchasePrice !== undefined || body.price !== undefined) {
      const purchasePrice = normalizeNumber(body.purchasePrice ?? body.price);
      if (purchasePrice !== undefined) {
        if (purchasePrice < 0) {
          errors.push("Purchase price cannot be negative");
        } else {
          data.purchasePrice = purchasePrice;
        }
      } else {
        errors.push("Price must be a valid number");
      }
    }

    if (body.currentPrice !== undefined) {
      const currentPrice = normalizeNumber(body.currentPrice);
      if (currentPrice !== undefined) {
        if (currentPrice < 0) {
          errors.push("Current price cannot be negative");
        } else {
          data.currentPrice = currentPrice;
        }
      }
    }

    if (body.exchange !== undefined) {
      const exchange = normalizeString(body.exchange)?.toUpperCase();
      if (exchange) data.exchange = exchange;
    }

    if (body.sector !== undefined) {
      const sector = normalizeString(body.sector);
      if (sector) data.sector = sector;
    }

    if (body.currency !== undefined) {
      const currency = normalizeString(body.currency)?.toUpperCase();
      if (currency) data.currency = currency;
    }

    if (body.purchaseDate !== undefined) {
      const purchaseDate = normalizeDate(body.purchaseDate);
      if (purchaseDate) data.purchaseDate = purchaseDate;
      else errors.push("Purchase date must be a valid date");
    }

    if (body.transactionDate !== undefined) {
      const transactionDate = normalizeDate(body.transactionDate);
      if (transactionDate) data.transactionDate = transactionDate;
      else errors.push("Transaction date must be a valid date");
    }

    if (body.transactionType !== undefined) {
      const transactionType = normalizeTransactionType(body.transactionType);
      if (!["buy", "sell"].includes(transactionType)) {
        errors.push("Transaction type must be either buy or sell");
      } else {
        data.transactionType = transactionType;
      }
    }

    if (body.marketCap !== undefined) {
      const marketCap = normalizeString(body.marketCap);
      if (marketCap && !MARKET_CAP_OPTIONS.includes(marketCap)) {
        errors.push(`Market cap must be one of: ${MARKET_CAP_OPTIONS.filter(Boolean).join(", ")}`);
      } else {
        data.marketCap = marketCap || "";
      }
    }

    if (body.dividendYield !== undefined) {
      const dividendYield = normalizeNumber(body.dividendYield);
      if (dividendYield !== undefined) {
        if (dividendYield < 0) {
          errors.push("Dividend yield cannot be negative");
        } else {
          data.dividendYield = dividendYield;
        }
      }
    }

    if (body.peRatio !== undefined) {
      const peRatio = normalizeNumber(body.peRatio);
      if (peRatio !== undefined) {
        if (peRatio < 0) {
          errors.push("PE ratio cannot be negative");
        } else {
          data.peRatio = peRatio;
        }
      }
    }

    if (body.notes !== undefined) {
      const notes = normalizeString(body.notes);
      if (notes && notes.length > 500) {
        errors.push("Notes cannot exceed 500 characters");
      } else {
        data.notes = notes;
      }
    }

    if (body.tags !== undefined) {
      const tags = normalizeTags(body.tags);
      if (tags) data.tags = tags;
    }

    if (body.watchlist !== undefined) {
      const watchlist = normalizeBoolean(body.watchlist);
      if (watchlist === undefined) errors.push("Watchlist must be a boolean");
      else data.watchlist = watchlist;
    }

    if (body.alerts !== undefined && typeof body.alerts === "object") {
      const alerts = {};
      
      if (body.alerts.enabled !== undefined) {
        alerts.enabled = Boolean(body.alerts.enabled);
      }
      
      if (body.alerts.targetPrice !== undefined) {
        const targetPrice = normalizeNumber(body.alerts.targetPrice);
        if (targetPrice !== undefined) {
          if (targetPrice < 0) {
            errors.push("Target price cannot be negative");
          } else {
            alerts.targetPrice = targetPrice;
          }
        }
      }
      
      if (body.alerts.stopLoss !== undefined) {
        const stopLoss = normalizeNumber(body.alerts.stopLoss);
        if (stopLoss !== undefined) {
          if (stopLoss < 0) {
            errors.push("Stop loss cannot be negative");
          } else {
            alerts.stopLoss = stopLoss;
          }
        }
      }

      if (Object.keys(alerts).length > 0) {
        data.alerts = alerts;
      }
    }

    return buildResult(errors, data);
  },
};

export const getStocksQuerySchema = {
  query(query) {
    const errors = [];
    const data = {};

    if (query.symbol !== undefined) {
      data.symbol = query.symbol;
    }

    if (query.sector !== undefined) {
      data.sector = query.sector;
    }

    if (query.exchange !== undefined) {
      data.exchange = query.exchange;
    }

    if (query.transactionType !== undefined) {
      const transactionType = normalizeTransactionType(query.transactionType);
      if (!["buy", "sell"].includes(transactionType)) {
        errors.push("Transaction type must be either buy or sell");
      } else {
        data.transactionType = transactionType;
      }
    }

    if (query.watchlist !== undefined) {
      if (!["true", "false"].includes(query.watchlist)) {
        errors.push("Watchlist must be 'true' or 'false'");
      } else {
        data.watchlist = query.watchlist;
      }
    }

    if (query.tags !== undefined) {
      data.tags = query.tags;
    }

    if (query.page !== undefined) {
      const page = normalizeNumber(query.page);
      if (page === undefined || page < 1) {
        errors.push("Page must be a positive number");
      } else {
        data.page = page;
      }
    }

    if (query.limit !== undefined) {
      const limit = normalizeNumber(query.limit);
      if (limit === undefined || limit < 1 || limit > 100) {
        errors.push("Limit must be between 1 and 100");
      } else {
        data.limit = limit;
      }
    }

    if (query.sortBy !== undefined) {
      const validSortFields = [
        "symbol",
        "name",
        "quantity",
        "purchasePrice",
        "currentPrice",
        "sector",
        "exchange",
        "purchaseDate",
        "transactionDate",
        "transactionType",
        "createdAt",
        "updatedAt",
        "lastUpdated",
      ];
      if (!validSortFields.includes(query.sortBy)) {
        errors.push(
          `sortBy must be one of: ${validSortFields.join(", ")}`
        );
      } else {
        data.sortBy = query.sortBy;
      }
    }

    if (query.sortOrder !== undefined) {
      if (!["asc", "desc"].includes(query.sortOrder)) {
        errors.push("sortOrder must be either 'asc' or 'desc'");
      } else {
        data.sortOrder = query.sortOrder;
      }
    }

    return buildResult(errors, data);
  },
};

export const bulkUpdatePricesSchema = {
  body(body) {
    const errors = [];

    if (!body.updates || !Array.isArray(body.updates)) {
      errors.push("Updates array is required");
      return buildResult(errors, {});
    }

    if (body.updates.length === 0) {
      errors.push("Updates array cannot be empty");
      return buildResult(errors, {});
    }

    if (body.updates.length > 50) {
      errors.push("Cannot update more than 50 stocks at once");
      return buildResult(errors, {});
    }

    const updates = [];

    body.updates.forEach((update, index) => {
      if (!update.id) {
        errors.push(`updates[${index}].id is required`);
        return;
      }

      if (!/^[a-f\d]{24}$/i.test(String(update.id))) {
        errors.push(`updates[${index}].id must be a valid stock ID`);
        return;
      }

      const currentPrice = normalizeNumber(update.currentPrice);

      if (currentPrice === undefined) {
        errors.push(`updates[${index}].currentPrice is required and must be a valid number`);
        return;
      }

      if (currentPrice < 0) {
        errors.push(`updates[${index}].currentPrice cannot be negative`);
        return;
      }

      updates.push({
        id: update.id,
        currentPrice: currentPrice,
      });
    });

    return buildResult(errors, { updates });
  },
};

export const toggleWatchlistSchema = {
  body(body) {
    const errors = [];

    if (body.watchlist === undefined) {
      errors.push("Watchlist field is required");
      return buildResult(errors, {});
    }

    const watchlist = normalizeBoolean(body.watchlist);
    if (watchlist === undefined) {
      errors.push("Watchlist must be a boolean");
      return buildResult(errors, {});
    }
    const data = { watchlist };

    return buildResult(errors, data);
  },
};

export const setAlertsSchema = {
  body(body) {
    const errors = [];
    const data = {};

    if (body.enabled !== undefined) {
      const enabled = normalizeBoolean(body.enabled);
      if (enabled === undefined) errors.push("Enabled must be a boolean");
      else data.enabled = enabled;
    }

    if (body.targetPrice !== undefined) {
      const targetPrice = normalizeNumber(body.targetPrice);
      if (targetPrice === undefined) {
        errors.push("Target price must be a valid number");
      } else if (targetPrice < 0) {
        errors.push("Target price cannot be negative");
      } else {
        data.targetPrice = targetPrice;
      }
    }

    if (body.stopLoss !== undefined) {
      const stopLoss = normalizeNumber(body.stopLoss);
      if (stopLoss === undefined) {
        errors.push("Stop loss must be a valid number");
      } else if (stopLoss < 0) {
        errors.push("Stop loss cannot be negative");
      } else {
        data.stopLoss = stopLoss;
      }
    }

    // At least one field must be provided
    if (Object.keys(data).length === 0) {
      errors.push("At least one field (enabled, targetPrice, stopLoss) must be provided");
    }

    return buildResult(errors, data);
  },
};
