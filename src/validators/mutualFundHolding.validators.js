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

const stringValue = (value) => (typeof value === "string" ? value.trim() : undefined);
const result = (errors, data) =>
  errors.length ? { success: false, errors } : { success: true, data };

const normalizeTags = (value) => {
  if (value === undefined) return undefined;
  const tags = Array.isArray(value) ? value : String(value).split(",");
  return tags.map((tag) => String(tag).trim()).filter(Boolean);
};

const buildHolding = (body, required) => {
  const errors = [];
  const data = {};
  const fields = [
    ["fundName", 200], ["schemeCode", 30], ["folioNumber", 100],
    ["fundHouse", 150], ["category", 100], ["notes", 500],
  ];

  for (const [field, maxLength] of fields) {
    if (body[field] === undefined) continue;
    const value = stringValue(body[field]);
    if (!value && field === "fundName") errors.push("Fund name cannot be empty");
    else if (value && value.length > maxLength) errors.push(`${field} cannot exceed ${maxLength} characters`);
    else if (value) data[field] = value;
  }

  for (const field of ["units", "investedAmount", "purchaseNav", "currentNav"]) {
    if (body[field] === undefined) continue;
    const value = numberValue(body[field]);
    if (value === undefined) errors.push(`${field} must be a valid number`);
    else if (value < 0) errors.push(`${field} cannot be negative`);
    else data[field] = value;
  }

  if (body.purchaseDate !== undefined) {
    const value = dateValue(body.purchaseDate);
    if (!value) errors.push("purchaseDate must be a valid date");
    else data.purchaseDate = value;
  }
  if (body.tags !== undefined) data.tags = normalizeTags(body.tags);

  if (required) {
    for (const field of ["fundName", "units", "investedAmount"]) {
      if (data[field] === undefined) errors.push(`${field} is required`);
    }
  } else if (!Object.keys(data).length) {
    errors.push("At least one mutual fund field is required");
  }

  return result(errors, data);
};

export const addMutualFundHoldingSchema = { body: (body) => buildHolding(body, true) };
export const updateMutualFundHoldingSchema = { body: (body) => buildHolding(body, false) };

export const getMutualFundHoldingsQuerySchema = {
  query(query) {
    const errors = [];
    const data = {};
    for (const field of ["page", "limit"]) {
      if (query[field] === undefined) continue;
      const value = numberValue(query[field]);
      const max = field === "limit" ? 100 : Number.MAX_SAFE_INTEGER;
      if (!Number.isInteger(value) || value < 1 || value > max) {
        errors.push(`${field} must be a positive integer${field === "limit" ? " up to 100" : ""}`);
      } else data[field] = value;
    }
    if (query.search !== undefined) data.search = String(query.search).trim();
    if (query.sortOrder !== undefined && !["asc", "desc"].includes(query.sortOrder)) errors.push("sortOrder must be asc or desc");
    else if (query.sortOrder) data.sortOrder = query.sortOrder;
    return result(errors, data);
  },
};
