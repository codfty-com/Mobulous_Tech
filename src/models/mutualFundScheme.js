import mongoose from "mongoose";

const mutualFundSchemeSchema = new mongoose.Schema(
  {
    schemeCode: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    schemeName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    isinGrowth: {
      type: String,
      trim: true,
      default: null,
    },
    isinDivReinvestment: {
      type: String,
      trim: true,
      default: null,
    },
    source: {
      type: String,
      default: "mfapi.in",
    },
    cachedUntil: {
      type: Date,
      required: true,
    },
    lastFetchedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

mutualFundSchemeSchema.index({ schemeName: "text" });

export default mongoose.model("MutualFundScheme", mutualFundSchemeSchema);
