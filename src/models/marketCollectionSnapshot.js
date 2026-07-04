import mongoose from "mongoose";

const marketCollectionSnapshotSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    collectionType: {
      type: String,
      required: true,
      trim: true,
    },
    listId: {
      type: String,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    lang: {
      type: String,
      trim: true,
    },
    requestedCount: Number,
    itemCount: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      default: "yahoo-finance2",
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    data: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
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

export default mongoose.model(
  "MarketCollectionSnapshot",
  marketCollectionSnapshotSchema,
);
