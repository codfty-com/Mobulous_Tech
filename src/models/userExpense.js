import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = [
  "food",
  "shopping",
  "transport",
  "bills",
  "entertainment",
];

const userExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    category: {
      type: String,
      required: true,
      enum: EXPENSE_CATEGORIES,
      lowercase: true,
      trim: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

userExpenseSchema.index({ userId: 1, expenseDate: -1 });
userExpenseSchema.index({ userId: 1, category: 1 });

export default mongoose.model("UserExpense", userExpenseSchema);
