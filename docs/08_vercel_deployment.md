# 🚀 Vercel Deployment Guide

## How the Deployment Works

This project uses Vercel's **serverless Node.js** runtime. The entire Express app is wrapped as a single serverless function.

```
vercel.json
  └── builds: api/index.js  → @vercel/node
  └── routes: /(.*) → /api/index.js

api/index.js
  └── export default app   ← from src/app.js

Vercel wraps `app` as: (req, res) => app(req, res)
```

---

## `vercel.json` Configuration

**File:** `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ]
}
```

All HTTP requests (`GET`, `POST`, etc.) to any path are routed to `api/index.js`, which exports the Express app. Express then handles routing internally.

> **Note:** `routes` is deprecated in Vercel v2 — prefer `rewrites`. See [Best Practice Issues #20](./07_best_practice_issues.md).

---

## `api/index.js` — Serverless Entry Point

```js
import app from "../src/app.js";
export default app;
```

This is intentionally minimal. All configuration, middleware, and routes live in `src/app.js`.

---

## First Deployment Steps

### 1. Install Vercel CLI (optional)
```bash
npm install -g vercel
```

### 2. Login and Link Project
```bash
vercel login
vercel link
```

### 3. Set Environment Variables
Either via Vercel Dashboard or CLI:
```bash
vercel env add MONGO_URI
vercel env add JWT_SECRET
vercel env add EMAIL_USER
vercel env add EMAIL_PASS
vercel env add GOOGLE_CLIENT_IDS
```

### 4. Deploy
```bash
vercel --prod
```

---

## Automatic Deployments via GitHub

If the repository is connected to Vercel via GitHub:

| Event | Result |
|---|---|
| Push to `main` | Deploys to **production** |
| Push to other branches | Creates **preview** deployment |
| Pull Request | Creates **preview** deployment |

---

## Important Vercel Behaviours

### Serverless Cold Starts

Vercel functions are stateless — the process is recycled when idle. The DB connection caching on `globalThis.__mongoose` mitigates this for warm containers, but the first request after idle will incur cold-start latency (~200–500ms for MongoDB Atlas).

### No Persistent File System

Vercel functions have no writable file system. Do not use `fs.writeFile()` or any disk storage. Use MongoDB for all persistence.

### Function Timeout

Vercel's default timeout is **10 seconds** (Hobby plan) or **60 seconds** (Pro plan). Long-running Yahoo Finance requests close to the limit may time out — the stale-cache fallback in `marketData.service.js` handles this case.

### `node_modules` Install

Vercel installs `dependencies` from `package.json` during build. `devDependencies` (like `nodemon`) are **not installed** in production.

### `server.js` is Ignored by Vercel

`server.js` calls `app.listen()` which is meaningless in a serverless context. Vercel ignores it entirely and only reads `api/index.js`. Do not delete `server.js` — it is needed for local development.

---

## Local Development

```bash
# Install dependencies
npm install

# Create .env file (copy from .env.example when created)
cp .env.example .env
# Fill in values

# Start with hot-reload
npm run dev

# Or start without hot-reload
npm start
```

The dev server listens on `http://localhost:3000` (or `PORT` in `.env`).

---

## Vercel Dashboard Checks

After deployment, verify the following in the Vercel dashboard:

1. **Functions** tab → confirm `api/index.js` is listed
2. **Environment Variables** → confirm all required vars are set for `Production`
3. **Deployments** → check the latest build log for errors
4. **Domains** → confirm your custom domain is pointed correctly

---

## Deployment Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `MONGO_URI is not defined` | Missing env var | Add `MONGO_URI` in Vercel settings |
| `JWT authentication is not configured` | Missing `JWT_SECRET` | Add `JWT_SECRET` in Vercel settings |
| `Google login is not configured` | Missing `GOOGLE_CLIENT_IDS` | Add `GOOGLE_CLIENT_IDS` in Vercel settings |
| `Email credentials are missing` | Missing `EMAIL_USER`/`EMAIL_PASS` | Add email env vars |
| 502 on market data | Yahoo Finance unreachable | Stale cache returned; check Vercel logs |
| CORS errors in browser | `CORS_ORIGINS` not set | Set `CORS_ORIGINS=https://your-domain.com` |
| Cold start timeouts | First request after idle | Use Vercel Pro for longer timeout; pre-warm with health checks |
