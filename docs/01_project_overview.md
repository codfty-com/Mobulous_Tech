# 📦 Mobulous Tech API — Project Overview

## What Is This Project?

**Mobulous Tech API** is a production-grade Node.js REST API backend deployed on **Vercel** (serverless). It provides:

- User authentication (Email + OTP verification, Google OAuth2)
- Password reset via OTP email flow
- Real-time & cached market data (NSE, BSE, NASDAQ indices and equities via Yahoo Finance)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM — `"type": "module"`) |
| Framework | Express.js v5 |
| Database | MongoDB via Mongoose v9 |
| Auth | JWT (`jsonwebtoken`), Google OAuth2 (`google-auth-library`) |
| Email | Nodemailer (Gmail SMTP) |
| Market Data | `yahoo-finance2` |
| Deployment | Vercel Serverless (`@vercel/node`) |
| Password Hashing | `bcryptjs` |
| HTTP Security | `helmet` (imported but not yet applied in `app.js`) |
| Logging | `morgan` (imported but not yet applied in `app.js`) |

---

## Deployment Architecture

```
Client Request
      │
      ▼
Vercel Edge (vercel.json routes)
      │
      ▼
api/index.js         ← Vercel serverless entry point
      │
      ▼
src/app.js           ← Express app (shared between local and Vercel)
      │
      ├─ Middleware stack (CORS, body parsers, DB wait)
      ├─ /api/... routes
      └─ Error handlers
```

### Local Development

```
server.js → loads dotenv → imports src/app.js → app.listen()
```

### Vercel Production

```
api/index.js → exports src/app.js → Vercel wraps it as a serverless function
```

The `server.js` file is **not used on Vercel**. Vercel reads `vercel.json` and serves `api/index.js` exclusively.

---

## Folder Structure

```
Mobulous_Tech/
├── api/
│   └── index.js            ← Vercel entry: re-exports src/app.js
├── src/
│   ├── app.js              ← Express app setup (middleware + routes)
│   ├── config/
│   │   ├── db.js           ← MongoDB connection (cached for serverless)
│   │   ├── env.js          ← Typed, validated environment variables
│   │   └── marketSymbols.js← Supported market index/equity definitions
│   ├── controllers/
│   │   ├── userController.js        ← Signup + OTP verify
│   │   ├── userLoginController.js   ← Email login + Google login
│   │   ├── forgetPassController.js  ← Forgot/verify/reset password
│   │   ├── marketData.controller.js ← Market data fetch/refresh
│   │   └── allUserList.js           ← Admin: list all users
│   ├── middlewares/
│   │   ├── jwt.js              ← JWT Bearer token verification
│   │   └── validateRequest.js  ← Schema-driven request validation
│   ├── models/
│   │   ├── user.js             ← User Mongoose schema
│   │   └── marketSnapshot.js   ← Market data cache schema
│   ├── routes/
│   │   ├── userRoutes.js       ← Auth endpoints
│   │   ├── resetPassRoutes.js  ← Password reset endpoints
│   │   └── marketDataRoutes.js ← Market data endpoints
│   ├── services/
│   │   ├── googleAuth.service.js   ← Google ID token verification
│   │   └── marketData.service.js   ← Yahoo Finance fetch + cache logic
│   ├── utils/
│   │   ├── http.js         ← AppError class, sendSuccess, sendError helpers
│   │   ├── otp.js          ← OTP generation & hashing utilities
│   │   └── sendEmail.js    ← Nodemailer transporter + sendEmail()
│   └── validators/
│       ├── auth.validators.js    ← Signup, login, OTP, reset validators
│       └── market.validators.js  ← Market query/params validators
├── server.js           ← Local dev entry point
├── vercel.json         ← Vercel routing + build config
├── package.json
├── nodemon.json
├── .gitignore
└── docs/               ← 📂 You are here
```

---

## Key Design Decisions

1. **ESM Modules** — `"type": "module"` throughout; all imports use `.js` extensions.
2. **Serverless-safe DB** — MongoDB connection is cached on `globalThis.__mongoose` so it is reused across warm Vercel invocations.
3. **Single Express app** — `src/app.js` is the source of truth used by both local `server.js` and Vercel `api/index.js`.
4. **Typed env config** — `src/config/env.js` centralises and types all `process.env` access; no raw `process.env.*` calls scattered through business logic.
5. **Validator-first** — `src/validators/` schemas are framework-agnostic plain functions; `validateRequest` middleware bridges them to Express.
