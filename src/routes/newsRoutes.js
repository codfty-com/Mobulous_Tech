import express from "express";
import {
  getGlobalMarketNews,
  getIndiaMarketNews,
  getLiveMarketNews,
  getMarketNews,
  getMarketNewsBySymbol,
  getRelatedMarketNews,
} from "../controllers/news.controller.js";

const router = express.Router();

router.get("/market-news", getMarketNews);
router.get("/market-news/global", getGlobalMarketNews);
router.get("/market-news/india", getIndiaMarketNews);
router.get("/market-news/live", getLiveMarketNews);
router.get("/market-news/related", getRelatedMarketNews);
router.get("/market-news/symbol/:symbol", getMarketNewsBySymbol);

export default router;
