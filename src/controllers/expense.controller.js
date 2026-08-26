import mongoose from "mongoose";
import UserExpense, { EXPENSE_CATEGORIES } from "../models/userExpense.js";
import { sendError, sendSuccess } from "../utils/http.js";

const validId = (id) => mongoose.isValidObjectId(id);
const bodyFor = (req) => req.validated?.body || req.body;
const queryFor = (req) => req.validated?.query || req.query;

const getRequestUserId = (req, res) => {
  const userId = req.user?.userId;

  if (!validId(userId)) {
    sendError(res, {
      statusCode: 400,
      message: "A valid userId is required",
    });
    return null;
  }

  return userId;
};

const getExpenseId = (req, res) => {
  const { id } = req.params;

  if (!validId(id)) {
    sendError(res, {
      statusCode: 400,
      message:
        "Invalid expense ID. Use the expense _id returned from GET /api/expenses.",
    });
    return null;
  }

  return id;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildExpenseFilter = ({ userId, category, search, from, to }) => {
  const filter = { userId: new mongoose.Types.ObjectId(userId) };

  if (category) filter.category = category;
  if (search) filter.notes = { $regex: escapeRegex(search), $options: "i" };

  if (from || to) {
    filter.expenseDate = {};
    if (from) filter.expenseDate.$gte = from;
    if (to) filter.expenseDate.$lte = to;
  }

  return filter;
};

export const getExpenseCategories = (req, res) =>
  sendSuccess(res, {
    message: "Expense categories fetched successfully",
    data: EXPENSE_CATEGORIES,
  });

export const addExpense = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);

    if (!userId) return null;

    const expenseData = { ...bodyFor(req) };
    delete expenseData.userId;

    const expense = await UserExpense.create({
      userId,
      ...expenseData,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Expense added successfully",
      data: expense,
    });
  } catch (error) {
    console.error("Add expense error:", error);
    return sendError(res, {
      statusCode: error.name === "ValidationError" ? 400 : 500,
      message:
        error.name === "ValidationError"
          ? "Validation failed"
          : "Failed to add expense",
      ...(error.name === "ValidationError"
        ? { details: Object.values(error.errors).map((err) => err.message) }
        : {}),
    });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);

    if (!userId) return null;

    const {
      category,
      search,
      from,
      to,
      page = 1,
      limit = 50,
      sortOrder = "desc",
    } = queryFor(req);
    const filter = buildExpenseFilter({ userId, category, search, from, to });
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      UserExpense.find(filter)
        .sort({ expenseDate: sortOrder === "asc" ? 1 : -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserExpense.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      message: "Expenses fetched successfully",
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    return sendError(res, { message: "Failed to fetch expenses" });
  }
};

export const getExpenseSummary = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);

    if (!userId) return null;

    const { budget = 0, from, to } = queryFor(req);
    const filter = buildExpenseFilter({ userId, from, to });

    const [overall] = await UserExpense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" },
          expenseCount: { $sum: 1 },
        },
      },
      { $project: { _id: 0, totalExpenses: 1, expenseCount: 1 } },
    ]);

    const categoryBreakdown = await UserExpense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$category",
          totalExpenses: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          totalExpenses: 1,
          count: 1,
        },
      },
      { $sort: { totalExpenses: -1 } },
    ]);

    const totalExpenses = overall?.totalExpenses || 0;
    const normalizedBudget = Number(budget) || 0;
    const remainingAmount = normalizedBudget - totalExpenses;
    const spentPercent =
      normalizedBudget > 0 ? (totalExpenses / normalizedBudget) * 100 : null;

    return sendSuccess(res, {
      message: "Expense summary fetched successfully",
      data: {
        budget: normalizedBudget,
        totalExpenses,
        remainingAmount,
        spentPercent,
        expenseCount: overall?.expenseCount || 0,
        categoryBreakdown,
      },
    });
  } catch (error) {
    console.error("Get expense summary error:", error);
    return sendError(res, { message: "Failed to fetch expense summary" });
  }
};

export const getExpenseById = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    const id = getExpenseId(req, res);

    if (!userId || !id) return null;

    const data = await UserExpense.findOne({ _id: id, userId });

    return data
      ? sendSuccess(res, { message: "Expense fetched successfully", data })
      : sendError(res, { statusCode: 404, message: "Expense not found" });
  } catch (error) {
    console.error("Get expense error:", error);
    return sendError(res, { message: "Failed to fetch expense" });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    const id = getExpenseId(req, res);

    if (!userId || !id) return null;

    const updateData = { ...bodyFor(req) };
    delete updateData.userId;

    const data = await UserExpense.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    return data
      ? sendSuccess(res, { message: "Expense updated successfully", data })
      : sendError(res, { statusCode: 404, message: "Expense not found" });
  } catch (error) {
    console.error("Update expense error:", error);
    return sendError(res, {
      statusCode: error.name === "ValidationError" ? 400 : 500,
      message:
        error.name === "ValidationError"
          ? "Validation failed"
          : "Failed to update expense",
      ...(error.name === "ValidationError"
        ? { details: Object.values(error.errors).map((err) => err.message) }
        : {}),
    });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const userId = getRequestUserId(req, res);
    const id = getExpenseId(req, res);

    if (!userId || !id) return null;

    const data = await UserExpense.findOneAndDelete({ _id: id, userId });

    return data
      ? sendSuccess(res, {
          message: "Expense deleted successfully",
          data: { id: data._id, amount: data.amount, category: data.category },
        })
      : sendError(res, { statusCode: 404, message: "Expense not found" });
  } catch (error) {
    console.error("Delete expense error:", error);
    return sendError(res, { message: "Failed to delete expense" });
  }
};
