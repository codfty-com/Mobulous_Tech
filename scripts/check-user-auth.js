import assert from "node:assert/strict";
import { once } from "node:events";
import { createRequire } from "node:module";
import path from "node:path";
import express from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import apiRouter from "../src/routes/apiRoutes.js";
import { env } from "../src/config/env.js";
import User from "../src/models/user.js";
import RefreshToken from "../src/models/refreshToken.js";

// Never use MONGO_URI or send real mail. The optional frontend path exercises
// its actual Next.js gateway against these real routes and this isolated DB.
const database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
let server;
const mails = [];
let failMail = false;
nodemailer.createTransport = () => ({ sendMail: async (mail) => {
  if (failMail) throw new Error("Simulated mail failure");
  mails.push(mail);
} });
process.env.GOOGLE_CLIENT_IDS = "test-client";
OAuth2Client.prototype.verifyIdToken = async ({ idToken }) => {
  if (idToken !== "verified-test-id-token") throw new Error("Invalid Google token");
  return { getPayload: () => ({ sub: "test-google-subject", email: "google@example.com", email_verified: true, name: "Google User" }) };
};
Object.assign(env, { jwtSecret: "isolated-user-access-secret", jwtRefreshSecret: "isolated-user-refresh-secret", skipJwtAuthForTesting: false, emailUser: "sender@example.com", emailPass: "test", otpExpiryMinutes: 5 });

