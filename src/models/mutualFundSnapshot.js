import mongoose from "mongoose";

const navHistorySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      trim: true,
    },
    navDate: Date,
    nav: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const mutualFundSnapshotSchema = new mongoose.Schema(
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
    fundHouse: {
      type: String,
      trim: true,
    },
    schemeType: {
      type: String,
      trim: true,
    },
    schemeCategory: {
      type: String,
      trim: true,
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
    latestNav: Number,
    latestNavDate: Date,
    latestNavDateText: {
      type: String,
      trim: true,
    },
    navHistory: {
      type: [navHistorySchema],
      default: [],
    },
    source: {
      type: String,
      default: "mfapi.in",
    },
    latestCachedUntil: Date,
    historyCachedUntil: Date,
    lastFetchedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("MutualFundSnapshot", mutualFundSnapshotSchema);
