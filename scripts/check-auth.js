import assert from "node:assert/strict";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyPasswordOtpSchema,
} from "../src/validators/auth.validators.js";

const forgot = forgotPasswordSchema.body({ email: "  USER@Example.com " });
assert.equal(forgot.success, true);
assert.equal(forgot.data.email, "user@example.com");

const verify = verifyPasswordOtpSchema.body({
  email: "user@example.com",
  otp: 123456,
});
assert.equal(verify.success, true);
assert.equal(verify.data.otp, "123456");

const resetWithoutOtp = resetPasswordSchema.body({
  email: "user@example.com",
  newPassword: "NewSecurePass456",
});
assert.equal(resetWithoutOtp.success, false);
assert(resetWithoutOtp.errors.includes("otp is required"));

const validReset = resetPasswordSchema.body({
  email: " USER@example.com ",
  otp: "123456",
  newPassword: "NewSecurePass456",
});
assert.equal(validReset.success, true);
assert.deepEqual(validReset.data, {
  email: "user@example.com",
  otp: "123456",
  newPassword: "NewSecurePass456",
});

console.log("Authentication and password-reset validation checks passed.");