try {
  await mongoose.connect(database.getUri(), { dbName: "user_auth_test" });
  await Promise.all([User.init(), RefreshToken.init()]);
  const app = express();
  app.use(express.json());
  app.use("/api", apiRouter);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (route, body, accessToken) => {
    const response = await fetch(base + route, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const email = "person@example.com";
  const password = " Password with spaces 123! ";
  const signup = { name: "Person", email, password };
  const code = () => mails.at(-1).text.match(/\b\d{6}\b/)[0];
  const freshReset = async () => {
    await User.updateOne({ email }, { $unset: { resetSentAt: "" } });
    assert.equal((await request("/forgot-password", { email })).status, 200);
    return code();
  };
  assert.equal((await request("/create-user", { ...signup, password: {} })).status, 400);
  assert.equal((await request("/create-user", { ...signup, password: "a".repeat(73) })).status, 400);
  assert.equal((await request("/create-user", signup)).status, 201);
  const signupCode = code();
  assert.equal((await request("/create-user", signup)).status, 429);
  assert.equal((await request("/login-user", { email, password })).status, 403);
  assert.equal((await request("/verify-email-otp", { email, otp: signupCode })).status, 200);
  assert.equal((await request("/create-user", signup)).status, 409);
  assert.equal((await request("/login-user", { email, password: "wrong" })).status, 400);
  const login = await request("/login-user", { email: " PERSON@EXAMPLE.COM ", password });
  assert.equal(login.status, 200);
  const session = login.body.data;
  assert.equal(session.user.password, undefined);
  assert.equal(session.user.otp, undefined);
  assert.ok(session.accessToken && session.refreshToken);
  assert.equal((await request("/auth/me", undefined, session.accessToken)).status, 200);
  assert.equal((await request("/auth/me", undefined, session.refreshToken)).status, 401);
  assert.equal((await request("/users/" + session.user._id, undefined, session.accessToken)).status, 200);
  assert.equal((await request("/auth/refresh-token", { refreshToken: session.refreshToken })).status, 200);
  assert.equal((await request("/auth/refresh-token", { refreshToken: {} })).status, 400);
  assert.equal((await request("/reset-password", { email, newPassword: "NewPassword123" })).status, 400);
  assert.equal((await request("/reset-password", { email, otp: signupCode, newPassword: "NewPassword123" })).status, 400);

  let otp = await freshReset();
  const sent = mails.length;
  assert.equal((await request("/forgot-password", { email })).status, 200);
  assert.equal(mails.length, sent, "Resend cooldown prevents repeated delivery");
  const generic = await request("/forgot-password", { email: "unknown@example.com" });
  assert.equal(generic.status, 200);
  assert.equal(mails.length, sent);
  const wrong = otp === "000000" ? "000001" : "000000";
  for (let i = 0; i < 5; i++) assert.equal((await request("/verify-otp", { email, otp: wrong })).status, 400);
  assert.equal((await request("/verify-otp", { email, otp })).status, 400);
  otp = await freshReset();
  await User.updateOne({ email }, { $set: { resetExpiry: new Date(Date.now() - 1) } });
  assert.equal((await request("/verify-otp", { email, otp })).status, 400);
  otp = await freshReset();
  assert.equal((await request("/verify-otp", { email, otp })).status, 200);
  const concurrent = await Promise.all([1, 2].map(() => request("/reset-password", { email, otp, newPassword: "NewPassword123" })));
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 400]);
  assert.equal((await request("/reset-password", { email, otp, newPassword: "NewPassword123" })).status, 400);
  assert.equal((await request("/auth/me", undefined, session.accessToken)).status, 401);
  assert.equal((await request("/auth/refresh-token", { refreshToken: session.refreshToken })).status, 401);
  assert.equal((await request("/login-user", { email, password })).status, 400);
  const changed = (await request("/login-user", { email, password: "NewPassword123" })).body.data;
  assert.equal((await request("/auth/change-password", { oldPassword: "bad", newPassword: "ChangedPassword123" }, changed.accessToken)).status, 400);
  assert.equal((await request("/auth/change-password", { oldPassword: "NewPassword123", newPassword: "ChangedPassword123" }, changed.accessToken)).status, 200);
  assert.equal((await request("/auth/me", undefined, changed.accessToken)).status, 401);
  assert.equal((await request("/auth/refresh-token", { refreshToken: changed.refreshToken })).status, 401);
  const current = (await request("/login-user", { email, password: "ChangedPassword123" })).body.data;
  await User.updateOne({ email }, { $set: { isDeleted: true } });
  assert.equal((await request("/auth/me", undefined, current.accessToken)).status, 401);
  assert.equal((await request("/auth/refresh-token", { refreshToken: current.refreshToken })).status, 401);
  await User.updateOne({ email }, { $set: { isDeleted: false } });
  assert.equal((await request("/auth/logout-all", {}, current.accessToken)).status, 200);
  assert.equal((await request("/auth/me", undefined, current.accessToken)).status, 401);
  const logoutSession = (await request("/login-user", { email, password: "ChangedPassword123" })).body.data;
  assert.equal((await request("/auth/logout", { refreshToken: logoutSession.refreshToken }, logoutSession.accessToken)).status, 200);
  assert.equal((await request("/auth/refresh-token", { refreshToken: logoutSession.refreshToken })).status, 401);

  await User.updateOne({ email }, { $unset: { resetSentAt: "" } });
  failMail = true;
  assert.equal((await request("/forgot-password", { email })).status, 503);
  failMail = false;
  assert.equal((await request("/forgot-password", { email })).status, 200);
  assert.equal((await request("/login-google", { idToken: "invalid" })).status, 401);
  const google = await request("/login-google", { idToken: "verified-test-id-token" });
  assert.equal(google.status, 201);
  assert.equal((await request("/auth/me", undefined, google.body.data.accessToken)).status, 200);
  const beforeGoogleReset = mails.length;
  assert.equal((await request("/forgot-password", { email: "google@example.com" })).status, 200);
  assert.equal(mails.length, beforeGoogleReset, "Google-only users cannot bypass their sign-in method");

  // Exercise real frontend cookie handling and real backend tokens together.
  if (process.env.USER_FRONTEND_PATH) {
    const require = createRequire(path.join(process.env.USER_FRONTEND_PATH, "package.json"));
    const { createGateway } = require(path.join(process.env.USER_FRONTEND_PATH, "scripts/check-auth.cjs"));
    const gateway = createGateway(base);
    const frontendLogin = await gateway.request("login-user", "POST", { email, password: "ChangedPassword123" });
    assert.equal(frontendLogin.status, 200);
    assert.equal(frontendLogin.body.data.accessToken, undefined);
    assert.equal((await gateway.request("auth/me")).status, 200);
    const key = [...gateway.jar.keys()].find((key) => key.includes("ah-access"));
    gateway.jar.delete(key);
    assert.equal((await gateway.request("auth/refresh-token", "POST", {})).status, 200);
    assert.equal((await gateway.request("users/" + session.user._id)).status, 200);
    assert.equal((await gateway.request("auth/logout", "POST", {})).status, 200);
    assert.equal(gateway.jar.size, 0);
    console.log("Real frontend gateway + backend login, refresh, protected profile and logout passed.");
  }
  console.log("User auth HTTP integration passed: signup, verification, login, JWTs, OTP limits/expiry/replay/concurrency, password changes, session revocation, deleted users, logout and Google exchange.");
} finally {
  if (server) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
  await mongoose.disconnect();
  await database.stop();
}
