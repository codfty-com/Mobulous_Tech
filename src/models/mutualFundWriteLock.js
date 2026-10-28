import mongoose from "mongoose";

const mutualFundWriteLockSchema = new mongoose.Schema(
  { _id: { type: String, required: true }, revision: { type: Number, default: 0 } },
  { versionKey: false, timestamps: true },
);

export default mongoose.model("MutualFundWriteLock", mutualFundWriteLockSchema);
