const numberValue = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};
const dateValue = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};
const stringValue = (value) => typeof value === "string" ? value.trim() : undefined;
const result = (errors, data) => errors.length ? { success: false, errors } : { success: true, data };
const transactionTypeValue = (value) => typeof value === "string" ? value.trim().toLowerCase() : value;
const normalizeTags = (value) => {
  if (value === undefined) return undefined;
  return (Array.isArray(value) ? value : String(value).split(","))
    .map((tag) => String(tag).trim()).filter(Boolean);
};
const schemeCodeValue = (value) => {
  const code = stringValue(String(value ?? ""));
  return /^\d{1,30}$/.test(code || "") ? code : undefined;
};

const addFieldValues = (body, data, errors) => {
  for (const [field, maxLength] of [["fundName", 200], ["folioNumber", 100], ["icon", 500], ["fundHouse", 150], ["category", 100], ["notes", 500]]) {
    if (body[field] === undefined) continue;
    const value = stringValue(body[field]);
    if (!value && field === "fundName") errors.push("fundName cannot be empty");
    else if (value && value.length > maxLength) errors.push(`${field} cannot exceed ${maxLength} characters`);
    else if (value) data[field] = value;
  }
  if (body.schemeCode !== undefined) {
    const value = schemeCodeValue(body.schemeCode);
    if (!value) errors.push("schemeCode must be a valid MFAPI scheme code");
    else data.schemeCode = value;
  }
  const unitsInput = body.units ?? body.quantity;
  if (unitsInput !== undefined) {
    const value = numberValue(unitsInput);
    if (value === undefined || value <= 0) errors.push("units must be greater than zero");
    else data.units = value;
  }
  const navInput = body.purchaseNav ?? body.price;
  if (navInput !== undefined) {
    const value = numberValue(navInput);
    if (value === undefined || value < 0) errors.push("purchaseNav must be a non-negative number");
    else data.purchaseNav = value;
  }
  for (const field of ["currentNav", "previousNav"]) {
    if (body[field] === undefined) continue;
    const value = numberValue(body[field]);
    if (value === undefined || value < 0) errors.push(`${field} must be a non-negative number`);
    else data[field] = value;
  }
  if (body.purchaseDate !== undefined || body.transactionDate !== undefined) {
    const value = dateValue(body.transactionDate ?? body.purchaseDate);
    if (!value) errors.push("transactionDate must be a valid date");
    else { data.purchaseDate = value; data.transactionDate = value; }
  }
  if (body.transactionType !== undefined) {
    const value = transactionTypeValue(body.transactionType);
    if (!["buy", "sell"].includes(value)) errors.push("transactionType must be either buy or sell");
    else data.transactionType = value;
  }
  if (body.tags !== undefined) data.tags = normalizeTags(body.tags);
};

const buildHolding = (body, required) => {
  const errors = []; const data = {};
  addFieldValues(body, data, errors);
  if (required) {
    for (const field of ["schemeCode", "fundName", "units", "purchaseNav"]) {
      if (data[field] === undefined) errors.push(`${field} is required`);
    }
    data.transactionType ??= "buy";
  } else if (!Object.keys(data).length) errors.push("At least one mutual fund field is required");
  return result(errors, data);
};

export const addMutualFundHoldingSchema = { body: (body) => buildHolding(body, true) };
export const updateMutualFundHoldingSchema = {
  body(body) {
    const base = buildHolding(body, false);
    if (body.transactionId !== undefined) {
      if (!/^[a-f\d]{24}$/i.test(String(body.transactionId))) {
        return { success: false, errors: [...(base.errors || []), "transactionId must be a valid mutual fund transaction ID"] };
      }
      if (base.success) base.data.transactionId = String(body.transactionId);
    }
    return base;
  },
};
export const lookupMutualFundSchema = { query(query) {
  const schemeCode = schemeCodeValue(query.schemeCode);
  return result(schemeCode ? [] : ["schemeCode must be a valid MFAPI scheme code"], { schemeCode });
} };
export const mutualFundSchemeParamsSchema = { params(params) {
  const schemeCode = schemeCodeValue(params.schemeCode);
  return result(schemeCode ? [] : ["schemeCode must be a valid MFAPI scheme code"], { schemeCode });
} };
export const getMutualFundHoldingsQuerySchema = { query(query) {
  const errors = []; const data = {};
  if (query.search !== undefined) data.search = String(query.search).trim();
  if (query.schemeCode !== undefined) {
    const schemeCode = schemeCodeValue(query.schemeCode);
    if (!schemeCode) errors.push("schemeCode must be a valid MFAPI scheme code"); else data.schemeCode = schemeCode;
  }
  if (query.transactionType !== undefined) {
    const value = transactionTypeValue(query.transactionType);
    if (!["buy", "sell"].includes(value)) errors.push("transactionType must be either buy or sell"); else data.transactionType = value;
  }
  for (const field of ["page", "limit"]) if (query[field] !== undefined) {
    const value = numberValue(query[field]); const max = field === "limit" ? 100 : Number.MAX_SAFE_INTEGER;
    if (!Number.isInteger(value) || value < 1 || value > max) errors.push(`${field} must be a positive integer${field === "limit" ? " up to 100" : ""}`);
    else data[field] = value;
  }
  const fields = ["fundName", "schemeCode", "units", "purchaseNav", "currentNav", "transactionDate", "createdAt", "lastUpdated"];
  if (query.sortBy !== undefined) {
    if (!fields.includes(query.sortBy)) errors.push(`sortBy must be one of: ${fields.join(", ")}`); else data.sortBy = query.sortBy;
  }
  if (query.sortOrder !== undefined) {
    if (!["asc", "desc"].includes(query.sortOrder)) errors.push("sortOrder must be asc or desc"); else data.sortOrder = query.sortOrder;
  }
  return result(errors, data);
} };
export const bulkUpdateMutualFundNavsSchema = { body(body) {
  const errors = []; const updates = [];
  if (!Array.isArray(body.updates) || !body.updates.length) return result(["updates must be a non-empty array"], {});
  if (body.updates.length > 50) return result(["Cannot update more than 50 mutual funds at once"], {});
  body.updates.forEach((update, index) => {
    const id = String(update.id || ""); const currentNav = numberValue(update.currentNav);
    const previousNav = update.previousNav === undefined ? undefined : numberValue(update.previousNav);
    if (!/^[a-f\d]{24}$/i.test(id)) errors.push(`updates[${index}].id must be a valid mutual fund ID`);
    else if (currentNav === undefined || currentNav < 0) errors.push(`updates[${index}].currentNav must be a non-negative number`);
    else if (update.previousNav !== undefined && (previousNav === undefined || previousNav < 0)) errors.push(`updates[${index}].previousNav must be a non-negative number`);
    else updates.push({ id, currentNav, ...(previousNav !== undefined ? { previousNav } : {}) });
  });
  return result(errors, { updates });
} };
