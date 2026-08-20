import mongoose from "mongoose";

const userMutualFundSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fundName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Fund name cannot exceed 200 characters"],
    },
    schemeCode: {
      type: String,
      trim: true,
      maxlength: [30, "Scheme code cannot exceed 30 characters"],
    },
    folioNumber: {
      type: String,
      trim: true,
      maxlength: [100, "Folio number cannot exceed 100 characters"],
    },
    units: {
      type: Number,
      required: true,
      min: [0, "Units cannot be negative"],
    },
    investedAmount: {
      type: Number,
      required: true,
      min: [0, "Invested amount cannot be negative"],
    },
    purchaseNav: { type: Number, min: [0, "Purchase NAV cannot be negative"] },
    currentNav: { type: Number, min: [0, "Current NAV cannot be negative"] },
    purchaseDate: { type: Date, default: Date.now },
    fundHouse: { type: String, trim: true, maxlength: 150 },
    category: { type: String, trim: true, maxlength: 100 },
    notes: { type: String, trim: true, maxlength: 500 },
    tags: { type: [String], default: [] },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

userMutualFundSchema.index({ userId: 1, schemeCode: 1 });
userMutualFundSchema.index({ userId: 1, fundName: 1 });

userMutualFundSchema.virtual("currentValue").get(function () {
  return this.currentNav === undefined ? null : this.units * this.currentNav;
});

userMutualFundSchema.virtual("profitLoss").get(function () {
  const currentValue = this.currentValue;
  return currentValue === null ? null : currentValue - this.investedAmount;
});

userMutualFundSchema.virtual("profitLossPercentage").get(function () {
  const profitLoss = this.profitLoss;
  return profitLoss === null || this.investedAmount === 0
    ? null
    : (profitLoss / this.investedAmount) * 100;
});

userMutualFundSchema.set("toJSON", { virtuals: true });
userMutualFundSchema.set("toObject", { virtuals: true });

export default mongoose.model("UserMutualFund", userMutualFundSchema);
