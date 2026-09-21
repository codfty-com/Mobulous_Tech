import mongoose from "mongoose";

const AUTH_METHODS = ["email_password", "google"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: String,
    phone: {
      type: String,
      trim: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    profilePicture: String,
    authMethods: {
      type: [
        {
          type: String,
          enum: AUTH_METHODS,
        },
      ],
      default: ["email_password"],
    },
    lastLoginMethod: {
      type: String,
      enum: AUTH_METHODS,
      default: "email_password",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    // Set only by trusted server-side administration workflows. This field is
    // intentionally never accepted from public signup or profile updates.
    admin: {
      type: Boolean,
      default: false,
    },
    otp: String,
    otpExpiry: Date,
    adminTokenVersion: { type: Number, default: 0 },
    adminResetHash: { type: String, select: false },
    adminResetExpiry: { type: Date, select: false },
    adminResetAttempts: { type: Number, select: false },
    adminResetSentAt: { type: Date, select: false },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
