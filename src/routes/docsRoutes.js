import express from "express";
import { readFile } from "fs/promises";
import path from "path";

const router = express.Router();

const apiListPath = path.resolve(process.cwd(), "apiList.md");

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
