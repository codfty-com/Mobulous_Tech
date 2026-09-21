const validate = (fields) => ({
  body(body) {
    const errors = [];
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const data = { email };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email must be a valid email address");
    for (const field of fields) {
      const value = body[field];
      data[field] = value;
      if (field === "otp") {
        if (typeof value !== "string" || !/^\d{6}$/.test(value)) errors.push("otp must be a 6 digit string");
      } else if (typeof value !== "string" || !value.length) {
        errors.push(`${field} is required and must be a string`);
      } else if (Buffer.byteLength(value, "utf8") > 72) {
        errors.push(`${field} must not exceed 72 bytes`);
      } else if (field === "newPassword" && value.length < 8) {
        errors.push("newPassword must be at least 8 characters long");
      }
    }
    return errors.length ? { success: false, errors } : { success: true, data };
  },
});

export const adminLoginSchema = validate(["password"]);
export const adminForgotPasswordSchema = validate([]);
export const adminVerifyOtpSchema = validate(["otp"]);
export const adminResetPasswordSchema = validate(["otp", "newPassword"]);
