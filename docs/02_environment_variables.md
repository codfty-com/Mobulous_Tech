# 🔐 Environment Variables

All environment variables are centralised and typed in `src/config/env.js`.  
**Never** read `process.env.*` directly in business logic — always import from `env`.

---

## Required Variables

These **must** be set or the server will malfunction:

| Variable | Type | Description |
|---|---|---|
| `MONGO_URI` | `string` | Full MongoDB connection string (Atlas recommended) |
| `JWT_SECRET` | `string` | Secret used to sign/verify JWT tokens. Use a long random string (≥32 chars) |
| `EMAIL_USER` | `string` | Gmail address used as the SMTP sender |
| `EMAIL_PASS` | `string` | Gmail App Password (not your regular password) |
| `GOOGLE_CLIENT_IDS` | `string` | Comma-separated Google OAuth2 Client IDs for token verification |

---

## Optional Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `NODE_ENV` | `string` | `development` | Set to `production` on Vercel |
| `PORT` | `number` | `3000` | Local dev port. Vercel ignores this |
| `APP_NAME` | `string` | `Mobulous Tech API` | Application display name |
| `APP_BASE_URL` | `string` | auto-detected | Base URL. Falls back to `VERCEL_URL` then `localhost` |
| `CORS_ORIGINS` | `string` | `""` (open) | Comma-separated allowed CORS origins. Empty = allow all |
| `ENABLE_SWAGGER` | `boolean` | `true` | Enable or disable Swagger UI |
| `REQUEST_BODY_LIMIT` | `string` | `1mb` | Max request body size |
| `LOGIN_REDIRECT_URL` | `string` | `/login` | URL to redirect to after email verification |
| `OTP_EXPIRY_MINUTES` | `number` | `5` | OTP validity window in minutes |
| `MARKET_CACHE_DURATION_MINUTES` | `number` | `2` | How long market data is cached in MongoDB |
| `JWT_EXPIRES_IN` | `string` | `1d` | JWT expiry (e.g. `1d`, `12h`, `30m`) |
| `GOOGLE_CLIENT_ID` | `string` | — | Single Google Client ID (alias for `GOOGLE_CLIENT_IDS`) |

---

## Vercel Auto-injected Variables

Vercel automatically injects these — do **not** set them manually:

| Variable | Description |
|---|---|
| `VERCEL_URL` | The deployment URL (e.g. `mobulous-tech.vercel.app`). Used to auto-build `appBaseUrl` |
| `PORT` | Vercel assigns the port; your code should not hard-code it |

---

## Local `.env` Example

Create a `.env` file at the project root (it is git-ignored):

```env
# ─── Database ───────────────────────────────────────────────
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/mobulous?retryWrites=true&w=majority

# ─── Auth ────────────────────────────────────────────────────
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
JWT_EXPIRES_IN=1d

# ─── Email ───────────────────────────────────────────────────
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your_gmail_app_password

# ─── Google OAuth ────────────────────────────────────────────
GOOGLE_CLIENT_IDS=your_google_client_id.apps.googleusercontent.com

# ─── App ─────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
APP_NAME=Mobulous Tech API
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
OTP_EXPIRY_MINUTES=5
MARKET_CACHE_DURATION_MINUTES=2
```

---

## How `env.js` Parses Values

```
Boolean  → "1" | "true" | "yes" | "on"  → true ; anything else → false
Number   → Number(value) ; NaN → fallback default
List     → comma-split, trim, filter empty strings
String   → .trim() with fallback default
```

---

## Setting Variables on Vercel

1. Go to **Vercel Dashboard → Project → Settings → Environment Variables**
2. Add each key/value pair
3. Select environment scope: **Production**, **Preview**, **Development**
4. Redeploy after any change

> **Security tip**: Never commit `.env` to Git. The `.gitignore` already excludes `.env` and `.env.*`.
