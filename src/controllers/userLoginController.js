import User from "../models/user.js";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User Not Found",
      });
    }
    const isMatch = (await User.password) === password;
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
