import { EXPENSE_CATEGORIES } from "../models/userExpense.js";

const numberValue = (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const number = Number(value);

  return Number.isFinite(number) ? number : undefined;
};

const stringValue = (value) =>
  typeof value === "string" ? value.trim() : undefined;

const dateValue = (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
};

const result = (errors, data) =>
  errors.length ? { success: false, errors } : { success: true, data };

const categoryValue = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : undefined;

const validateCategory = (category, errors) => {
  if (!category) {
    errors.push("Category is required");
    return undefined;
  }

  if (!EXPENSE_CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${EXPENSE_CATEGORIES.join(", ")}`);
    return undefined;
  }

  return category;
};

export const addExpenseSchema = {
  body(body) {
    const errors = [];
    const data = {};
    const amount = numberValue(body.amount);
    const category = validateCategory(categoryValue(body.category), errors);
    const notes = stringValue(body.notes);
    const expenseDate = dateValue(body.expenseDate ?? body.transactionDate);

    if (amount === undefined) {
      errors.push("Amount is required and must be a valid number");
    } else if (amount <= 0) {
      errors.push("Amount must be greater than 0");
    } else {
      data.amount = amount;
    }

    if (category) data.category = category;

    if (body.notes !== undefined) {
      if (notes && notes.length > 500) {
        errors.push("Notes cannot exceed 500 characters");
      } else {
        data.notes = notes || "";
      }
    }

    if (body.expenseDate !== undefined || body.transactionDate !== undefined) {
      if (!expenseDate) {
        errors.push("Expense date must be a valid date");
      } else {
        data.expenseDate = expenseDate;
      }
    }

    return result(errors, data);
  },
};

export const updateExpenseSchema = {
  body(body) {
    const errors = [];
    const data = {};

    if (body.amount !== undefined) {
      const amount = numberValue(body.amount);

      if (amount === undefined) {
        errors.push("Amount must be a valid number");
      } else if (amount <= 0) {
        errors.push("Amount must be greater than 0");
      } else {
        data.amount = amount;
      }
    }

    if (body.category !== undefined) {
      const category = validateCategory(categoryValue(body.category), errors);
      if (category) data.category = category;
    }

    if (body.notes !== undefined) {
      const notes = stringValue(body.notes);

      if (notes && notes.length > 500) {
        errors.push("Notes cannot exceed 500 characters");
      } else {
        data.notes = notes || "";
      }
    }

    if (body.expenseDate !== undefined || body.transactionDate !== undefined) {
      const expenseDate = dateValue(body.expenseDate ?? body.transactionDate);

      if (!expenseDate) {
        errors.push("Expense date must be a valid date");
      } else {
        data.expenseDate = expenseDate;
      }
    }

    if (!Object.keys(data).length) {
      errors.push("At least one expense field is required");
    }

    return result(errors, data);
  },
};

const dateRangeFields = (query, errors, data) => {
  if (query.from !== undefined || query.dateFrom !== undefined) {
    const from = dateValue(query.from ?? query.dateFrom);

    if (!from) errors.push("from/dateFrom must be a valid date");
    else data.from = from;
  }

  if (query.to !== undefined || query.dateTo !== undefined) {
    const to = dateValue(query.to ?? query.dateTo);

    if (!to) errors.push("to/dateTo must be a valid date");
    else data.to = to;
  }
};

export const getExpensesQuerySchema = {
  query(query) {
    const errors = [];
    const data = {};

    if (query.category !== undefined) {
      const category = categoryValue(query.category);

      if (category && !EXPENSE_CATEGORIES.includes(category)) {
        errors.push(`Category must be one of: ${EXPENSE_CATEGORIES.join(", ")}`);
      } else if (category) {
        data.category = category;
      }
    }

    if (query.search !== undefined) {
      data.search = String(query.search).trim();
    }

    for (const field of ["page", "limit"]) {
      if (query[field] === undefined) continue;

      const value = numberValue(query[field]);
      const max = field === "limit" ? 100 : Number.MAX_SAFE_INTEGER;

      if (!Number.isInteger(value) || value < 1 || value > max) {
        errors.push(
          `${field} must be a positive integer${field === "limit" ? " up to 100" : ""}`,
        );
      } else {
        data[field] = value;
      }
    }

    if (query.sortOrder !== undefined) {
      if (!["asc", "desc"].includes(String(query.sortOrder).toLowerCase())) {
        errors.push("sortOrder must be asc or desc");
      } else {
        data.sortOrder = String(query.sortOrder).toLowerCase();
      }
    }

    dateRangeFields(query, errors, data);

    return result(errors, data);
  },
};

export const getExpenseSummaryQuerySchema = {
  query(query) {
    const errors = [];
    const data = {};

    if (query.budget !== undefined || query.totalBudget !== undefined) {
      const budget = numberValue(query.budget ?? query.totalBudget);

      if (budget === undefined) {
        errors.push("budget must be a valid number");
      } else if (budget < 0) {
        errors.push("budget cannot be negative");
      } else {
        data.budget = budget;
      }
    }

    dateRangeFields(query, errors, data);

    return result(errors, data);
  },
};
