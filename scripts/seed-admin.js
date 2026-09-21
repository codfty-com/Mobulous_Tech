import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../src/config/db.js";
import User from "../src/models/user.js";
import { adminResetPasswordSchema } from "../src/validators/adminAuth.validators.js";

try {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const validation = adminResetPasswordSchema.body({ email, newPassword: password, otp: "000000" });
  if (!validation.success) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters, at most 72 bytes) before running the seed.");
  await connectDB();
  await User.init();
  const existing = await User.findOne({ email });
  if (existing && !existing.admin) throw new Error("This email belongs to a non-admin account; refusing to promote it automatically.");
  if (existing) {
    console.log("Admin already exists; existing credentials were preserved.");
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await User.updateOne({ email }, { $setOnInsert: {
      name: "Asset Heaven Admin", email, password: passwordHash, admin: true,
      isEmailVerified: true, isDeleted: false, authMethods: ["email_password"],
      lastLoginMethod: "email_password", adminTokenVersion: 0,
    } }, { upsert: true, runValidators: true });
    const admin = await User.findOne({ email });
    if (!admin?.admin) throw new Error("Email was claimed by a non-admin account during setup; no privileges were changed.");
    console.log(`Admin saved in MongoDB: ${admin.email}`);
  }
} catch (error) {
  console.error("Admin seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
