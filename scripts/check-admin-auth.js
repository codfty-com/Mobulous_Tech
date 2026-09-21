import assert from "node:assert/strict";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { once } from "node:events";
import User from "../src/models/user.js";
import RefreshToken from "../src/models/refreshToken.js";
import { env, getCorsOptions } from "../src/config/env.js";
import apiRouter from "../src/routes/apiRoutes.js";
import { authenticateRequest } from "../src/middlewares/jwt.js";
import { refreshAccessToken, verifyAccessToken } from "../src/services/jwt.service.js";

// Exercise the real HTTP routes, validation, bcrypt, JWTs and mail template with
// isolated in-memory persistence and mail delivery. Never touch the configured DB.
env.jwtSecret = "admin-auth-test-access-secret";
env.jwtRefreshSecret = "admin-auth-test-refresh-secret";
env.skipJwtAuthForTesting = false;
env.emailUser = "sender@example.com";
env.emailPass = "test-mail-password";
env.otpExpiryMinutes = 5;
const frontendOrigin = "https://admin.example.com";
env.corsOrigins = [frontendOrigin];
const email = "admin@example.com";
const password = "InitialPassword123!";
const newPassword = "ChangedPassword456!";
const admin = {
  _id: "000000000000000000000001", email, name: "Admin", admin: true,
  password: await bcrypt.hash(password, 4), isEmailVerified: true,
  isDeleted: false, adminTokenVersion: 0,
};
const regular = { ...admin, _id: "000000000000000000000002", email: "user@example.com", admin: false };
const rows = [admin, regular];
const tokens = new Map();
const sent = [];
let mailFailure = false;
nodemailer.createTransport = () => ({ sendMail: async (mail) => {
  if (mailFailure) throw new Error("Simulated mail delivery failure");
  sent.push(mail);
} });

const matches = (row, filter) => Object.entries(filter).every(([key, value]) => {
  if (key === "$or") return value.some((part) => matches(row, part));
  const actual = row[key];
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.entries(value).every(([op, expected]) => {
      if (op === "$ne") return actual !== expected;
      if (op === "$exists") return (actual !== undefined) === expected;
      if (op === "$gt") return actual > expected;
      if (op === "$lt") return actual < expected;
      if (op === "$lte") return actual <= expected;
      throw new Error(`Unsupported test filter: ${op}`);
    });
  }
  return actual === value;
});
const apply = (row, update) => {
  Object.assign(row, update.$set);
  for (const [key, value] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + value;
  for (const key of Object.keys(update.$unset || {})) delete row[key];
};
User.findOne = async (filter) => structuredClone(rows.find((row) => matches(row, filter)) || null);
User.find = () => ({ select: () => ({ sort: async () => rows.map(({ _id, email, admin }) => ({ _id, email, admin })) }) });
User.findOneAndUpdate = (filter, update) => {
  const row = rows.find((item) => matches(item, filter));
  if (row) apply(row, update);
  const result = structuredClone(row || null);
  return { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject), select: async () => result };
};
User.updateOne = async (filter, update) => {
  const row = rows.find((item) => matches(item, filter));
  if (row) apply(row, update);
  return { modifiedCount: row ? 1 : 0 };
};
RefreshToken.prototype.save = async function () { tokens.set(this.token, this); return this; };
RefreshToken.revokeOldTokens = async () => {};
RefreshToken.revokeAllForUser = async (id) => {
  let count = 0;
  for (const token of tokens.values()) {
    if (String(token.userId) === String(id)) { token.isRevoked = true; count++; }
  }
  return count;
};
RefreshToken.findOne = async ({ token }) => {
  const record = tokens.get(token);
  return record && !record.isRevoked ? record : null;
};

