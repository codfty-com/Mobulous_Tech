import User from "../models/user.js";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { sendEmail } from "../utils/sendEmail.js";
import { buildOtpEmail } from "../utils/otpEmailTemplate.js";
import { createOtpRecord, isOtpExpired, matchesOtp } from "../utils/otp.js";

const OTP_EXPIRY_MINUTES = env.otpExpiryMinutes;
const LOGIN_REDIRECT_URL = env.loginRedirectUrl;
const EMAIL_PASSWORD_METHOD = "email_password";
const GOOGLE_METHOD = "google";

const setSignupOtp = (user) => {
  const { otp, otpHash, otpExpiry } = createOtpRecord();

  user.otp = otpHash;
  user.otpExpiry = otpExpiry;

  return otp;
};

const sendSignupOtpEmail = async (email, otp) => {
  try {
    const emailContent = buildOtpEmail({
      otp,
      title: "Your OTP Code",
      purpose: "account verification",
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });

    await sendEmail(email, emailContent.subject, emailContent);

    return { sent: true };
  } catch (error) {
    console.error("Signup OTP email failed:", error.message);

    return {
      sent: false,
      error: "Signup OTP email could not be sent",
    };
  }
};

const buildSignupData = (user) => ({
  userId: user._id,
  email: user.email,
  isEmailVerified: user.isEmailVerified,
});

const sendEmailFailure = (res, emailDelivery) =>
  res.status(503).json({
    success: false,
    message:
      "Could not send verification OTP email. Please check email configuration and try again.",
    ...(!env.isProduction ? { error: emailDelivery.error } : {}),
  });

const shouldRedirectToLogin = (req) =>
  req.query?.redirect === "true" || req.get("accept")?.includes("text/html");

const sendSignupOtpSuccess = (req, res, message) => {
  if (shouldRedirectToLogin(req)) {
    return res.redirect(303, LOGIN_REDIRECT_URL);
  }

  return res.status(200).json({
    success: true,
    message,
    redirectTo: LOGIN_REDIRECT_URL,
  });
};

export const createUser = async (req, res) => {
  try {
    console.log("Incoming signup request");

    const { name, email, phone, password } = req.validated?.body || req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (
        existingUser.authMethods?.includes(GOOGLE_METHOD) &&
        !existingUser.authMethods?.includes(EMAIL_PASSWORD_METHOD)
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This email is already registered with Google login. Please continue with Google.",
        });
      }

      if (!existingUser.isEmailVerified) {
        existingUser.name = name;
        existingUser.phone = phone;
        existingUser.password = await bcrypt.hash(password, 10);
        existingUser.authMethods = Array.from(
          new Set([...(existingUser.authMethods || []), EMAIL_PASSWORD_METHOD]),
        );
        existingUser.lastLoginMethod = EMAIL_PASSWORD_METHOD;
        const signupOtp = setSignupOtp(existingUser);

        await existingUser.save();
        const emailDelivery = await sendSignupOtpEmail(
          existingUser.email,
          signupOtp,
        );

        if (!emailDelivery.sent) {
          return sendEmailFailure(res, emailDelivery);
        }

        return res.status(200).json({
          success: true,
          message:
            "Signup OTP resent successfully. Please verify your email before login.",
          data: buildSignupData(existingUser),
        });
      }

      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      authMethods: [EMAIL_PASSWORD_METHOD],
      lastLoginMethod: EMAIL_PASSWORD_METHOD,
      isEmailVerified: false,
    });

    const signupOtp = setSignupOtp(user);
    await user.save();
    const emailDelivery = await sendSignupOtpEmail(user.email, signupOtp);

    if (!emailDelivery.sent) {
      return sendEmailFailure(res, emailDelivery);
    }

    return res.status(201).json({
      success: true,
      message: "User created successfully. OTP sent to email for verification.",
      data: buildSignupData(user),
    });
  } catch (error) {
    console.error("Signup Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(!env.isProduction ? { error: error.message } : {}),
    });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.validated?.body || req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return sendSignupOtpSuccess(
        req,
        res,
        "Email already verified. Please login.",
      );
    }

    if (!matchesOtp(user.otp, otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (isOtpExpired(user.otpExpiry)) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please signup again to resend OTP.",
      });
    }

    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    return sendSignupOtpSuccess(
      req,
      res,
      "Email verified successfully. Please login.",
    );
  } catch (error) {
    console.error("Signup OTP Verify Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(!env.isProduction ? { error: error.message } : {}),
    });
  }
};
