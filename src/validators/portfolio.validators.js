import mongoose from "mongoose";

const periods = ["1W", "1M", "6M", "1Y", "3Y", "5Y", "YTD"];
const sources = ["manual", "broker_sync", "import"];
const result = (errors, data) => (errors.length ? { success: false, errors } : { success: true, data });

const stringValue = (value, field, errors, { required = false, maxLength = 100 } = {}) => {
  if (value === undefined) {
    if (required) errors.push(`${field} is required`);
    return undefined;
  }
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${field} must be a non-empty string`);
    return undefined;
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    errors.push(`${field} cannot exceed ${maxLength} characters`);
    return undefined;
  }
  return normalized;
};

const objectIdValue = (value, field, errors, { required = false, nullable = false } = {}) => {
  if (value === undefined) {
    if (required) errors.push(`${field} is required`);
    return undefined;
  }
  if (nullable && value === null) return null;
  if (typeof value !== "string" || !mongoose.isValidObjectId(value)) {
    errors.push(`${field} must be a valid MongoDB ID`);
    return undefined;
  }
  return value;
};

const numberValue = (value, field, errors, { required = false, positive = false } = {}) => {
  if (value === undefined) {
    if (required) errors.push(`${field} is required`);
    return undefined;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || (positive ? number <= 0 : number < 0)) {
    errors.push(`${field} must be ${positive ? "a positive" : "a non-negative"} number`);
    return undefined;
  }
  return number;
};

const holdingBody = (body, required) => {
  const errors = [];
  const data = {};

  const categoryKey = stringValue(body.categoryKey, "categoryKey", errors, { required, maxLength: 50 });
  if (categoryKey !== undefined) {
    const normalized = categoryKey.toLowerCase();
    if (!/^[a-z0-9_]+$/.test(normalized)) errors.push("categoryKey has an invalid format");
    else data.categoryKey = normalized;
  }

  const instrumentId = objectIdValue(body.instrumentId, "instrumentId", errors, { required });
  if (instrumentId !== undefined) data.instrumentId = instrumentId;

  const accountId = objectIdValue(body.accountId, "accountId", errors, { nullable: true });
  if (accountId !== undefined) data.accountId = accountId;

  const quantity = numberValue(body.quantity, "quantity", errors, { required, positive: true });
  if (quantity !== undefined) data.quantity = quantity;

  const averagePurchasePrice = numberValue(body.averagePurchasePrice, "averagePurchasePrice", errors, { required });
  if (averagePurchasePrice !== undefined) data.averagePurchasePrice = averagePurchasePrice;

  const source = stringValue(body.source, "source", errors, { maxLength: 30 });
  if (source !== undefined) {
    const normalized = source.toLowerCase();
    if (!sources.includes(normalized)) errors.push(`source must be one of: ${sources.join(", ")}`);
    else data.source = normalized;
  }

  const externalHoldingId = stringValue(body.externalHoldingId, "externalHoldingId", errors, { maxLength: 100 });
  if (externalHoldingId !== undefined) data.externalHoldingId = externalHoldingId;

  if (body.lastSyncedAt !== undefined) {
    const value = new Date(body.lastSyncedAt);
    if (Number.isNaN(value.getTime())) errors.push("lastSyncedAt must be a valid date");
    else data.lastSyncedAt = value;
  }

  if (!required && !Object.keys(data).length) errors.push("At least one holding field is required");
  return result(errors, data);
};

export const createHoldingSchema = { body: (body) => holdingBody(body, true) };
export const updateHoldingSchema = { body: (body) => holdingBody(body, false) };
export const holdingParamsSchema = {
  params: (params) => {
    const errors = [];
    objectIdValue(params.holdingId, "holdingId", errors, { required: true });
    return result(errors, {});
  },
};
export const categoryParamsSchema = {
  params: (params) => {
    const errors = [];
    const categoryKey = stringValue(params.categoryKey, "categoryKey", errors, { required: true, maxLength: 50 });
    if (categoryKey && !/^[a-z0-9_]+$/i.test(categoryKey)) errors.push("categoryKey has an invalid format");
    return result(errors, {});
  },
};
export const historyQuerySchema = {
  query: (query) => {
    const errors = [];
    const period = String(query.period || "").toUpperCase();
    if (!periods.includes(period)) errors.push(`period must be one of: ${periods.join(", ")}`);
    return result(errors, errors.length ? {} : { period });
  },
};
