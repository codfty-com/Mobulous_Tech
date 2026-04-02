import User from "../models/user.js";
import bcrypt from "bcryptjs";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User Not Found",
      });
    }
    // compare password
    const isMatch = await bcrypt.compare(password, user.password);

    // const isMatch = (await User.password) === password;
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid Password",
      });
    }

    res.status(201).json(user);
  } catch (error) {
    console.log(error, "log in failed");
  }
};
