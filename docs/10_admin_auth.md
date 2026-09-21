# Admin authentication

Admin login uses the existing MongoDB `User` model, with `admin: true`, `isEmailVerified: true`, and `isDeleted: false`. Passwords are bcrypt hashes. The configured initial account is `assetheaven.admin@yopmail.com`; its password is supplied privately during setup and is not committed to source control.

## Initial setup

Configure `MONGO_URI`, `MONGO_DB_NAME`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`. Supply `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your local environment, then run:

```sh
npm run seed:admin
```

Remove the seed credentials from the environment afterward. The script creates the admin once, preserves any existing admin password on subsequent runs, and refuses to promote an existing regular user. It uses the same database configuration as the application. Run it separately in each environment that needs the account.

Keep `SKIP_JWT_AUTH_FOR_TESTING=false` for normal application use. No frontend hardcoded credential check is needed: submit login credentials to the endpoint below and use the returned bearer token.

## API contract

All requests below use `Content-Type: application/json` and require no bearer token.

| Endpoint | Required body fields | Success |
| --- | --- | --- |
| `POST /api/admin/login` | `email`, `password` | 200: `data.user`, `data.accessToken`, `data.refreshToken`, `data.expiresIn`, `data.tokenType` |
| `POST /api/admin/forgot-password` | `email` | 200: generic confirmation |
| `POST /api/admin/verify-otp` | `email`, `otp` | 200: OTP valid; optional step |
| `POST /api/admin/reset-password` | `email`, `otp`, `newPassword` | 200: password changed; log in again |

Emails are trimmed and converted to lowercase. Passwords are preserved exactly and may contain spaces; bcrypt inputs are limited to 72 UTF-8 bytes. New passwords must be at least 8 characters long. OTPs must be strings of exactly six digits. Invalid input returns 400; incorrect login credentials return 401; invalid, expired, consumed, or exhausted OTP challenges return 400. Responses never include password hashes or OTPs.

Login example:

```json
{
  "email": "assetheaven.admin@yopmail.com",
  "password": "<admin password>"
}
```

Reset example (use the code from the email):

```json
{
  "email": "assetheaven.admin@yopmail.com",
  "otp": "123456",
  "newPassword": "<new password>"
}
```

Use `Authorization: Bearer <accessToken>` for protected endpoints, including `/api/admin/users`. Existing `/api/auth/refresh-token`, `/api/auth/logout`, and `/api/auth/logout-all` routes remain available. Existing `/api/login-user` also checks the stored password and issues the same admin session claims for this account.

## Admin frontend integration and 401 troubleshooting

The mutual-fund router must scope authentication to `/mutual-funds` and `/mutual-fund-data`. A bare `router.use(authenticateRequest)` in that router also intercepts admin login and token refresh mounted afterward, returning 401 before their public handlers run. Redeploy the backend after applying this fix. `npm run test:admin-auth` now exercises the shared production API router to cover this regression.

Log in against the same backend that serves the users endpoint, then send the returned `data.accessToken` on every protected request. The API does not set an authentication cookie; `credentials: "include"` alone does not authenticate a request. Opening the users URL directly in the address bar also does not send a Bearer token.

```js
const API = "https://mobulous-tech.vercel.app/api";

// Call with the email and password entered in the admin login form.
async function loginAndLoadUsers(email, password) {
  const loginResponse = await fetch(`${API}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = await loginResponse.json();
  if (!loginResponse.ok) throw new Error(login.message || "Login failed");

  const { accessToken, refreshToken } = login.data;
  const usersResponse = await fetch(`${API}/admin/users`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const users = await usersResponse.json();
  if (!usersResponse.ok) throw new Error(users.message || "Unable to load users");

  // Keep tokens in the application's session state for subsequent requests.
  return { users: users.data, accessToken, refreshToken };
}
```

With Axios, the token is at `loginResponse.data.data.accessToken` because Axios wraps the JSON response in its own `data` property. With `fetch`, it is at `login.data.accessToken` after calling `.json()` as above. Send the access token, not the refresh token, an entire response object, or a quoted JSON string.

| Result | Action |
| --- | --- |
| 401: `Authorization header must be: Bearer <access_token>` | Inspect the GET request's Request Headers in DevTools and attach the header shown above. |
| 401: access token expired | POST `{ "refreshToken": "<refresh token>" }` to `/api/auth/refresh-token`, use its `data.accessToken`, and retry once. If refresh fails, log in again. |
| 401: invalid token or authentication failed | Log in again against this deployment. Tokens issued before an admin password reset, legacy admin tokens, or tokens signed with a different backend secret cannot be used. |
| 403: admin access required | Log in using an active admin account; a regular user's token cannot list admin users. |
| Browser CORS error | Check that the frontend origin is permitted by `CORS_ORIGINS` and that OPTIONS permits `Authorization`. |

`strict-origin-when-cross-origin` is the browser's referrer policy, not an authorization error. CORS is configured in `src/config/env.js` and runs before route authentication in `src/app.js`. Preflight requests require no token and return 204 for allowed origins. Allowed responses include `Access-Control-Allow-Origin` matching the requesting origin and permit `Content-Type` and `Authorization`.

If using an explicit `CORS_ORIGINS` allowlist in Vercel, include the actual frontend origin (scheme, hostname, and port, without a path or trailing slash), for example `https://admin.example.com,http://localhost:3000,http://localhost:5173`. Redeploy after changing environment variables. Check the admin site's origin, not just the API hostname. An unset allowlist currently permits all origins; CORS permission still does not grant admin access. Keep `SKIP_JWT_AUTH_FOR_TESTING=false`.

## Email and reset behavior

The existing Gmail Nodemailer transport sends the OTP to the stored admin email. Configure `EMAIL_USER` and `EMAIL_PASS` (Gmail app password) for the sender. The admin login password is unrelated to the email sender password. `OTP_EXPIRY_MINUTES` defaults to 5.

OTP hashes and reset metadata are stored separately from ordinary user signup/reset OTPs and excluded from normal database queries. Public user password-reset routes exclude admins. Requesting a new admin OTP replaces the previous challenge. Only one email request per admin is accepted every 60 seconds; requests during cooldown receive the same generic confirmation without sending another email. Missing, deleted, unverified, and non-admin accounts also receive this confirmation without email delivery.

Verification and reset share a maximum of five attempts per challenge, including successful verification calls. The frontend should verify at most once before submitting reset, or submit reset directly. OTP expiry, attempt reservation, and final password update use conditional MongoDB writes; concurrent reset requests can consume a challenge only once. Mail failures return 503 and clear the undelivered challenge so delivery can be retried.

Password reset increments the admin session version and revokes stored refresh tokens. Each privileged access request and refresh checks the current admin role, active state, and session version in MongoDB. Old admin JWTs without the session version require a new login. Authenticated password changes also increment the version and clear pending reset challenges.

## Verification

`npm run test:admin-auth` tests HTTP validation, login, role enforcement, OTP delivery content, cooldown, attempt exhaustion, expiry, concurrent reset, replay rejection, session invalidation, and mail failure using isolated persistence and mail doubles. `npm test` runs these alongside the existing checks. These automated tests do not send email or connect to a real database.
