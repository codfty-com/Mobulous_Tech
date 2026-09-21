import express from "express";
import userRoutes from "./userRoutes.js";
import resetPassRoutes from "./resetPassRoutes.js";
import indicesRoutes from "./indicesRoutes.js";
import newsRoutes from "./newsRoutes.js";
import mutualFundDataRoutes from "./mutualFundDataRoutes.js";
import authRoutes from "./authRoutes.js";
import stockRoutes from "./stockRoutes.js";
import mutualFundHoldingRoutes from "./mutualFundHoldingRoutes.js";
import expenseRoutes from "./expenseRoutes.js";
import portfolioRoutes from "./portfolioRoutes.js";
import adminRoutes from "./admin/adminRoutes.js";
import indianStockMarketRoutes from "./indianStockMarketRoutes.js";

// Share the production route composition with HTTP integration tests so that
// authentication middleware cannot silently intercept another router's URLs.
const apiRouter = express.Router();
apiRouter.use(userRoutes);
apiRouter.use(resetPassRoutes);
apiRouter.use(indicesRoutes);
apiRouter.use(indianStockMarketRoutes);
apiRouter.use(newsRoutes);
apiRouter.use(mutualFundDataRoutes);
apiRouter.use(authRoutes);
apiRouter.use(stockRoutes);
apiRouter.use(mutualFundHoldingRoutes);
apiRouter.use(expenseRoutes);
apiRouter.use(portfolioRoutes);
apiRouter.use("/admin", adminRoutes);

export default apiRouter;
