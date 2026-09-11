import mongoose from "mongoose";

const providers = ["zerodha", "groww", "angel_one", "upstox", "manual"];
const statuses = ["active", "inactive", "disconnected"];
const priceTypes = ["market_price", "nav", "manual"];
const result = (errors, data) => errors.length ? { success: false, errors } : { success: true, data };
const id = (value, name, errors, required = false) => {
  if (value === undefined && required) errors.push(`${name} is required`);
  else if (value !== undefined && (typeof value !== "string" || !mongoose.isValidObjectId(value))) errors.push(`${name} must be a valid MongoDB ID`);
  return value;
};
const text = (value, name, errors, { required = false, max = 100 } = {}) => {
  if (value === undefined && required) { errors.push(`${name} is required`); return undefined; }
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) { errors.push(`${name} must be a non-empty string up to ${max} characters`); return undefined; }
  return value.trim();
};
const number = (value, name, errors, required = false) => {
  if (value === undefined && required) { errors.push(`${name} is required`); return undefined; }
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) { errors.push(`${name} must be a non-negative number`); return undefined; }
  return parsed;
};

const accountBody = (body, required) => {
  const errors = []; const data = {};
  const provider = text(body.provider, "provider", errors, { required, max: 30 })?.toLowerCase();
  if (provider) { if (!providers.includes(provider)) errors.push(`provider must be one of: ${providers.join(", ")}`); else data.provider = provider; }
  for (const [field, max] of [["accountName", 100], ["externalAccountId", 100]]) { const value = text(body[field], field, errors, { required: field === "accountName" && required, max }); if (value !== undefined) data[field] = value; }
  const status = text(body.status, "status", errors, { max: 30 })?.toLowerCase();
  if (status) { if (!statuses.includes(status)) errors.push(`status must be one of: ${statuses.join(", ")}`); else data.status = status; }
  if (!required && !Object.keys(data).length) errors.push("At least one account field is required");
  return result(errors, data);
};

const instrumentBody = (body, required) => {
  const errors = []; const data = {};
  const categoryKey = text(body.categoryKey, "categoryKey", errors, { required, max: 50 })?.toLowerCase();
  if (categoryKey) data.categoryKey = categoryKey;
  for (const [field, max, needed] of [["name", 200, true], ["symbol", 50, false], ["isin", 20, false], ["exchange", 30, false], ["currency", 10, false]]) { const value = text(body[field], field, errors, { required: required && needed, max }); if (value !== undefined) data[field] = ["symbol", "isin", "exchange", "currency"].includes(field) ? value.toUpperCase() : value; }
  for (const field of ["currentPrice", "previousClose"]) { const value = number(body[field], field, errors, required && field === "currentPrice"); if (value !== undefined) data[field] = value; }
  const priceType = text(body.priceType, "priceType", errors, { required, max: 30 })?.toLowerCase();
  if (priceType) { if (!priceTypes.includes(priceType)) errors.push(`priceType must be one of: ${priceTypes.join(", ")}`); else data.priceType = priceType; }
  if (body.isActive !== undefined) { if (typeof body.isActive !== "boolean") errors.push("isActive must be a boolean"); else data.isActive = body.isActive; }
  if (!required && !Object.keys(data).length) errors.push("At least one instrument field is required");
  return result(errors, data);
};

export const createAccountSchema = { body: (body) => accountBody(body, true) };
export const updateAccountSchema = { body: (body) => accountBody(body, false), params: (params) => { const errors=[]; id(params.accountId,"accountId",errors,true); return result(errors,{}); } };
export const createInstrumentSchema = { body: (body) => instrumentBody(body, true) };
export const updateInstrumentSchema = { body: (body) => instrumentBody(body, false), params: (params) => { const errors=[]; id(params.instrumentId,"instrumentId",errors,true); return result(errors,{}); } };
