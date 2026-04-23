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
    phone: Number,
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
    otp: String,
    otpExpiry: Date,
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
