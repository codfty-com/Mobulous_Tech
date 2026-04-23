# ⚠️ Best Practice Issues & Recommendations

This document lists all identified production-level issues found during the code audit, ordered by severity.

---

## 🔴 Critical

### 1. `GET /api/users` is Publicly Exposed

**File:** `src/routes/userRoutes.js`, `src/controllers/allUserList.js`

The endpoint that returns all registered users has **no authentication** and **no authorization**.

```js
// Currently:
router.get("/api/users", getAllusers);

// Fix:
router.get("/api/users", authenticateRequest, isAdmin, getAllusers);
```

**Recommendation:** Apply `authenticateRequest` middleware and add an admin role check. If there is no admin role system yet, restrict this endpoint to internal use only or remove it entirely from production.

---

### 2. `POST /api/reset-password` Does Not Require OTP

**File:** `src/controllers/forgetPassController.js`

The reset password flow has 3 steps: `forgot-password` → `verify-otp` → `reset-password`. However, step 3 (`reset-password`) only requires `email` and `newPassword` — **no OTP or session token**. Any attacker who knows a user's email can reset their password without ever receiving the OTP.

```js
// Current reset-password only checks:
const { email, newPassword } = req.body;
```

**Fix options:**
- Pass the OTP again in the `reset-password` request and re-validate it
- Issue a short-lived signed reset token after OTP verification and require it in the reset step

---

### 3. JWT Token Not Returned on Login

**File:** `src/controllers/userLoginController.js`

The `loginUser` and `loginWithGoogle` controllers authenticate the user successfully but **do not issue or return a JWT token**. The JWT middleware (`src/middlewares/jwt.js`) and secret (`env.jwtSecret`) are both set up, but the `jwt.sign()` call is missing.

```js
// Add this before the response:
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: user._id, email: user.email },
  env.jwtSecret,
  { expiresIn: env.jwtExpiresIn }
);

return res.status(200).json({
  success: true,
  message: "Login successful",
  token,              // ← add this
  data: sanitizeUser(user),
});
```

---

### 4. `Math.random()` Used for OTP Generation (Forgot Password)

**File:** `src/controllers/forgetPassController.js` line 16

```js
// ❌ Cryptographically weak:
const otp = Math.floor(100000 + Math.random() * 900000).toString();
```

The `src/utils/otp.js` utility uses `crypto.randomInt()` which is cryptographically secure. The forgot password controller bypasses it entirely.

**Fix:** Replace with the utility:
```js
import { generateOtp, createOtpRecord, isOtpExpired, matchesOtp } from '../utils/otp.js';

const { otp, otpExpiry } = createOtpRecord();
user.otp = otp;
user.otpExpiry = otpExpiry;
```

---

## 🟠 High

### 5. `helmet` and `morgan` Imported but Not Used

**File:** `package.json` (dependencies), `src/app.js`

Both `helmet` (security headers) and `morgan` (HTTP request logging) are listed as dependencies but are **not applied** in `app.js`.

```js
// Add to app.js after imports:
import helmet from 'helmet';
import morgan from 'morgan';

// Before routes:
app.use(helmet());
app.use(morgan(env.isProduction ? 'combined' : 'dev'));
```

`helmet` sets important HTTP security headers (HSTS, XSS Protection, Content Security Policy, etc.) — critical for production.

---

### 6. CORS Allows All Origins by Default

**File:** `src/app.js` line 27

```js
// Currently (wide open):
app.use(cors());
```

The `getCorsOptions()` function in `env.js` already implements proper origin whitelist logic, but it is **not being used**.

**Fix:**
```js
import { getCorsOptions } from './config/env.js';
app.use(cors(getCorsOptions()));
```

Then set `CORS_ORIGINS=https://your-frontend.com` in Vercel environment variables.

---

### 7. OTP Stored in Plain Text

**File:** `src/models/user.js`, controllers

The `otp` field is stored as a plain string in MongoDB. A database breach would expose all pending OTPs.

**Fix:** Store the hashed OTP using `createOtpRecord()` from `src/utils/otp.js` and compare using `matchesOtp()`. The utility already supports this pattern — it just needs to be wired in consistently.

---

### 8. Error Message Leaks Internal Details in Production

**File:** `src/app.js` line 96, `src/controllers/forgetPassController.js` line 32

```js
// In forgetPassController.js (leaks error.message to client):
res.status(500).json({ message: "Server error", error: error.message });
```

**Fix:** Never send `error.message` or stack traces to clients in production:
```js
res.status(500).json({
  message: env.isProduction ? "Server error" : error.message,
});
```

---

### 9. Inconsistent Response Format

Some controllers use `sendSuccess()`/`sendError()` from `utils/http.js`, while others manually construct response objects.

**Affected files:**
- `forgetPassController.js` — uses raw `res.json({ message: ... })` without `success` field
- `userController.js` — uses inline `res.status().json()` instead of helpers
- `userLoginController.js` — uses inline `res.status().json()` instead of helpers

**Fix:** Use `sendSuccess()` and `sendError()` consistently everywhere.

---

## 🟡 Medium

### 10. Validators Not Wired to Auth Routes

**File:** `src/routes/userRoutes.js`, `src/routes/resetPassRoutes.js`

