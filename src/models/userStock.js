import mongoose from "mongoose";
import { calculateHolding, stockTransactions } from "../utils/stockLedger.js";
import { holdingMetrics } from "../utils/holdingMetrics.js";

const transactionSchema = new mongoose.Schema({
  quantity: { type: Number, required: true, min: Number.MIN_VALUE },
  purchasePrice: { type: Number, required: true, min: 0 },
  transactionType: { type: String, enum: ["buy", "sell"], required: true },
  transactionDate: { type: Date, required: true },
});

// Existing portfolio calculations operate on trades, never on the summed
// holding as though it were one purchase on the most recent date.
const ledgerStages = () => [
  { $set: { ledger: { $cond: [
    { $gt: [{ $size: { $ifNull: ["$transactions", []] } }, 0] },
    "$transactions",
    [{ quantity: "$quantity", purchasePrice: "$purchasePrice", transactionType: "$transactionType", transactionDate: "$transactionDate" }],
  ] } } },
  { $unwind: "$ledger" },
  { $set: {
    quantity: "$ledger.quantity",
    purchasePrice: "$ledger.purchasePrice",
    transactionType: "$ledger.transactionType",
    transactionDate: "$ledger.transactionDate",
  } },
];

const userStockSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
      maxlength: [500, "Icon URL cannot exceed 500 characters"],
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity cannot be negative"],
      default: 1,
    },
    purchasePrice: {
      type: Number,
      min: [0, "Purchase price cannot be negative"],
    },
    currentPrice: {
      type: Number,
      min: [0, "Current price cannot be negative"],
    },
    previousClose: { type: Number, min: 0 },
    exchange: {
      type: String,
      trim: true,
      uppercase: true,
    },
    sector: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    transactionType: {
      type: String,
      enum: ["buy", "sell"],
      default: "buy",
      lowercase: true,
      trim: true,
    },
    transactions: { type: [transactionSchema], default: undefined },
    marketCap: {
      type: String,
      enum: ["Large Cap", "Mid Cap", "Small Cap", "Micro Cap", ""],
      default: "",
    },
    dividendYield: {
      type: Number,
      min: [0, "Dividend yield cannot be negative"],
    },
    peRatio: {
      type: Number,
      min: [0, "PE ratio cannot be negative"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    tags: {
      type: [String],
      default: [],
    },
    watchlist: {
      type: Boolean,
      default: false,
    },
    alerts: {
      enabled: {
        type: Boolean,
        default: false,
      },
      targetPrice: {
        type: Number,
        min: [0, "Target price cannot be negative"],
      },
      stopLoss: {
        type: Number,
        min: [0, "Stop loss cannot be negative"],
      },
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
userStockSchema.index({ userId: 1, symbol: 1 }, { unique: true });
userStockSchema.index({ userId: 1, symbol: 1, transactionDate: 1 });
userStockSchema.index({ userId: 1, transactionType: 1, transactionDate: -1 });
userStockSchema.index({ userId: 1, watchlist: 1 });
userStockSchema.index({ userId: 1, sector: 1 });
userStockSchema.index({ userId: 1, exchange: 1 });
userStockSchema.index({ symbol: 1, exchange: 1 });

// Virtual for calculating total investment
userStockSchema.virtual("totalInvestment").get(function () {
  if (this.purchasePrice !== undefined && this.quantity !== undefined) {
    return this.purchasePrice * this.quantity;
  }
  return null;
});

userStockSchema.virtual("totalValue").get(function () {
  return this.totalInvestment;
});

// Consolidated documents expose net shares; legacy rows retain their sign.
userStockSchema.virtual("signedQuantity").get(function () {
  if (this.transactions?.length) return this.quantity;
  return (this.transactionType === "sell" ? -1 : 1) * this.quantity;
});

userStockSchema.virtual("transactionValue").get(function () {
  return this.totalInvestment;
});

userStockSchema.virtual("price").get(function () {
  return this.purchasePrice;
});

// Virtual for calculating current value
userStockSchema.virtual("currentValue").get(function () {
  if (this.quantity !== undefined) {
    return (this.currentPrice ?? this.purchasePrice ?? 0) * this.quantity;
  }
  return null;
});

// Virtual for calculating profit/loss
userStockSchema.virtual("profitLoss").get(function () {
  const investment = this.totalInvestment;
  const current = this.currentValue;
  if (investment !== null && current !== null) {
    return current - investment;
  }
  return null;
});

// Virtual for calculating profit/loss percentage
userStockSchema.virtual("profitLossPercentage").get(function () {
  const investment = this.totalInvestment;
  const profitLoss = this.profitLoss;
  if (investment && profitLoss !== null) {
    return (profitLoss / investment) * 100;
  }
  return null;
});

// Replay trades using the same average-cost calculation as stock writes.
userStockSchema.statics.getValuedHoldings = async function (userId) {
  const rows = await this.find({ userId }).sort({ createdAt: 1, _id: 1 }).lean();
  const grouped = new Map();
  for (const row of rows) {
    const symbol = row.symbol.trim().toUpperCase();
    if (!grouped.has(symbol)) grouped.set(symbol, []);
    grouped.get(symbol).push(row);
  }
  const holdings = [...grouped].map(([symbol, stocks]) => {
    const latest = [...stocks].sort((a, b) => new Date(a.lastUpdated || a.createdAt) - new Date(b.lastUpdated || b.createdAt)).at(-1);
    const trades = stocks.flatMap(stockTransactions);
    const position = calculateHolding(trades);
    const currentPrice = latest.currentPrice ?? position.purchasePrice;
    const currentValue = position.quantity * currentPrice;
    const netInvestment = position.quantity * position.purchasePrice;
    const todayChange = position.quantity === 0 ? 0 : latest.previousClose != null && latest.currentPrice != null
      ? position.quantity * (currentPrice - latest.previousClose) : null;
    return {
      holdingId: String(stocks[0]._id), symbol, name: latest.name, icon: latest.icon,
      exchange: latest.exchange, sector: latest.sector, currency: latest.currency,
      currentPrice, previousClose: latest.previousClose ?? null,
      todayPriceChange: latest.currentPrice != null && latest.previousClose != null ? currentPrice - latest.previousClose : null,
      priceSource: latest.currentPrice == null ? "average_cost" : "stored",
      priceUpdatedAt: latest.lastUpdated,
      quantity: position.quantity, averagePurchasePrice: position.purchasePrice,
      netInvestment, currentValue,
      transactionCount: trades.length,
      buyTransactions: trades.filter((trade) => trade.transactionType !== "sell").length,
      sellTransactions: trades.filter((trade) => trade.transactionType === "sell").length,
      lastTransactionDate: position.transactionDate,
      ...holdingMetrics({ investedAmount: netInvestment, currentValue, todayChange }),
    };
  });
  const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  return holdings.map((holding) => ({ ...holding,
    holdingPercentage: totalValue > 0 ? Math.round(holding.currentValue / totalValue * 10000) / 100 : 0,
  })).sort((a, b) => b.currentValue - a.currentValue || a.symbol.localeCompare(b.symbol));
};

userStockSchema.statics.summarizeHoldings = function (holdings) {
  const totalInvestment = holdings.reduce((sum, row) => sum + row.netInvestment, 0);
  const totalCurrentValue = holdings.reduce((sum, row) => sum + row.currentValue, 0);
  const todayChange = holdings.some((row) => row.quantity > 0 && row.todayChange == null) ? null
    : holdings.reduce((sum, row) => sum + row.quantity * (row.currentPrice - (row.previousClose ?? row.currentPrice)), 0);
  const metrics = holdingMetrics({ investedAmount: totalInvestment, currentValue: totalCurrentValue, todayChange });
  return {
    totalInvestment, totalCurrentValue,
    totalQuantity: holdings.reduce((sum, row) => sum + row.quantity, 0),
    totalStocks: holdings.filter((row) => row.quantity > 0).length,
    totalTransactions: holdings.reduce((sum, row) => sum + row.transactionCount, 0),
    buyTransactions: holdings.reduce((sum, row) => sum + row.buyTransactions, 0),
    sellTransactions: holdings.reduce((sum, row) => sum + row.sellTransactions, 0),
    totalProfitLoss: metrics.profitLoss,
    totalProfitLossPercentage: metrics.profitLossPercentage,
    ...metrics,
  };
};
userStockSchema.statics.getUserPortfolioValue = async function (userId) {
  return this.summarizeHoldings(await this.getValuedHoldings(userId));
};
userStockSchema.statics.getStocksBySector = async function (userId) {
  const grouped = new Map();
  for (const holding of await this.getValuedHoldings(userId)) {
    const sector = holding.sector || "Uncategorized";
    if (!grouped.has(sector)) grouped.set(sector, []);
    grouped.get(sector).push(holding);
  }
  return [...grouped].map(([sector, holdings]) => {
    const summary = this.summarizeHoldings(holdings);
    return { _id: sector, sector, ...summary, count: summary.totalStocks,
      transactions: summary.totalTransactions, quantity: summary.totalQuantity };
  }).sort((a, b) => b.totalCurrentValue - a.totalCurrentValue);
};

userStockSchema.statics.getNetQuantity = async function (
  userId,
  { symbol, exchange, excludeId } = {},
) {
  const match = { userId: new mongoose.Types.ObjectId(userId), symbol };
  if (excludeId) match._id = { $ne: new mongoose.Types.ObjectId(excludeId) };

  const result = await this.aggregate([
    { $match: match },
    ...ledgerStages(),
    {
      $group: {
        _id: null,
        quantity: {
          $sum: {
            $multiply: [
              { $cond: [{ $eq: ["$transactionType", "sell"] }, -1, 1] },
              "$quantity",
            ],
          },
        },
      },
    },
  ]);

  return result[0]?.quantity || 0;
};

userStockSchema.statics.getUserHoldings = async function (userId) {
  return (await this.getValuedHoldings(userId)).filter((holding) => holding.quantity > 0);
};

for (const field of ["totalHoldingAmount", "todayChange", "todayChangePercentage", "todayChangeStatus", "profitLossStatus"]) {
  userStockSchema.virtual(field).get(function () {
    return holdingMetrics({
      investedAmount: this.quantity * (this.purchasePrice ?? 0),
      currentValue: this.quantity * (this.currentPrice ?? this.purchasePrice ?? 0),
      todayChange: this.quantity === 0 ? 0 : this.previousClose != null && this.currentPrice != null
        ? this.quantity * (this.currentPrice - this.previousClose) : null,
    })[field];
  });
}
userStockSchema.virtual("todayPriceChange").get(function () {
  return this.currentPrice != null && this.previousClose != null ? this.currentPrice - this.previousClose : null;
});

// Ensure virtuals are included in JSON
userStockSchema.set("toJSON", { virtuals: true });
userStockSchema.set("toObject", { virtuals: true });

export default mongoose.model("UserStock", userStockSchema);
