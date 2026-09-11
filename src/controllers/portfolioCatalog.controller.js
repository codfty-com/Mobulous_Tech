import Asset from "../models/asset.js";
import Instrument from "../models/instrument.js";
import InvestmentAccount from "../models/investmentAccount.js";
import { sendError, sendSuccess } from "../utils/http.js";

const bodyFor = (req) => req.validated?.body || req.body;
const fail = (res, error, message) => {
  console.error(message, error);
  if (error.code === 11000) return sendError(res, { statusCode: 409, message: "A record with this unique value already exists" });
  if (error.name === "ValidationError") return sendError(res, { statusCode: 400, message: "Validation failed", details: Object.values(error.errors).map((item) => item.message) });
  return sendError(res, { message });
};

export const getAccounts = async (req, res) => {
  try { return sendSuccess(res, { message: "Investment accounts fetched successfully", data: await InvestmentAccount.find({ userId: req.user.userId }).sort({ createdAt: -1 }) }); }
  catch (error) { return fail(res, error, "Failed to fetch investment accounts"); }
};
export const createAccount = async (req, res) => {
  try { return sendSuccess(res, { statusCode: 201, message: "Investment account added successfully", data: await InvestmentAccount.create({ userId: req.user.userId, ...bodyFor(req) }) }); }
  catch (error) { return fail(res, error, "Failed to add investment account"); }
};
export const updateAccount = async (req, res) => {
  try {
    const data = await InvestmentAccount.findOneAndUpdate({ _id: req.params.accountId, userId: req.user.userId }, { $set: bodyFor(req) }, { new: true, runValidators: true });
    return data ? sendSuccess(res, { message: "Investment account updated successfully", data }) : sendError(res, { statusCode: 404, message: "Investment account not found" });
  } catch (error) { return fail(res, error, "Failed to update investment account"); }
};
export const deleteAccount = async (req, res) => {
  try {
    const data = await InvestmentAccount.findOneAndDelete({ _id: req.params.accountId, userId: req.user.userId });
    return data ? sendSuccess(res, { message: "Investment account deleted successfully", data: { id: data._id } }) : sendError(res, { statusCode: 404, message: "Investment account not found" });
  } catch (error) { return fail(res, error, "Failed to delete investment account"); }
};

export const getInstruments = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.categoryKey) filter.categoryKey = String(req.query.categoryKey).toLowerCase();
    return sendSuccess(res, { message: "Instruments fetched successfully", data: await Instrument.find(filter).sort({ name: 1 }) });
  } catch (error) { return fail(res, error, "Failed to fetch instruments"); }
};
export const createInstrument = async (req, res) => {
  try {
    const body = bodyFor(req);
    const category = await Asset.findOne({ key: body.categoryKey, isActive: true });
    if (!category) return sendError(res, { statusCode: 400, message: "Asset category not found" });
    const data = await Instrument.create({ ...body, categoryId: category._id, categoryKey: category.key, priceUpdatedAt: new Date() });
    return sendSuccess(res, { statusCode: 201, message: "Instrument added successfully", data });
  } catch (error) { return fail(res, error, "Failed to add instrument"); }
};
export const updateInstrument = async (req, res) => {
  try {
    const body = bodyFor(req);
    const update = { ...body, ...(body.currentPrice !== undefined ? { priceUpdatedAt: new Date() } : {}) };
    if (body.categoryKey) {
      const category = await Asset.findOne({ key: body.categoryKey, isActive: true });
      if (!category) return sendError(res, { statusCode: 400, message: "Asset category not found" });
      update.categoryId = category._id;
      update.categoryKey = category.key;
    }
    const data = await Instrument.findByIdAndUpdate(req.params.instrumentId, { $set: update }, { new: true, runValidators: true });
    return data ? sendSuccess(res, { message: "Instrument updated successfully", data }) : sendError(res, { statusCode: 404, message: "Instrument not found" });
  } catch (error) { return fail(res, error, "Failed to update instrument"); }
};
