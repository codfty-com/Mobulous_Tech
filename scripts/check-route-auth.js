import assert from "node:assert/strict";
import { env } from "../src/config/env.js";
import assetsRoutes from "../src/routes/assetsRoutes.js";
import authRoutes from "../src/routes/authRoutes.js";
import docsRoutes from "../src/routes/docsRoutes.js";
import expenseRoutes from "../src/routes/expenseRoutes.js";
import marketDataRoutes from "../src/routes/marketDataRoutes.js";
import mutualFundDataRoutes from "../src/routes/mutualFundDataRoutes.js";
import mutualFundHoldingRoutes from "../src/routes/mutualFundHoldingRoutes.js";
import portfolioRoutes from "../src/routes/portfolioRoutes.js";
import stockRoutes from "../src/routes/stockRoutes.js";
import userRoutes from "../src/routes/userRoutes.js";

const requestWithoutToken = (router, method, url) =>
  new Promise((resolve, reject) => {
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ statusCode: this.statusCode, body }); return this; },
    };
    router.handle(
      { method, url, originalUrl: url, query: {}, body: {}, get: () => "" },
      response,
      reject,
    );
  });

const authConfig = { skip: env.skipJwtAuthForTesting, secret: env.jwtSecret };
env.skipJwtAuthForTesting = false;
env.jwtSecret = "route-auth-test-secret";

try {
  const protectedRequests = [
    [assetsRoutes, "GET", "/assets"],
    [authRoutes, "POST", "/auth/revoke-token"],
    [docsRoutes, "GET", "/api-list"],
    [expenseRoutes, "GET", "/expenses/categories"],
    [marketDataRoutes, "GET", "/markets"],
    [mutualFundDataRoutes, "GET", "/mutual-funds"],
    [mutualFundHoldingRoutes, "GET", "/mutual-fund-holdings"],
    [portfolioRoutes, "GET", "/portfolio/dashboard"],
    [stockRoutes, "GET", "/stocks"],
    [userRoutes, "GET", "/admin/users"],
  ];

  for (const [router, method, url] of protectedRequests) {
    const response = await requestWithoutToken(router, method, url);
    assert.equal(response.statusCode, 401, `${method} ${url} must require a Bearer token`);
    assert.equal(response.body.success, false);
  }
} finally {
  env.skipJwtAuthForTesting = authConfig.skip;
  env.jwtSecret = authConfig.secret;
}

console.log("All protected route groups reject requests without a Bearer token.");
