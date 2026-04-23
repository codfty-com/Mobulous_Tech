import { createHash, randomInt } from "node:crypto";
import { env } from "../config/env.js";

const getOtpHash = (otp) => {
  const hashSecret = env.jwtSecret || env.emailUser || env.appName;

  return createHash("sha256")
    .update(`${otp}:${hashSecret}`)
    .digest("hex");
};

export const generateOtp = () => randomInt(100000, 1000000).toString();

export const createOtpRecord = () => {
  const otp = generateOtp();

  return {
    otp,
    otpHash: getOtpHash(otp),
    otpExpiry: new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000),
  };
};

export const matchesOtp = (storedOtp, incomingOtp) => {
  if (!storedOtp || !incomingOtp) return false;

  return storedOtp === incomingOtp || storedOtp === getOtpHash(incomingOtp);
};

export const isOtpExpired = (otpExpiry) =>
  !otpExpiry || new Date(otpExpiry).getTime() < Date.now();
