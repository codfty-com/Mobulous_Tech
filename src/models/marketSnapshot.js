import mongoose from "mongoose";

const marketSnapshotSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    symbol: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    exchange: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    marketState: {
      type: String,
      trim: true,
    },
    price: Number,
    change: Number,
    changePercent: Number,
    open: Number,
    dayHigh: Number,
    dayLow: Number,
    previousClose: Number,
    volume: Number,
    fiftyTwoWeekHigh: Number,
    fiftyTwoWeekLow: Number,
    marketTime: Date,
    source: {
      type: String,
      default: "yahoo-finance2",
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

export default mongoose.model("MarketSnapshot", marketSnapshotSchema);
