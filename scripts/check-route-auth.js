import assert from "node:assert/strict";
import { env } from "../src/config/env.js";
import { generateAccessToken } from "../src/services/jwt.service.js";
import User from "../src/models/user.js";
import assetsRoutes from "../src/routes/assetsRoutes.js";
import authRoutes from "../src/routes/authRoutes.js";
import docsRoutes from "../src/routes/docsRoutes.js";
import expenseRoutes from "../src/routes/expenseRoutes.js";
import mutualFundDataRoutes from "../src/routes/mutualFundDataRoutes.js";
import mutualFundHoldingRoutes from "../src/routes/mutualFundHoldingRoutes.js";
import portfolioRoutes from "../src/routes/portfolioRoutes.js";
import stockRoutes from "../src/routes/stockRoutes.js";
import userRoutes from "../src/routes/userRoutes.js";
import adminUsersRoutes from "../src/routes/admin/adminUsersRoutes.js";

const requestRouter = (router, method, url, authorization = "") =>
  new Promise((resolve, reject) => {
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ statusCode: this.statusCode, body }); return this; },
    };
    router.handle(
      {
        method,
        url,
        originalUrl: url,
        query: {},
        body: {},
        get: (name) => name.toLowerCase() === "authorization" ? authorization : "",
      },
      response,
      reject,
    );
  });

const authConfig = { skip: env.skipJwtAuthForTesting, secret: env.jwtSecret };
const originalFindUser = User.findOne;
User.findOne = async () => ({ tokenVersion: 0, isEmailVerified: true });
env.skipJwtAuthForTesting = false;
env.jwtSecret = "route-auth-test-secret";

try {
  const protectedRequests = [
    [assetsRoutes, "GET", "/assets"],
    [authRoutes, "POST", "/auth/revoke-token"],
    [docsRoutes, "GET", "/api-list"],
    [expenseRoutes, "GET", "/expenses/categories"],
    [mutualFundDataRoutes, "GET", "/mutual-funds"],
    [mutualFundHoldingRoutes, "GET", "/mutual-fund-holdings"],
    [portfolioRoutes, "GET", "/portfolio/dashboard"],
    [stockRoutes, "GET", "/stocks"],
    [userRoutes, "GET", "/users/000000000000000000000001"],
    [adminUsersRoutes, "GET", "/"],
    [adminUsersRoutes, "DELETE", "/000000000000000000000001"],
    [adminUsersRoutes, "DELETE", "/000000000000000000000001/permanent"],
  ];

  for (const [router, method, url] of protectedRequests) {
    const response = await requestRouter(router, method, url);
    assert.equal(response.statusCode, 401, `${method} ${url} must require a Bearer token`);
    assert.equal(response.body.success, false);
  }

  const nonAdminToken = generateAccessToken({
    userId: "000000000000000000000001",
    email: "user@example.com",
    name: "Regular User",
    admin: false,
  });
  const response = await requestRouter(
    adminUsersRoutes,
    "GET",
    "/",
    `Bearer ${nonAdminToken}`,
  );
  assert.equal(response.statusCode, 403, "Admin routes must reject non-admin users");
  assert.equal(response.body.success, false);
} finally {
  User.findOne = originalFindUser;
  env.skipJwtAuthForTesting = authConfig.skip;
  env.jwtSecret = authConfig.secret;
}

console.log("Protected routes reject requests without a token, and admin routes reject non-admin users.");
