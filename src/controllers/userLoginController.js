import User from "../models/user.js";
import bcrypt from "bcryptjs";

export const loginUser = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User Not Found",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email OTP before login",
      });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);

    // const isMatch = (await User.password) === password;
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const userData = user.toObject();
    delete userData.password;
    delete userData.otp;
    delete userData.otpExpiry;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: userData,
    });
  } catch (error) {
    console.error(error, "log in failed");

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
