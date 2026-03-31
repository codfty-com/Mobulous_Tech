import User from "../models/user.js";
import bcrypt from "bcryptjs";

// ✅ Create new user
export const createUser = async (req, res) => {
  try {
    console.log("👉 Incoming signup request");

    const { name, email, phone, password } = req.body;

    // ✅ Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // ✅ Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create user
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    console.error("❌ Signup Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ✅ Get all users
export const getAllusers = async (req, res) => {
  try {
    const users = await User.find();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("❌ Get Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
