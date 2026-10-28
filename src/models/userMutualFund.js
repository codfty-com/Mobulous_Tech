import mongoose from "mongoose";
import { calculateMutualFundHolding, mutualFundTransactions } from "../utils/mutualFundLedger.js";

const transactionSchema = new mongoose.Schema({
  units: { type: Number, required: true, min: Number.MIN_VALUE },
  purchaseNav: { type: Number, required: true, min: 0 },
  transactionType: { type: String, enum: ["buy", "sell"], required: true },
  transactionDate: { type: Date, required: true },
});

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
    icon: {
      type: String,
      trim: true,
      maxlength: [500, "Icon URL cannot exceed 500 characters"],
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
    previousNav: { type: Number, min: [0, "Previous NAV cannot be negative"] },
    purchaseDate: { type: Date, default: Date.now },
    transactionDate: { type: Date, default: Date.now },
    transactionType: {
      type: String,
      enum: ["buy", "sell"],
      default: "buy",
      lowercase: true,
      trim: true,
    },
    // Every buy/sell is retained so a scheme has one reliable position and
    // its weighted average acquisition NAV can be replayed at any time.
    transactions: { type: [transactionSchema], default: undefined },
    fundHouse: { type: String, trim: true, maxlength: 150 },
    category: { type: String, trim: true, maxlength: 100 },
    notes: { type: String, trim: true, maxlength: 500 },
    tags: { type: [String], default: [] },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Keep this non-unique while legacy one-trade-per-document records are
// gradually consolidated by the transaction service on their next write.
userMutualFundSchema.index({ userId: 1, schemeCode: 1 });
userMutualFundSchema.index({ userId: 1, fundName: 1 });
userMutualFundSchema.index({ userId: 1, transactionDate: -1 });

userMutualFundSchema.virtual("currentValue").get(function () {
  return this.currentNav === undefined ? null : this.units * this.currentNav;
});

userMutualFundSchema.virtual("quantity").get(function () {
  return this.units;
});

userMutualFundSchema.virtual("signedUnits").get(function () {
  if (this.transactions?.length) return this.units;
  return (this.transactionType === "sell" ? -1 : 1) * this.units;
});

userMutualFundSchema.virtual("totalValue").get(function () {
  return this.investedAmount;
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

userMutualFundSchema.virtual("todayNavChange").get(function () {
  return this.currentNav != null && this.previousNav != null
    ? this.currentNav - this.previousNav
    : null;
});

userMutualFundSchema.statics.getValuedHoldings = async function (userId) {
  const rows = await this.find({ userId }).sort({ createdAt: 1, _id: 1 }).lean();
  const grouped = new Map();
  for (const row of rows) {
    const key = String(row.schemeCode || row.fundName).trim().toLowerCase();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  const holdings = [...grouped].map(([, funds]) => {
    const latest = [...funds].sort((a, b) => new Date(a.lastUpdated || a.createdAt) - new Date(b.lastUpdated || b.createdAt)).at(-1);
    const transactions = funds.flatMap(mutualFundTransactions);
    const position = calculateMutualFundHolding(transactions);
    const currentNav = latest.currentNav ?? position.purchaseNav;
    const currentValue = position.units * currentNav;
    const investedAmount = position.investedAmount;
    return {
      holdingId: String(funds[0]._id), schemeCode: latest.schemeCode, fundName: latest.fundName,
      fundHouse: latest.fundHouse, category: latest.category, icon: latest.icon,
      units: position.units, quantity: position.units, averagePurchaseNav: position.purchaseNav,
      investedAmount, currentNav, previousNav: latest.previousNav ?? null,
      currentValue, totalValue: investedAmount, currentTotalAmount: currentValue,
      transactionCount: transactions.length,
      buyTransactions: transactions.filter((trade) => trade.transactionType !== "sell").length,
      sellTransactions: transactions.filter((trade) => trade.transactionType === "sell").length,
      lastTransactionDate: position.transactionDate,
      profitLoss: currentValue - investedAmount,
      profitLossPercentage: investedAmount ? ((currentValue - investedAmount) / investedAmount) * 100 : null,
    };
  });
  const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  return holdings.map((holding) => ({ ...holding,
    holdingPercentage: totalValue ? Math.round(holding.currentValue / totalValue * 10000) / 100 : 0,
  })).sort((left, right) => right.currentValue - left.currentValue || left.fundName.localeCompare(right.fundName));
};

userMutualFundSchema.statics.summarizeHoldings = function (holdings) {
  const investedAmount = holdings.reduce((sum, holding) => sum + holding.investedAmount, 0);
  const currentValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const profitLoss = currentValue - investedAmount;
  return {
    totalMutualFunds: holdings.filter((holding) => holding.units > 0).length,
    totalUnits: holdings.reduce((sum, holding) => sum + holding.units, 0),
    totalInvestment: investedAmount, investedAmount, totalCurrentValue: currentValue,
    currentValue, currentTotalAmount: currentValue, profitLoss,
    profitLossPercentage: investedAmount ? (profitLoss / investedAmount) * 100 : null,
    totalTransactions: holdings.reduce((sum, holding) => sum + holding.transactionCount, 0),
    buyTransactions: holdings.reduce((sum, holding) => sum + holding.buyTransactions, 0),
    sellTransactions: holdings.reduce((sum, holding) => sum + holding.sellTransactions, 0),
  };
};

userMutualFundSchema.statics.getUserPortfolioValue = async function (userId) {
  return this.summarizeHoldings(await this.getValuedHoldings(userId));
};

userMutualFundSchema.statics.getUserHoldings = async function (userId) {
  return (await this.getValuedHoldings(userId)).filter((holding) => holding.units > 0);
};

userMutualFundSchema.set("toJSON", { virtuals: true });
userMutualFundSchema.set("toObject", { virtuals: true });

export default mongoose.model("UserMutualFund", userMutualFundSchema);
