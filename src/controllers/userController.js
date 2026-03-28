import User from "../models/user.js";
import bcrypt from "bcryptjs";

//create new user
export const createUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    // hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
    });
    const savedUser = await user.save();
    res.status(201).json({
      message: "User created successfully",
      data: savedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
    console.log(error, "something went wrong");
  }
};

//get all users

export const getAllusers = async (req, res) => {
  try {
    const getuser = await User.find();
    res.status(201).json(getuser);
  } catch (error) {}
};
