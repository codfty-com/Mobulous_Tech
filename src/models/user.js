import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: String,
    phone: Number,
    otp: String,
    otpExpiry: Date,
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
