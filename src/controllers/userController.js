import User from "../models/user.js";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

const OTP_EXPIRY_MINUTES = 5;

const generateOtp = () => randomInt(100000, 1000000).toString();

const setSignupOtp = (user) => {
  user.otp = generateOtp();
  user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
};

const sendSignupOtpEmail = async (email, otp) => {
  await sendEmail(
    email,
    "OTP for Signup Verification",
    `Your signup OTP is ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`,
  );
};

export const createUser = async (req, res) => {
  try {
    console.log("Incoming signup request");

    const { name, phone, password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        existingUser.name = name;
        existingUser.phone = phone;
        existingUser.password = await bcrypt.hash(password, 10);
        setSignupOtp(existingUser);

        await existingUser.save();
        await sendSignupOtpEmail(existingUser.email, existingUser.otp);

        return res.status(200).json({
          success: true,
          message:
            "Signup OTP resent successfully. Please verify your email before login.",
          data: {
            userId: existingUser._id,
            email: existingUser.email,
            isEmailVerified: existingUser.isEmailVerified,
          },
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
      isEmailVerified: false,
    });

    setSignupOtp(user);
    await user.save();
    await sendSignupOtpEmail(user.email, user.otp);

    return res.status(201).json({
      success: true,
      message: "User created successfully. OTP sent to email for verification.",
      data: {
        userId: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp?.toString();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified. Please login.",
        redirectTo: "/login",
      });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please signup again to resend OTP.",
      });
    }

    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Please login.",
      redirectTo: "/login",
    });
  } catch (error) {
    console.error("Signup OTP Verify Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllusers = async (req, res) => {
  try {
    const users = await User.find().select("-password -otp -otpExpiry");

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
