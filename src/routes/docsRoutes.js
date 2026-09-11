import express from "express";
import { readFile } from "fs/promises";
import path from "path";
import { authenticateRequest } from "../middlewares/jwt.js";

const router = express.Router();

const apiListPath = path.resolve(process.cwd(), "apiList.md");

// This router is mounted before the application routers, so auth must be
// scoped to the documentation path rather than applied to every /api route.
router.use("/api-list", authenticateRequest);
router.get("/api-list", async (req, res) => {
  try {
    const markdown = await readFile(apiListPath, "utf8");

    res.type("text/markdown").status(200).send(markdown);
  } catch (error) {
    console.error("Read API list error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to read API list",
    });
  }
});

export default router;
