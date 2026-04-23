import User from "../models/user.js";
import bcrypt from "bcryptjs";
import { verifyGoogleIdToken } from "../services/googleAuth.service.js";

const EMAIL_PASSWORD_METHOD = "email_password";
const GOOGLE_METHOD = "google";

const getAuthMethods = (user) => {
  const methods = Array.isArray(user.authMethods)
    ? user.authMethods.filter(Boolean)
    : [];

  if (methods.length) {
    return methods;
  }

  return user.password ? [EMAIL_PASSWORD_METHOD] : [];
};

const setAuthMethods = (user, methods) => {
  user.authMethods = Array.from(new Set(methods.filter(Boolean)));
};

const sanitizeUser = (user) => {
  const userData = user.toObject();
  delete userData.password;
  delete userData.otp;
  delete userData.otpExpiry;

  return userData;
};

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

    const authMethods = getAuthMethods(user);

    if (!authMethods.includes(EMAIL_PASSWORD_METHOD) || !user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google login. Please continue with Google.",
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

    setAuthMethods(user, [...authMethods, EMAIL_PASSWORD_METHOD]);
    user.lastLoginMethod = EMAIL_PASSWORD_METHOD;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: sanitizeUser(user),
    });
  } catch (error) {
    console.error(error, "log in failed");

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const loginWithGoogle = async (req, res) => {
  try {
    const idToken = req.body.idToken?.trim();

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google idToken is required",
      });
    }

    const googleProfile = await verifyGoogleIdToken(idToken);

    let user = await User.findOne({
      $or: [{ googleId: googleProfile.googleId }, { email: googleProfile.email }],
    });

    let isNewUser = false;

    if (!user) {
      user = new User({
        name: googleProfile.name,
        email: googleProfile.email,
        googleId: googleProfile.googleId,
        profilePicture: googleProfile.profilePicture,
        authMethods: [GOOGLE_METHOD],
        lastLoginMethod: GOOGLE_METHOD,
        isEmailVerified: true,
      });
      isNewUser = true;
    } else {
      if (user.googleId && user.googleId !== googleProfile.googleId) {
        return res.status(409).json({
          success: false,
          message:
            "This email is already linked with a different Google account.",
        });
      }

      const authMethods = getAuthMethods(user);

      user.googleId = googleProfile.googleId;
      user.profilePicture =
        googleProfile.profilePicture || user.profilePicture || "";
      user.name = user.name || googleProfile.name;
      user.isEmailVerified = true;
      setAuthMethods(user, [...authMethods, GOOGLE_METHOD]);
      user.lastLoginMethod = GOOGLE_METHOD;
    }

    await user.save();

    return res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser
        ? "Google login successful. New account created."
        : "Google login successful",
      data: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Google login failed:", error);

    const statusCode =
      error.message === "Google login is not configured on the server"
        ? 500
        : error.code === 11000
          ? 409
          : /token|verified|payload/i.test(error.message)
            ? 401
            : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? error.message
          : statusCode === 409
            ? "This Google account is already linked with another user."
          : "Invalid or expired Google token",
    });
  }
};
