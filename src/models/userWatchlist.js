import mongoose from "mongoose";

const userWatchlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    stockData: { type: mongoose.Schema.Types.Mixed, required: true },
    currentStatus: { type: mongoose.Schema.Types.Mixed, default: null },
    oneYearReturn: { type: mongoose.Schema.Types.Mixed, default: null },
    companyDetails: { type: mongoose.Schema.Types.Mixed, default: null },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "userwishlists" },
);

userWatchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });
userWatchlistSchema.index({ userId: 1, lastUpdated: -1 });

export default mongoose.model("UserWatchlist", userWatchlistSchema);
