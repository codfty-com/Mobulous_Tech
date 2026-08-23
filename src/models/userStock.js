import mongoose from "mongoose";

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
userStockSchema.index({ userId: 1, symbol: 1 });
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

// Virtual for calculating current value
userStockSchema.virtual("currentValue").get(function () {
  if (this.currentPrice !== undefined && this.quantity !== undefined) {
    return this.currentPrice * this.quantity;
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

// Static method to get user's total portfolio value
userStockSchema.statics.getUserPortfolioValue = async function (userId) {
  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalInvestment: {
          $sum: { $multiply: ["$purchasePrice", "$quantity"] },
        },
        totalCurrentValue: {
          $sum: { $multiply: ["$currentPrice", "$quantity"] },
        },
        totalStocks: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        totalInvestment: 1,
        totalCurrentValue: 1,
        totalStocks: 1,
        totalProfitLoss: {
          $subtract: ["$totalCurrentValue", "$totalInvestment"],
        },
        totalProfitLossPercentage: {
          $multiply: [
            {
              $divide: [
                { $subtract: ["$totalCurrentValue", "$totalInvestment"] },
                "$totalInvestment",
              ],
            },
            100,
          ],
        },
      },
    },
  ];

  const result = await this.aggregate(pipeline);
  return (
    result[0] || {
      totalInvestment: 0,
      totalCurrentValue: 0,
      totalStocks: 0,
      totalProfitLoss: 0,
      totalProfitLossPercentage: 0,
    }
  );
};

// Static method to get stocks by sector
userStockSchema.statics.getStocksBySector = async function (userId) {
  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$sector",
        count: { $sum: 1 },
        totalInvestment: {
          $sum: { $multiply: ["$purchasePrice", "$quantity"] },
        },
        totalCurrentValue: {
          $sum: { $multiply: ["$currentPrice", "$quantity"] },
        },
      },
    },
    {
      $project: {
        sector: "$_id",
        count: 1,
        totalInvestment: 1,
        totalCurrentValue: 1,
        profitLoss: {
          $subtract: ["$totalCurrentValue", "$totalInvestment"],
        },
        profitLossPercentage: {
          $multiply: [
            {
              $divide: [
                { $subtract: ["$totalCurrentValue", "$totalInvestment"] },
                "$totalInvestment",
              ],
            },
            100,
          ],
        },
      },
    },
    { $sort: { totalCurrentValue: -1 } },
  ];

  return await this.aggregate(pipeline);
};

// Ensure virtuals are included in JSON
userStockSchema.set("toJSON", { virtuals: true });
userStockSchema.set("toObject", { virtuals: true });

export default mongoose.model("UserStock", userStockSchema);
