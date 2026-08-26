import express from "express";
import {
  addExpense,
  deleteExpense,
  getExpenseById,
  getExpenseCategories,
  getExpenses,
  getExpenseSummary,
  updateExpense,
} from "../controllers/expense.controller.js";
import { authenticateRequest } from "../middlewares/jwt.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  addExpenseSchema,
  getExpensesQuerySchema,
  getExpenseSummaryQuerySchema,
  updateExpenseSchema,
} from "../validators/expense.validators.js";

const router = express.Router();

router.get("/expenses/categories", getExpenseCategories);
router.use("/expenses", authenticateRequest);
router.post("/expenses", validateRequest(addExpenseSchema), addExpense);
router.get("/expenses", validateRequest(getExpensesQuerySchema), getExpenses);
router.get(
  "/expenses/summary",
  validateRequest(getExpenseSummaryQuerySchema),
  getExpenseSummary,
);
router.get("/expenses/:id", getExpenseById);
router.patch("/expenses/:id", validateRequest(updateExpenseSchema), updateExpense);
router.put("/expenses/:id", validateRequest(updateExpenseSchema), updateExpense);
router.delete("/expenses/:id", deleteExpense);

export default router;
