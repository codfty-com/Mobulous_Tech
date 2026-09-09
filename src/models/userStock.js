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
      min: [Number.MIN_VALUE, "Quantity must be greater than zero"],
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

// Signed fields make each record usable as a transaction ledger entry.
userStockSchema.virtual("signedQuantity").get(function () {
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
    { $sort: { transactionDate: 1, createdAt: 1 } },
    {
      $group: {
        _id: "$symbol",
        netQuantity: {
          $sum: {
            $cond: [
              { $eq: ["$transactionType", "sell"] },
              { $multiply: [-1, "$quantity"] },
              "$quantity",
            ],
          },
        },
        netInvestment: {
          $sum: {
            $multiply: [
              { $cond: [{ $eq: ["$transactionType", "sell"] }, -1, 1] },
              { $ifNull: ["$purchasePrice", 0] },
              "$quantity",
            ],
          },
        },
        currentPrice: { $last: { $ifNull: ["$currentPrice", "$purchasePrice"] } },
        transactions: { $sum: 1 },
        buyTransactions: { $sum: { $cond: [{ $eq: ["$transactionType", "buy"] }, 1, 0] } },
        sellTransactions: { $sum: { $cond: [{ $eq: ["$transactionType", "sell"] }, 1, 0] } },
      },
    },
    {
      $group: {
        _id: 0,
        totalInvestment: { $sum: "$netInvestment" },
        totalCurrentValue: {
          $sum: { $multiply: ["$netQuantity", { $ifNull: ["$currentPrice", 0] }] },
        },
        totalQuantity: { $sum: "$netQuantity" },
        totalStocks: { $sum: { $cond: [{ $gt: ["$netQuantity", 0] }, 1, 0] } },
        totalTransactions: { $sum: "$transactions" },
        buyTransactions: { $sum: "$buyTransactions" },
        sellTransactions: { $sum: "$sellTransactions" },
      },
    },
    {
      $project: {
        _id: 0,
        totalInvestment: 1,
        totalCurrentValue: 1,
        totalQuantity: 1,
        totalStocks: 1,
        totalTransactions: 1,
        buyTransactions: 1,
        sellTransactions: 1,
        totalProfitLoss: { $subtract: ["$totalCurrentValue", "$totalInvestment"] },
        totalProfitLossPercentage: {
          $cond: [
            { $eq: ["$totalInvestment", 0] },
            0,
            { $multiply: [{ $divide: [{ $subtract: ["$totalCurrentValue", "$totalInvestment"] }, "$totalInvestment"] }, 100] },
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
      totalQuantity: 0,
      totalStocks: 0,
      totalTransactions: 0,
      buyTransactions: 0,
      sellTransactions: 0,
      totalProfitLoss: 0,
      totalProfitLossPercentage: 0,
    }
  );
};

// Static method to get stocks by sector
userStockSchema.statics.getStocksBySector = async function (userId) {
  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $sort: { transactionDate: 1, createdAt: 1 } },
    {
      $group: {
        _id: { sector: { $ifNull: ["$sector", "Uncategorized"] }, symbol: "$symbol" },
        transactions: { $sum: 1 },
        quantity: {
          $sum: {
            $multiply: [
              { $cond: [{ $eq: ["$transactionType", "sell"] }, -1, 1] },
              "$quantity",
            ],
          },
        },
        totalInvestment: {
          $sum: {
            $multiply: [
              { $cond: [{ $eq: ["$transactionType", "sell"] }, -1, 1] },
              { $ifNull: ["$purchasePrice", 0] },
              "$quantity",
            ],
          },
        },
        currentPrice: { $last: { $ifNull: ["$currentPrice", "$purchasePrice"] } },
      },
    },
    {
      $group: {
        _id: "$_id.sector",
        count: { $sum: { $cond: [{ $gt: ["$quantity", 0] }, 1, 0] } },
        transactions: { $sum: "$transactions" },
        quantity: { $sum: "$quantity" },
        totalInvestment: { $sum: "$totalInvestment" },
        totalCurrentValue: {
          $sum: { $multiply: ["$quantity", { $ifNull: ["$currentPrice", 0] }] },
        },
      },
    },
    {
      $project: {
        sector: "$_id",
        count: 1,
        transactions: 1,
        quantity: 1,
        totalInvestment: 1,
        totalCurrentValue: 1,
        profitLoss: {
          $subtract: ["$totalCurrentValue", "$totalInvestment"],
        },
        profitLossPercentage: {
          $cond: [
            { $eq: ["$totalInvestment", 0] },
            0,
            { $multiply: [{ $divide: [{ $subtract: ["$totalCurrentValue", "$totalInvestment"] }, "$totalInvestment"] }, 100] },
          ],
        },
      },
    },
    { $sort: { totalCurrentValue: -1 } },
  ];

  return await this.aggregate(pipeline);
};

userStockSchema.statics.getNetQuantity = async function (
  userId,
  { symbol, exchange, excludeId } = {},
) {
  const match = { userId: new mongoose.Types.ObjectId(userId), symbol };
  if (excludeId) match._id = { $ne: new mongoose.Types.ObjectId(excludeId) };

  const result = await this.aggregate([
    { $match: match },
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
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $sort: { transactionDate: 1, createdAt: 1 } },
    {
      $group: {
        _id: "$symbol",
        name: { $last: "$name" },
        icon: { $last: "$icon" },
        exchange: { $last: "$exchange" },
        sector: { $last: "$sector" },
        currency: { $last: "$currency" },
        currentPrice: { $last: { $ifNull: ["$currentPrice", "$purchasePrice"] } },
        quantity: {
          $sum: {
            $multiply: [
              { $cond: [{ $eq: ["$transactionType", "sell"] }, -1, 1] },
              "$quantity",
            ],
          },
        },
        netInvestment: {
          $sum: {
            $multiply: [
              { $cond: [{ $eq: ["$transactionType", "sell"] }, -1, 1] },
              { $ifNull: ["$purchasePrice", 0] },
              "$quantity",
            ],
          },
        },
        transactionCount: { $sum: 1 },
        lastTransactionDate: { $max: "$transactionDate" },
      },
    },
    { $match: { quantity: { $gt: 0 } } },
    {
      $project: {
        _id: 0,
        symbol: "$_id",
        exchange: 1,
        name: 1,
        icon: 1,
        sector: 1,
        currency: 1,
        currentPrice: 1,
        quantity: 1,
        netInvestment: 1,
        currentValue: { $multiply: ["$quantity", { $ifNull: ["$currentPrice", 0] }] },
        transactionCount: 1,
        lastTransactionDate: 1,
      },
    },
    {
      $set: {
        profitLoss: { $subtract: ["$currentValue", "$netInvestment"] },
        profitLossPercentage: {
          $cond: [
            { $eq: ["$netInvestment", 0] },
            0,
            { $multiply: [{ $divide: [{ $subtract: ["$currentValue", "$netInvestment"] }, "$netInvestment"] }, 100] },
          ],
        },
      },
    },
    { $sort: { currentValue: -1, symbol: 1 } },
  ]);
};

// Ensure virtuals are included in JSON
userStockSchema.set("toJSON", { virtuals: true });
userStockSchema.set("toObject", { virtuals: true });

export default mongoose.model("UserStock", userStockSchema);
