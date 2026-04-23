# 📋 Docs Index — Mobulous Tech API

Welcome to the documentation for the **Mobulous Tech API** — a production Node.js REST API deployed on Vercel.

---

## Table of Contents

| # | Document | Description |
|---|---|---|
| 01 | [Project Overview](./01_project_overview.md) | Tech stack, architecture diagram, folder structure, key design decisions |
| 02 | [Environment Variables](./02_environment_variables.md) | All env vars, defaults, how to set on Vercel, `.env` example |
| 03 | [Database Design](./03_database_design.md) | MongoDB models, field reference, cache strategy, connection pattern |
| 04 | [API Reference](./04_api_reference.md) | All endpoints with request/response examples and status codes |
| 05 | [Auth Flows](./05_auth_flows.md) | Signup, OTP verify, login, Google OAuth, forgot password — with flow diagrams |
| 06 | [Market Data Flow](./06_market_data_flow.md) | Cache strategy, Yahoo Finance integration, normalization, upsert logic |
| 07 | [Best Practice Issues](./07_best_practice_issues.md) | Full audit of production issues ranked by severity with fixes |
| 08 | [Vercel Deployment](./08_vercel_deployment.md) | How deployment works, setup steps, troubleshooting, serverless gotchas |
| 09 | [Middleware & Utils Reference](./09_middleware_and_utils.md) | JWT middleware, validators, sendSuccess/sendError, OTP utils, email helper |

---

## Quick Start

```bash
# Install
npm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Run locally
npm run dev

# Deploy
vercel --prod
```

---

## Critical Issues to Fix Before Next Release

> See [07_best_practice_issues.md](./07_best_practice_issues.md) for full details.

| Priority | Issue |
|---|---|
| 🔴 | `GET /api/users` is publicly exposed — add authentication |
| 🔴 | `reset-password` does not re-verify OTP — exploitable |
| 🔴 | Login does not return a JWT token |
| 🔴 | `Math.random()` used for OTP in forgot-password flow |
| 🟠 | `helmet` not applied — missing HTTP security headers |
| 🟠 | CORS is open to all origins — configure `CORS_ORIGINS` |
