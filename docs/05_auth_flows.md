# 🔑 Authentication & Authorization Flows

## Overview

The API supports two authentication strategies:

| Strategy | Flow |
|---|---|
| Email + Password | Register → Verify OTP → Login |
| Google OAuth2 | Send ID token → Server verifies → Login/Register |

JWT is generated but **not yet wired into the login response** (see [Best Practice Issues](./07_best_practice_issues.md)).

---

## 1. Email + Password Signup Flow

```
Client                          Server                        DB / Email
  │                               │                               │
  │  POST /api/create-user        │                               │
  │  { name, email, password }    │                               │
  │──────────────────────────────►│                               │
  │                               │  User.findOne({ email })      │
  │                               │──────────────────────────────►│
  │                               │◄──────────────────────────────│
  │                               │                               │
  │                               │  if exists + verified → 409   │
  │                               │  if exists + unverified       │
  │                               │    → update + resend OTP      │
  │                               │  else → new User()            │
  │                               │                               │
  │                               │  bcrypt.hash(password, 10)    │
  │                               │  generateOtp() → setExpiry()  │
  │                               │  user.save()                  │
  │                               │──────────────────────────────►│
  │                               │  sendEmail(email, OTP)        │
  │◄──────────────────────────────│                               │
  │  201 { userId, email,         │                               │
  │        isEmailVerified:false } │                              │
```

---

## 2. Email OTP Verification Flow

```
Client                          Server                        DB
  │                               │                               │
  │  POST /api/verify-email-otp   │                               │
  │  { email, otp }               │                               │
  │──────────────────────────────►│                               │
  │                               │  User.findOne({ email })      │
  │                               │──────────────────────────────►│
  │                               │◄──────────────────────────────│
  │                               │                               │
  │                               │  Check user.otp === otp       │
  │                               │  Check otpExpiry > now        │
  │                               │                               │
  │                               │  user.isEmailVerified = true  │
  │                               │  user.otp = null              │
  │                               │  user.save()                  │
  │◄──────────────────────────────│                               │
  │  200 { message, redirectTo }  │                               │
```

---

## 3. Email + Password Login Flow

```
Client                          Server                        DB
  │                               │                               │
  │  POST /api/login-user         │                               │
  │  { email, password }          │                               │
  │──────────────────────────────►│                               │
  │                               │  User.findOne({ email })      │
  │                               │──────────────────────────────►│
  │                               │◄──────────────────────────────│
  │                               │                               │
  │                               │  Check authMethods includes   │
  │                               │    'email_password'           │
  │                               │  Check isEmailVerified        │
  │                               │  bcrypt.compare(pw, hash)     │
  │                               │                               │
  │                               │  user.lastLoginMethod = 'ep'  │
  │                               │  user.save()                  │
  │◄──────────────────────────────│                               │
  │  200 { data: sanitizedUser }  │                               │
  │  ⚠️ JWT NOT yet in response   │                               │
```

---

## 4. Google OAuth2 Login Flow

```
Client (Mobile/Web)              Server                      Google
  │                               │                               │
  │  [User taps "Sign in with     │                               │
  │   Google" in your app]        │                               │
  │                               │                               │
  │  Google SDK → idToken         │                               │
  │                               │                               │
  │  POST /api/login-google       │                               │
  │  { idToken }                  │                               │
  │──────────────────────────────►│                               │
  │                               │  verifyGoogleIdToken()        │
  │                               │  client.verifyIdToken(...)    │
  │                               │──────────────────────────────►│
  │                               │◄──────────────────────────────│
  │                               │  payload: { sub, email,       │
  │                               │    name, picture }            │
  │                               │                               │
  │                               │  User.findOne({               │
  │                               │    $or: [googleId, email]})   │
  │                               │                               │
  │                               │  if new user → create         │
  │                               │  if existing → merge googleId │
  │                               │  user.isEmailVerified = true  │
  │                               │  user.save()                  │
  │◄──────────────────────────────│                               │
  │  200/201 { data: user }       │                               │
```

---

## 5. Forgot Password Flow

```
Client                          Server                        DB / Email
  │                               │                               │
  │  POST /api/forgot-password    │                               │
  │  { email }                    │                               │
  │──────────────────────────────►│                               │
  │                               │  User.findOne({ email })      │
  │                               │──────────────────────────────►│
  │                               │  Math.random() OTP (6 digits) │
  │                               │  user.otp = otp               │
  │                               │  user.otpExpiry = now + 5min  │
  │                               │  user.save()                  │
  │                               │  sendEmail(email, OTP)        │
  │◄──────────────────────────────│                               │
  │  200 { message }              │                               │
  │                               │                               │
  │  POST /api/verify-otp         │                               │
  │  { email, otp }               │                               │
  │──────────────────────────────►│                               │
  │                               │  check otp match + expiry     │
  │◄──────────────────────────────│                               │
  │  200 verified                 │                               │
  │                               │                               │
  │  POST /api/reset-password     │                               │
  │  { email, newPassword }       │                               │
  │──────────────────────────────►│                               │
  │                               │  bcrypt.hash(newPw, 10)       │
  │                               │  user.password = hash         │
  │                               │  user.otp = null              │
  │                               │  user.save()                  │
  │◄──────────────────────────────│                               │
  │  200 { message }              │                               │
```

---

## JWT Middleware

**File:** `src/middlewares/jwt.js`

The `authenticateRequest` middleware is implemented and ready, but **not yet applied** to any route. When applied, it:

1. Reads the `Authorization` header
2. Expects format: `Bearer <token>`
3. Verifies using `jwt.verify(token, env.jwtSecret)`
4. Attaches decoded payload to `req.user`

Usage:
```js
import { authenticateRequest } from '../middlewares/jwt.js';

router.get('/protected-route', authenticateRequest, controllerFn);
```

---

## OTP Security

**File:** `src/utils/otp.js`

The utility module provides cryptographically secure OTP handling:

- **Generation:** `crypto.randomInt(100000, 1000000)` — uniform distribution, no bias
- **Hashing:** SHA-256 HMAC using `jwtSecret` as salt
- **Matching:** supports both plain OTP and hashed OTP comparison

> ⚠️ **Gap:** The `forgetPassController.js` uses `Math.random()` (not crypto) and stores OTP in plain text. It does not use the `otp.js` utility. See [Best Practice Issues](./07_best_practice_issues.md).
