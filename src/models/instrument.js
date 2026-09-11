import mongoose from "mongoose";

const instrumentSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true, index: true },
    categoryKey: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    symbol: { type: String, trim: true, uppercase: true, maxlength: 50 },
    isin: { type: String, trim: true, uppercase: true, maxlength: 20 },
    exchange: { type: String, trim: true, uppercase: true, maxlength: 30 },
    currency: { type: String, default: "INR", trim: true, uppercase: true, maxlength: 10 },
    currentPrice: { type: Number, required: true, min: 0 },
    previousClose: { type: Number, min: 0 },
    priceType: { type: String, enum: ["market_price", "nav", "manual"], required: true },
    priceUpdatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

instrumentSchema.index({ categoryId: 1, symbol: 1, exchange: 1 }, { unique: true, sparse: true });
instrumentSchema.index({ isin: 1 }, { unique: true, sparse: true });
instrumentSchema.index({ categoryKey: 1, isActive: 1, name: 1 });

export default mongoose.model("Instrument", instrumentSchema);
