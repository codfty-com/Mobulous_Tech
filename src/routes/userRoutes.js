import express from "express";
import { createUser, verifySignupOtp } from "../controllers/userController.js";
import { getAllusers } from "../controllers/allUserList.js";
import {
  getUserProfileById,
  updateUserProfileById,
} from "../controllers/userProfileController.js";
import {
  loginUser,
  loginWithGoogle,
} from "../controllers/userLoginController.js";

const router = express.Router();
const getUsers = (req, res) =>
  req.query._id || req.query.id
    ? getUserProfileById(req, res)
    : getAllusers(req, res);

router.post("/create-user", createUser);
router.post(["/verify-email-otp"], verifySignupOtp);
router.get("/users", getUsers);
router.get("/users/:_id", getUserProfileById);
router.patch("/users/:_id", updateUserProfileById);
router.post("/login-user", loginUser);
router.post("/login-google", loginWithGoogle);

export default router;
