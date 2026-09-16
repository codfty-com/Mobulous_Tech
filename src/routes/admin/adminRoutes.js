import express from "express";
import adminUsersRoutes from "./adminUsersRoutes.js";

const router = express.Router();

router.use("/users", adminUsersRoutes);

export default router;
