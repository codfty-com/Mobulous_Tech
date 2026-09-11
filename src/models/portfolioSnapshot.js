import mongoose from "mongoose";

const categoryValueSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
    categoryKey: { type: String, required: true, lowercase: true, trim: true },
    investedAmount: { type: Number, required: true, min: 0 },
    currentValue: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const portfolioSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    snapshotDate: { type: Date, required: true },
    totalInvestedAmount: { type: Number, required: true, min: 0 },
    totalCurrentValue: { type: Number, required: true, min: 0 },
    categoryValues: { type: [categoryValueSchema], default: [] },
  },
  { timestamps: true },
);

portfolioSnapshotSchema.index({ userId: 1, snapshotDate: -1 }, { unique: true });

export default mongoose.model("PortfolioSnapshot", portfolioSnapshotSchema);