`src/validators/auth.validators.js` contains complete schemas for all auth endpoints, and `src/middlewares/validateRequest.js` bridges them to Express. However, **the routes don't use them**.

```js
// Fix userRoutes.js:
import { validateRequest } from '../middlewares/validateRequest.js';
import { createUserSchema, loginUserSchema, ... } from '../validators/auth.validators.js';

router.post('/create-user', validateRequest(createUserSchema), createUser);
router.post('/login-user', validateRequest(loginUserSchema), loginUser);
```

---

### 11. `marketData.service.js` Reads `process.env` Directly

**File:** `src/services/marketData.service.js` line 7

```js
const CACHE_MINUTES = Number(process.env.MARKET_CACHE_DURATION_MINUTES || 2);
```

Should use the typed `env` object:
```js
import { env } from '../config/env.js';
const CACHE_MINUTES = env.marketCacheDurationMinutes;
```

---

### 12. `googleAuth.service.js` Reads `process.env` Directly

**File:** `src/services/googleAuth.service.js` lines 4–6

```js
(process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || "")
```

Should use:
```js
import { env } from '../config/env.js';
env.googleClientIds
```

---

### 13. `userController.js` Hardcodes OTP Expiry and Redirect URL

**File:** `src/controllers/userController.js` lines 6–7

```js
const OTP_EXPIRY_MINUTES = 5;
const LOGIN_REDIRECT_URL = process.env.LOGIN_REDIRECT_URL || '/login';
```

These values are already configured in `env.js`. Should use `env.otpExpiryMinutes` and `env.loginRedirectUrl`.

---

### 14. `nodemon` Listed as a Regular Dependency Risk

**File:** `package.json`

`nodemon` is correctly in `devDependencies`. However, Vercel installs only `dependencies` in production — verify `nodemon` never gets imported in production code paths.

---

### 15. Missing `.env.example` File

The `.gitignore` references `!.env.example` (meaning it should be committed), but no `.env.example` file exists. New developers won't know what variables are required.

**Fix:** Create `.env.example` with all keys and placeholder values (see [Environment Variables doc](./02_environment_variables.md)).

---

## 🟢 Low / Improvements

### 16. No Rate Limiting

No rate limiting is applied to auth endpoints (`/login-user`, `/forgot-password`, `/verify-otp`). This allows brute-force attacks.

**Recommendation:** Use `express-rate-limit` on auth routes:
```js
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
router.post('/login-user', authLimiter, loginUser);
```

---

### 17. No Request Body Size Limit Applied

`env.requestBodyLimit` is defined but not used. Express's default body parser has no limit without explicit configuration.

```js
app.use(express.json({ limit: env.requestBodyLimit }));
```

---

### 18. No Test Suite

`package.json` has a placeholder test script: `"test": "echo \"Error: no test specified\" && exit 1"`. No tests exist.

**Recommendation:** Add Jest or Vitest with at minimum unit tests for validators and service logic.

---

### 19. Console Logs in Production

Multiple controllers use `console.log("Incoming signup request")` and similar debug logs. These clutter Vercel's function logs.

**Recommendation:** Replace with a structured logger (e.g. `pino`) that respects `NODE_ENV`:
```js
import pino from 'pino';
const logger = pino({ level: env.isProduction ? 'info' : 'debug' });
```

---

### 20. `vercel.json` Uses Deprecated `routes` Key

```json
{
  "routes": [{ "src": "/(.*)", "dest": "/api/index.js" }]
}
```

Vercel recommends using `rewrites` instead of `routes` for routing in v2:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/api/index.js" }]
}
```

---

## Summary Table

| # | Issue | Severity | File(s) |
|---|---|---|---|
| 1 | `/api/users` unprotected | 🔴 Critical | `userRoutes.js`, `allUserList.js` |
| 2 | `reset-password` no OTP re-check | 🔴 Critical | `forgetPassController.js` |
| 3 | JWT not returned on login | 🔴 Critical | `userLoginController.js` |
| 4 | `Math.random()` for OTP | 🔴 Critical | `forgetPassController.js` |
| 5 | `helmet`/`morgan` not applied | 🟠 High | `app.js` |
| 6 | CORS open to all origins | 🟠 High | `app.js` |
| 7 | OTP stored in plain text | 🟠 High | `user.js`, controllers |
| 8 | Error details leaked to client | 🟠 High | `forgetPassController.js` |
| 9 | Inconsistent response format | 🟠 High | Multiple controllers |
| 10 | Validators not wired to routes | 🟡 Medium | `userRoutes.js`, `resetPassRoutes.js` |
| 11 | `process.env` in service | 🟡 Medium | `marketData.service.js` |
| 12 | `process.env` in Google service | 🟡 Medium | `googleAuth.service.js` |
| 13 | Hardcoded config in controller | 🟡 Medium | `userController.js` |
| 14 | `nodemon` dependency risk | 🟡 Medium | `package.json` |
| 15 | Missing `.env.example` | 🟡 Medium | root |
| 16 | No rate limiting | 🟢 Low | routes |
| 17 | Body size limit not applied | 🟢 Low | `app.js` |
| 18 | No test suite | 🟢 Low | — |
| 19 | Debug console logs in production | 🟢 Low | controllers |
| 20 | `vercel.json` deprecated `routes` | 🟢 Low | `vercel.json` |
