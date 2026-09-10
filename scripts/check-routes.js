import assert from "node:assert/strict";
import assetsRoutes from "../src/routes/assetsRoutes.js";
import authRoutes from "../src/routes/authRoutes.js";
import expenseRoutes from "../src/routes/expenseRoutes.js";
import marketDataRoutes from "../src/routes/marketDataRoutes.js";
import mutualFundDataRoutes from "../src/routes/mutualFundDataRoutes.js";
import mutualFundHoldingRoutes from "../src/routes/mutualFundHoldingRoutes.js";
import resetPassRoutes from "../src/routes/resetPassRoutes.js";
import stockRoutes from "../src/routes/stockRoutes.js";
import userRoutes from "../src/routes/userRoutes.js";

const routeSignatures = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map(
        (method) => `${method.toUpperCase()} ${layer.route.path}`,
      ),
    );

const cases = [
  [assetsRoutes, ["GET /assets", "GET /assets/net-worth", "POST /assets", "GET /assets/:id", "PATCH /assets/:id", "PUT /assets/:id", "DELETE /assets/:id"]],
  [authRoutes, ["POST /auth/refresh-token", "POST /auth/revoke-token", "POST /auth/logout", "POST /auth/logout-all", "GET /auth/me", "POST /auth/change-password", "POST /auth/cleanup-tokens"]],
  [expenseRoutes, ["GET /expenses/categories", "POST /expenses", "GET /expenses", "GET /expenses/summary", "GET /expenses/:id", "PATCH /expenses/:id", "PUT /expenses/:id", "DELETE /expenses/:id"]],
  [marketDataRoutes, ["GET /markets", "GET /stocks", "GET /market-trend-lists", "GET /market-data", "GET /market-data/trending", "GET /market-data/movers", "GET /market-data/movers/:listId/:id", "GET /market-data/top-gainers/details", "GET /market-data/top-gainers/:id", "GET /market-data/top-losers/:id", "GET /market-data/top-shares", "GET /market-data/top-shares/:period", "GET /market-data/overview", "GET /market-data/home", "GET /market-data/:marketKey", "GET /market-news", "GET /market-news/live", "GET /market-news/related", "GET /market-news/symbol/:symbol", "POST /market-data/refresh"]],
  [mutualFundDataRoutes, ["GET /mutual-funds", "GET /mutual-fund-data", "GET /mutual-fund-data/:schemeCode/history", "GET /mutual-fund-data/:schemeCode", "POST /mutual-fund-data/refresh"]],
  [mutualFundHoldingRoutes, ["POST /mutual-fund-holdings", "GET /mutual-fund-holdings", "GET /mutual-fund-holdings/:id", "PATCH /mutual-fund-holdings/:id", "PUT /mutual-fund-holdings/:id", "DELETE /mutual-fund-holdings/:id"]],
  [resetPassRoutes, ["POST /forgot-password", "POST /verify-otp", "POST /reset-password"]],
  [stockRoutes, ["POST /stocks", "GET /stocks", "GET /stocks/summary", "GET /stocks/holdings", "GET /stocks/net-worth", "GET /stocks/watchlist", "PATCH /stocks/prices", "GET /stocks/:id", "PUT /stocks/:id", "PATCH /stocks/:id", "PATCH /stocks/:id/watchlist", "PATCH /stocks/:id/alerts", "DELETE /stocks/:id"]],
  [userRoutes, ["POST /create-user", "POST /verify-email-otp", "POST /login-user", "POST /login-google", "GET /admin/users", "GET /admin/users/search", "GET /admin/users/:_id", "DELETE /admin/users/:_id", "PATCH /users/:_id"]],
];

for (const [router, expected] of cases) {
  assert.deepEqual(routeSignatures(router), expected);
}

console.log(`Route registration checks passed for ${cases.flatMap(([router]) => routeSignatures(router)).length} method/path combinations.`);
