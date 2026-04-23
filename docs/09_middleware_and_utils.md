# 🏗️ Middleware & Utility Reference

## Middleware

### `authenticateRequest` — `src/middlewares/jwt.js`

Verifies a JWT Bearer token from the `Authorization` header.

**Usage:**
```js
import { authenticateRequest } from '../middlewares/jwt.js';
router.get('/protected', authenticateRequest, handler);
```

**Flow:**
1. Read `Authorization` header
2. Split by space → `[scheme, token]`
3. Reject if `scheme !== "Bearer"` or `token` is empty → `401`
4. `jwt.verify(token, env.jwtSecret)` → attach payload to `req.user`
5. On failure → `401 Invalid or expired token`

**`req.user` shape (decoded JWT payload):**
```json
{
  "userId": "64abc...",
  "email": "john@example.com",
  "iat": 1714000000,
  "exp": 1714086400
}
```

> ⚠️ Currently not applied to any route — see [Best Practice Issues #3](./07_best_practice_issues.md).

---

### `validateRequest(schema)` — `src/middlewares/validateRequest.js`

Schema-driven request validation middleware factory.

**Usage:**
```js
import { validateRequest } from '../middlewares/validateRequest.js';
import { createUserSchema } from '../validators/auth.validators.js';

router.post('/create-user', validateRequest(createUserSchema), createUser);
```

**Schema shape:**
```js
const mySchema = {
  body(body)   { return { success: true, data: {...} } | { success: false, errors: [...] } },
  query(query) { return { success: true, data: {...} } | { success: false, errors: [...] } },
  params(params){ return { success: true, data: {...} } | { success: false, errors: [...] } },
};
```

**On success:** Attaches validated/normalized data to `req.validated.body`, `req.validated.query`, `req.validated.params`.

**On failure:** Returns `400` with:
```json
{
  "success": false,
  "message": "Validation failed",
  "details": ["body: email is required", "body: password must be at least 8 characters"]
}
```

---

## Utility Functions

### `sendSuccess` / `sendError` — `src/utils/http.js`

Standardized JSON response helpers.

```js
import { sendSuccess, sendError } from '../utils/http.js';

// Success:
sendSuccess(res, {
  statusCode: 200,       // optional, default 200
  message: "Done",
  data: { id: 1 },
});

// Error:
sendError(res, {
  statusCode: 400,       // optional, default 500
  message: "Bad input",
  details: ["field: error"],  // optional
});
```

---

### `AppError` class — `src/utils/http.js`

Custom error class for throwing structured errors from service layer:

```js
import { AppError } from '../utils/http.js';

throw new AppError("Not found", 404, { field: "email" });
// error.message   → "Not found"
// error.statusCode → 404
// error.details   → { field: "email" }
```

---

### `errorHandler` / `notFoundHandler` — `src/utils/http.js`

Express-compatible error handlers. Currently `app.js` implements its own inline versions — these are available as replacements:

```js
import { errorHandler, notFoundHandler } from '../utils/http.js';

app.use(notFoundHandler);   // 404 catch-all
app.use(errorHandler);      // 500 global error handler
```

---

### `generateOtp` / `createOtpRecord` / `matchesOtp` / `isOtpExpired` — `src/utils/otp.js`

Secure OTP utilities.

```js
import { createOtpRecord, matchesOtp, isOtpExpired } from '../utils/otp.js';

// Generate OTP:
const { otp, otpHash, otpExpiry } = createOtpRecord();
user.otp = otp;          // store plain or hashed
user.otpExpiry = otpExpiry;

// Verify OTP:
if (isOtpExpired(user.otpExpiry)) {
  // OTP expired
}
if (!matchesOtp(user.otp, incomingOtp)) {
  // OTP mismatch
}
```

| Function | Description |
|---|---|
| `generateOtp()` | Returns a 6-digit string using `crypto.randomInt` |
| `createOtpRecord()` | Returns `{ otp, otpHash, otpExpiry }` |
| `matchesOtp(stored, incoming)` | Compares plain or hashed OTP |
| `isOtpExpired(otpExpiry)` | Returns `true` if expired or missing |

---

### `sendEmail` — `src/utils/sendEmail.js`

Sends email via Gmail SMTP using Nodemailer.

```js
import { sendEmail } from '../utils/sendEmail.js';

await sendEmail(
  'recipient@example.com',
  'Subject Line',
  'Plain text body'
);
```

The SMTP transporter is lazily created and cached (singleton). Requires `EMAIL_USER` and `EMAIL_PASS` env vars.

> **Gmail requirement:** You must use a **Gmail App Password** (not your regular password). Enable 2FA on the Gmail account first, then generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

---

## Validators

### Auth Validators — `src/validators/auth.validators.js`

| Export | Used For | Validates |
|---|---|---|
| `createUserSchema` | `POST /api/create-user` | name, email, password, phone |
| `verifySignupOtpSchema` | `POST /api/verify-email-otp` | email, 6-digit otp |
| `loginUserSchema` | `POST /api/login-user` | email, password |
| `loginWithGoogleSchema` | `POST /api/login-google` | idToken |
| `forgotPasswordSchema` | `POST /api/forgot-password` | email |
| `verifyPasswordOtpSchema` | `POST /api/verify-otp` | email, 6-digit otp |
| `resetPasswordSchema` | `POST /api/reset-password` | email, otp, newPassword |

**Normalization applied:**
- `email` → `.trim().toLowerCase()`
- `name`, `password` → `.trim()`
- `otp` → `String(value).trim()`
- `phone` → strip non-digits/+, validate format `^\+?\d{7,15}$`
- `password` → minimum 8 characters enforced

---

### Market Validators — `src/validators/market.validators.js`

| Export | Used For | Validates |
|---|---|---|
| `marketQuerySchema` | `GET /api/market-data` | `keys` (comma-list), `forceRefresh` (bool) |
| `marketKeyParamsSchema` | `GET /api/market-data/:marketKey` | `marketKey` (required string) + query |
| `refreshMarketSchema` | `POST /api/market-data/refresh` | body `keys` (optional comma-list) |

---

## Config Modules

### `src/config/env.js`

Single source of truth for all environment configuration. See [Environment Variables doc](./02_environment_variables.md) for full details.

```js
import { env, getCorsOptions } from './config/env.js';

env.mongoUri            // MONGO_URI
env.jwtSecret           // JWT_SECRET
env.isProduction        // NODE_ENV === 'production'
env.otpExpiryMinutes    // OTP_EXPIRY_MINUTES (default 5)
// etc.
```

---

### `src/config/db.js`

MongoDB connection with serverless-safe global caching.

```js
import connectDB from './config/db.js';

const dbPromise = connectDB(); // call once at module level
await dbPromise;               // await before using DB
```

---

### `src/config/marketSymbols.js`

Static market symbol registry.

```js
import { MARKET_SYMBOLS, DEFAULT_MARKET_KEYS } from './config/marketSymbols.js';

MARKET_SYMBOLS['nifty']  // { key, symbol, displayName, type, exchange, country }
DEFAULT_MARKET_KEYS       // ['nifty', 'sensex', 'nasdaq', 'hdfcbank']
```
