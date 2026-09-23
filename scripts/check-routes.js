import assert from "node:assert/strict";
import assetsRoutes from "../src/routes/assetsRoutes.js";
import authRoutes from "../src/routes/authRoutes.js";
import expenseRoutes from "../src/routes/expenseRoutes.js";
import indicesRoutes from "../src/routes/indicesRoutes.js";
import indianStockMarketRoutes from "../src/routes/indianStockMarketRoutes.js";
import newsRoutes from "../src/routes/newsRoutes.js";
import mutualFundDataRoutes from "../src/routes/mutualFundDataRoutes.js";
import mutualFundHoldingRoutes from "../src/routes/mutualFundHoldingRoutes.js";
import resetPassRoutes from "../src/routes/resetPassRoutes.js";
import stockRoutes from "../src/routes/stockRoutes.js";
import portfolioRoutes from "../src/routes/portfolioRoutes.js";
import userRoutes from "../src/routes/userRoutes.js";
import adminUsersRoutes from "../src/routes/admin/adminUsersRoutes.js";
import adminRoutes from "../src/routes/admin/adminRoutes.js";

const routeSignatures = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map(
        (method) => `${method.toUpperCase()} ${layer.route.path}`,
      ),
    );

const cases = [
  [adminRoutes, ["POST /login", "POST /forgot-password", "POST /verify-otp", "POST /reset-password"]],
  [assetsRoutes, ["GET /assets", "GET /assets/net-worth", "GET /assets/:id"]],
  [authRoutes, ["POST /auth/refresh-token", "POST /auth/revoke-token", "POST /auth/logout", "POST /auth/logout-all", "GET /auth/me", "POST /auth/change-password"]],
  [expenseRoutes, ["GET /expenses/categories", "POST /expenses", "GET /expenses", "GET /expenses/summary", "GET /expenses/:id", "PATCH /expenses/:id", "PUT /expenses/:id", "DELETE /expenses/:id"]],
  [indicesRoutes, ["GET /indices"]],
  [indianStockMarketRoutes, ["GET /indian-market/top-99-stocks/:period", "GET /indian-market/top-gainers", "GET /indian-market/top-gainers/:symbol", "GET /indian-market/top-losers", "GET /indian-market/top-losers/:symbol"]],
  [newsRoutes, ["GET /market-news", "GET /market-news/global"]],
  [mutualFundDataRoutes, ["GET /mutual-funds", "GET /mutual-fund-data", "GET /mutual-fund-data/:schemeCode/history", "GET /mutual-fund-data/:schemeCode"]],
  [mutualFundHoldingRoutes, ["POST /mutual-fund-holdings", "GET /mutual-fund-holdings", "GET /mutual-fund-holdings/:id", "PATCH /mutual-fund-holdings/:id", "PUT /mutual-fund-holdings/:id", "DELETE /mutual-fund-holdings/:id"]],
  [resetPassRoutes, ["POST /forgot-password", "POST /verify-otp", "POST /reset-password"]],
  [stockRoutes, ["POST /stocks", "GET /stocks", "GET /stocks/lookup", "GET /stocks/summary", "GET /stocks/holdings", "GET /stocks/net-worth", "GET /stocks/watchlist", "PATCH /stocks/prices", "GET /stocks/:id", "PUT /stocks/:id", "PATCH /stocks/:id", "PATCH /stocks/:id/watchlist", "PATCH /stocks/:id/alerts", "DELETE /stocks/:id"]],
  [portfolioRoutes, ["GET /portfolio/dashboard", "GET /portfolio/history", "GET /portfolio/categories/:categoryKey", "GET /portfolio/accounts", "POST /portfolio/accounts", "PATCH /portfolio/accounts/:accountId", "DELETE /portfolio/accounts/:accountId", "GET /portfolio/instruments", "POST /portfolio/holdings", "PATCH /portfolio/holdings/:holdingId", "DELETE /portfolio/holdings/:holdingId"]],
  [userRoutes, ["POST /create-user", "POST /verify-email-otp", "POST /login-user", "POST /login-google", "GET /users/:_id", "PATCH /users/:_id"]],
  [adminUsersRoutes, ["GET /", "GET /:_id", "DELETE /:_id", "DELETE /:_id/permanent"]],
];

for (const [router, expected] of cases) {
  assert.deepEqual(routeSignatures(router), expected);
}

console.log(`Route registration checks passed for ${cases.flatMap(([router]) => routeSignatures(router)).length} method/path combinations.`);
