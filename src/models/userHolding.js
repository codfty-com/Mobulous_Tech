import mongoose from "mongoose";

const userHoldingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true, index: true },
    categoryKey: { type: String, required: true, lowercase: true, trim: true, index: true },
    instrumentId: { type: mongoose.Schema.Types.ObjectId, ref: "Instrument", required: true, index: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "InvestmentAccount", default: null, index: true },
    quantity: { type: Number, required: true, min: Number.MIN_VALUE },
    averagePurchasePrice: { type: Number, required: true, min: 0 },
    investedAmount: { type: Number, required: true, min: 0 },
    source: { type: String, enum: ["manual", "broker_sync", "import"], default: "manual" },
    externalHoldingId: { type: String, trim: true, maxlength: 100 },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true },
);

userHoldingSchema.index({ userId: 1, instrumentId: 1, accountId: 1 }, { unique: true });
userHoldingSchema.index({ userId: 1, categoryId: 1, instrumentId: 1 });
userHoldingSchema.index({ userId: 1, externalHoldingId: 1 }, { unique: true, sparse: true });

export default mongoose.model("UserHolding", userHoldingSchema);
