import mongoose from "mongoose";

const investmentAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: {
      type: String,
      enum: ["zerodha", "groww", "angel_one", "upstox", "manual"],
      required: true,
      lowercase: true,
      trim: true,
    },
    accountName: { type: String, required: true, trim: true, maxlength: 100 },
    externalAccountId: { type: String, trim: true, maxlength: 100 },
    status: { type: String, enum: ["active", "inactive", "disconnected"], default: "active", index: true },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true },
);

investmentAccountSchema.index({ userId: 1, provider: 1, externalAccountId: 1 }, { unique: true, sparse: true });
investmentAccountSchema.index({ userId: 1, status: 1 });

export default mongoose.model("InvestmentAccount", investmentAccountSchema);