const app = express();
app.use(cors(getCorsOptions()));
app.use(express.json());
app.use("/api", apiRouter);
app.get("/session", authenticateRequest, (req, res) => res.json(req.user));
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
const post = async (path, body) => {
  const response = await fetch(`${base}/api/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};
const session = async (token) => (await fetch(`${base}/session`, { headers: { Authorization: `Bearer ${token}` } })).status;
const users = (authorization) => fetch(`${base}/api/admin/users`, {
  headers: { Origin: frontendOrigin, ...(authorization ? { Authorization: authorization } : {}) },
});
const otpFromMail = () => sent.at(-1).text.match(/\b\d{6}\b/)[0];
const allowResend = () => { admin.adminResetSentAt = new Date(Date.now() - 61_000); };
const forgot = () => post("admin/forgot-password", { email });
const reset = (otp, value = newPassword) => post("admin/reset-password", { email, otp, newPassword: value });

try {
  // These routes must remain public through the full production router stack.
  assert.equal((await post("auth/refresh-token", {})).status, 400);
  for (const path of ["/mutual-funds", "/mutual-fund-data", "/mutual-fund-data/123/history"]) {
    assert.equal((await fetch(`${base}/api${path}`)).status, 401, "Mutual fund routes remain protected");
  }
  const preflight = await fetch(`${base}/api/admin/users`, {
    method: "OPTIONS",
    headers: { Origin: frontendOrigin, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization,content-type" },
  });
  assert.equal(preflight.status, 204, "CORS preflight must not require authentication");
  assert.equal(preflight.headers.get("access-control-allow-origin"), frontendOrigin);
  assert.match(preflight.headers.get("access-control-allow-headers"), /Authorization/i);
  const unauthorized = await users();
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("access-control-allow-origin"), frontendOrigin, "Frontend can read authentication errors");
  const blockedPreflight = await fetch(`${base}/api/admin/users`, {
    method: "OPTIONS",
    headers: { Origin: "https://unlisted.example.com", "Access-Control-Request-Method": "GET" },
  });
  assert.equal(blockedPreflight.headers.get("access-control-allow-origin"), null);
  for (const body of [{}, { email, password: {} }, { email: { $ne: null }, password }, { email, password: "x".repeat(73) }]) {
    assert.equal((await post("admin/login", body)).status, 400);
  }
  assert.equal((await post("admin/login", { email, password: "wrong" })).status, 401);
  assert.equal((await post("admin/login", { email: regular.email, password })).status, 401);
  assert.equal((await post("admin/login", { email: "missing@example.com", password })).status, 401);
  admin.isDeleted = true;
  assert.equal((await post("admin/login", { email, password })).status, 401);
  admin.isDeleted = false;
  const login = await post("admin/login", { email: " ADMIN@EXAMPLE.COM ", password });
  assert.equal(login.status, 200);
  const firstTokens = login.body.data;
  assert.equal(firstTokens.user.password, undefined);
  assert.equal(verifyAccessToken(firstTokens.accessToken).admin, true);
  const httpRefresh = await post("auth/refresh-token", { refreshToken: firstTokens.refreshToken });
  assert.equal(httpRefresh.status, 200, "Refresh does not require an unexpired access token");
  assert.ok(httpRefresh.body.data.accessToken);
  assert.equal(await session(firstTokens.accessToken), 200);
  for (const prefix of ["Bearer ", "bearer ", "BEARER ", "Bearer   "]) {
    const listed = await users(`${prefix}${firstTokens.accessToken}`);
    assert.equal(listed.status, 200, `Admin user listing accepts ${JSON.stringify(prefix)}`);
    assert.equal(listed.headers.get("access-control-allow-origin"), frontendOrigin);
    assert.equal((await listed.json()).data.length, rows.length);
  }
  for (const header of ["Bearer undefined", firstTokens.accessToken, `Basic ${firstTokens.accessToken}`, `Bearer ${firstTokens.accessToken} extra`, `Bearer ${firstTokens.refreshToken}`]) {
    assert.equal((await users(header)).status, 401, "Malformed headers and refresh tokens cannot access admin users");
  }
  assert.ok((await refreshAccessToken(firstTokens.refreshToken)).accessToken);
  admin.admin = false;
  assert.equal(await session(firstTokens.accessToken), 401);
  admin.admin = true;

  const requested = await forgot();
  assert.equal(requested.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, email);
  assert.notEqual(admin.adminResetHash, otpFromMail());
  assert.ok(!JSON.stringify(requested.body).includes(otpFromMail()));
  assert.equal((await forgot()).status, 200);
  assert.equal(sent.length, 1, "Cooldown prevents duplicate emails");
  const unknown = await post("admin/forgot-password", { email: "unknown@example.com" });
  assert.deepEqual(unknown.body, requested.body);
  assert.equal((await post("admin/forgot-password", { email: regular.email })).status, 200);
  assert.equal(sent.length, 1);
  assert.equal((await post("forgot-password", { email })).status, 400, "Public user reset must not reset an admin");
  assert.equal((await post("reset-password", { email, otp: otpFromMail(), newPassword })).status, 400);
  assert.equal((await post("admin/reset-password", { email, newPassword })).status, 400);
  const wrongOtp = otpFromMail() === "000000" ? "000001" : "000000";
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await reset(wrongOtp)).status, 400);
  assert.equal((await reset(otpFromMail())).status, 400, "Five wrong guesses exhaust the challenge");

  allowResend();
  await forgot();
  admin.adminResetExpiry = new Date(Date.now() - 1000);
  assert.equal((await reset(otpFromMail())).status, 400, "Expired OTP rejected");
  allowResend();
  await forgot();
  const otp = otpFromMail();
  assert.equal((await post("admin/verify-otp", { email, otp })).status, 200);
  const concurrent = await Promise.all([reset(otp), reset(otp)]);
  assert.deepEqual(concurrent.map((response) => response.status).sort(), [200, 400]);
  assert.equal((await reset(otp)).status, 400, "Consumed OTP cannot be replayed");
  assert.ok(await bcrypt.compare(newPassword, admin.password));
  assert.equal(admin.adminResetHash, undefined);
  assert.equal(await session(firstTokens.accessToken), 401, "Old access JWT invalidated");
  assert.equal((await users(`Bearer ${firstTokens.accessToken}`)).status, 401, "Reset invalidates access to admin users");
  await assert.rejects(refreshAccessToken(firstTokens.refreshToken), /invalid|revoked/i);
  assert.equal((await post("admin/login", { email, password })).status, 401);
  const newLogin = await post("admin/login", { email, password: newPassword });
  assert.equal(newLogin.status, 200);
  assert.equal(await session(newLogin.body.data.accessToken), 200);

  allowResend();
  mailFailure = true;
  assert.equal((await forgot()).status, 503);
  assert.equal(admin.adminResetHash, undefined, "Undelivered challenge is removed");
  mailFailure = false;
  assert.equal((await forgot()).status, 200, "Delivery can be retried after failure");
  console.log("Admin auth checks passed: login, role enforcement, email OTP, cooldown, attempts, expiry, concurrent reset, replay, session invalidation and delivery failure.");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
