# 🌐 API Reference

Base URL (production): `https://<your-vercel-domain>.vercel.app`  
Base URL (local): `http://localhost:3000`

All endpoints are prefixed with `/api`.

---

## Authentication Routes — `src/routes/userRoutes.js`

### `POST /api/create-user`
Register a new user with email and password.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "+919876543210"   // optional
}
```

**Success `201`:**
```json
{
  "success": true,
  "message": "User created successfully. OTP sent to email for verification.",
  "data": {
    "userId": "64abc...",
    "email": "john@example.com",
    "isEmailVerified": false
  }
}
```

**If email exists but unverified `200`** — OTP is resent.  
**If email exists and verified `409`** — User already exists.  
**If Google-only account `409`** — Prompt to use Google login.

---

### `POST /api/verify-email-otp`
Verify the 6-digit OTP sent to email during signup.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "481920"
}
```

**Success `200`:**
```json
{
  "success": true,
  "message": "Email verified successfully. Please login.",
  "redirectTo": "/login"
}
```

**Error cases:** `400` — Invalid OTP / OTP expired / user not found.

---

### `POST /api/login-user`
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Success `200`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "64abc...",
    "name": "John Doe",
    "email": "john@example.com",
    "isEmailVerified": true,
    "authMethods": ["email_password"],
    "lastLoginMethod": "email_password"
    // password, otp, otpExpiry are stripped
  }
}
```

> **Note:** JWT token is **not currently returned** in the login response. This is a known gap — see [Best Practice Issues](./07_best_practice_issues.md).

---

### `POST /api/login-google`
Login or register using a Google ID token (from Google Sign-In SDK).

**Request Body:**
```json
{
  "idToken": "eyJhbGciOi..."
}
```

**Success (existing user) `200` / (new user) `201`:**
```json
{
  "success": true,
  "message": "Google login successful",
  "data": { ... }
}
```

**Error cases:** `401` — Invalid token | `409` — Google ID conflict | `500` — Google not configured.

---

### `GET /api/users`
Get all registered users.

> ⚠️ **No authentication required** — this is an unprotected admin endpoint. See [Best Practice Issues](./07_best_practice_issues.md).

**Success `200`:**
```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": [
    {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com"
      // password, otp, otpExpiry excluded via .select()
    }
  ]
}
```

---

### `GET /api/users/:_id`
Get one user profile by MongoDB `_id`.

**Example:** `GET /api/users/64abc123abc123abc123abcd`

Query-string fallback is also supported: `GET /api/users?_id=64abc123abc123abc123abcd`

**Success `200`:**
```json
{
  "success": true,
  "message": "User profile fetched successfully",
  "data": {
    "_id": "64abc123abc123abc123abcd",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "profilePicture": "https://example.com/profile.png",
    "isEmailVerified": true,
    "authMethods": ["email_password"],
    "lastLoginMethod": "email_password"
  }
}
```

**Error cases:** `400` - Invalid user `_id` | `404` - User not found.

---

### `PATCH /api/users/:_id`
Update editable user profile details by MongoDB `_id`.

**Editable fields:** `name`, `phone`, `profilePicture`

> Credentials and verification fields (`email`, `password`, `otp`, `authMethods`, `isEmailVerified`, etc.) are intentionally not editable through this profile endpoint.

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "+919999999999",
  "profilePicture": "https://example.com/profile.png"
}
```

**Success `200`:**
```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": {
    "_id": "64abc123abc123abc123abcd",
    "name": "John Updated",
    "email": "john@example.com",
    "phone": "+919999999999",
    "profilePicture": "https://example.com/profile.png"
  }
}
```

To remove optional profile fields, send `null` or an empty string for `phone` / `profilePicture`.

**Error cases:** `400` - Invalid user `_id` / validation failed | `404` - User not found.

---

## Password Reset Routes — `src/routes/resetPassRoutes.js`

### `POST /api/forgot-password`
Send a 6-digit OTP to the user's email for password reset.

**Request Body:**
```json
{ "email": "john@example.com" }
```

