import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    deviceInfo: {
      userAgent: String,
      ip: String,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
refreshTokenSchema.index({ token: 1, isRevoked: 1 });
refreshTokenSchema.index({ expiresAt: 1, isRevoked: 1 });

// Method to check if token is valid
refreshTokenSchema.methods.isValid = function () {
  return !this.isRevoked && this.expiresAt > new Date();
};

// Static method to clean up expired tokens
refreshTokenSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
  return result.deletedCount;
};

// Static method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllForUser = async function (userId) {
  const result = await this.updateMany(
    { userId, isRevoked: false },
    { $set: { isRevoked: true } }
  );
  return result.modifiedCount;
};

// Static method to revoke old tokens (keep only the latest N tokens per user)
refreshTokenSchema.statics.revokeOldTokens = async function (
  userId,
  keepCount = 5
) {
  const tokens = await this.find({ userId, isRevoked: false })
    .sort({ createdAt: -1 })
    .skip(keepCount);

  if (tokens.length === 0) return 0;

  const tokenIds = tokens.map((t) => t._id);
  const result = await this.updateMany(
    { _id: { $in: tokenIds } },
    { $set: { isRevoked: true } }
  );

  return result.modifiedCount;
};

export default mongoose.model("RefreshToken", refreshTokenSchema);
