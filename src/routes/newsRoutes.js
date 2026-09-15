import express from "express";
import {
  getGlobalMarketNews,
  getIndiaMarketNews,
} from "../controllers/news.controller.js";

const router = express.Router();

router.get("/market-news", getIndiaMarketNews);
router.get("/market-news/global", getGlobalMarketNews);

export default router;