**Success `200`:**
```json
{ "message": "OTP sent successfully" }
```

---

### `POST /api/verify-otp`
Verify the OTP for password reset (does **not** reset the password).

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "481920"
}
```

**Success `200`:**
```json
{ "message": "OTP verified successfully" }
```

---

### `POST /api/reset-password`
Set a new password after OTP verification.

**Request Body:**
```json
{
  "email": "john@example.com",
  "newPassword": "NewSecurePass456"
}
```

**Success `200`:**
```json
{ "message": "Password reset successful" }
```

> ⚠️ **Issue:** This endpoint does **not** require the OTP again before resetting the password, making it exploitable. See [Best Practice Issues](./07_best_practice_issues.md).

---

## Market Data Routes — `src/routes/marketDataRoutes.js`

### `GET /api/markets`
Get the list of all supported market keys and their metadata.

**Success `200`:**
```json
{
  "success": true,
  "message": "Supported markets fetched successfully",
  "data": [
    { "key": "nifty", "symbol": "^NSEI", "displayName": "NIFTY 50", "type": "INDEX", "exchange": "NSE", "country": "India" },
    { "key": "sensex", "symbol": "^BSESN", "displayName": "SENSEX", "type": "INDEX", "exchange": "BSE", "country": "India" },
    { "key": "nasdaq", "symbol": "^IXIC", "displayName": "NASDAQ Composite", "type": "INDEX", "exchange": "NASDAQ", "country": "United States" },
    { "key": "hdfcbank", "symbol": "HDFCBANK.NS", "displayName": "HDFC Bank", "type": "EQUITY", "exchange": "NSE", "country": "India" }
  ]
}
```

---

### `GET /api/market-data`
Get market data for one or more market keys (cached or live).

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `keys` | `string` | all markets | Comma-separated market keys e.g. `nifty,sensex` |
| `forceRefresh` | `boolean` | `false` | Skip cache and fetch live data |

**Example:** `GET /api/market-data?keys=nifty,nasdaq&forceRefresh=true`

**Success `200`:**
```json
{
  "success": true,
  "message": "Market data fetched successfully",
  "source": "cache",
  "invalidKeys": [],
  "count": 2,
  "data": [
    {
      "key": "nifty",
      "symbol": "^NSEI",
      "displayName": "NIFTY 50",
      "price": 22341.5,
      "change": -120.3,
      "changePercent": -0.54,
      "marketState": "CLOSED",
      "cachedUntil": "2026-04-24T01:02:00.000Z"
    }
  ]
}
```

**Source values:**
- `"cache"` — served from MongoDB (still valid)
- `"provider"` — freshly fetched from Yahoo Finance
- `"stale-cache"` — Yahoo Finance failed; old data returned with a `warning` field

---

### `GET /api/market-data/:marketKey`
Get data for a single market by key.

**Example:** `GET /api/market-data/nifty`

**Success `200`** — same shape as above but `data` is an object (not array).  
**`404`** — Key not found.

---

### `POST /api/market-data/refresh`
Force-refresh market data for specified keys, bypassing cache.

**Request Body:**
```json
{ "keys": ["nifty", "sensex"] }
```
Or via query string: `POST /api/market-data/refresh?keys=nifty,sensex`

**Success `200`:**
```json
{
  "success": true,
  "message": "Market data refreshed successfully",
  "source": "provider",
  "count": 2,
  "data": [ ... ]
}
```

---

## Health Check

### `GET /`
Simple liveness probe.

**Response `200`:** `🚀 API is running on Vercel`

---

## Common Error Response Shape

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "details": ["field: validation error"]   // optional, present on 400 validation errors
}
```

## HTTP Status Codes Used

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request (validation / not found) |
| `401` | Unauthorized (invalid token) |
| `403` | Forbidden (email not verified) |
| `404` | Not Found |
| `409` | Conflict (duplicate user/account) |
| `500` | Internal Server Error |
| `502` | Bad Gateway (Yahoo Finance upstream failure) |
