# User authentication

The backend returns JWTs from both email/password and Google login. All routes below are under `/api`. Use JSON requests. Successful responses use `{ success: true, message, data }`; errors include `message` and, for validation failures, `details`.

| Step | Endpoint | Body / response |
| --- | --- | --- |
| Signup | POST /create-user | name, email, password, optional phone; returns userId/email and sends signup OTP |
| Verify email | POST /verify-email-otp | email, otp; verify first, then log in |
| Password login | POST /login-user | email, password; data.user, data.accessToken, data.refreshToken, data.expiresIn, data.tokenType |
| Google login | POST /login-google | idToken from Google Identity Services; same token response |
| Forgot password | POST /forgot-password | email; generic confirmation for eligible accounts |
| Verify reset code | POST /verify-otp | email, otp; optional check before reset |
| Reset password | POST /reset-password | email, otp, newPassword; requires the OTP again and invalidates old sessions |
| Restore session | GET /auth/me | Bearer access token; returns user identity |
| Refresh | POST /auth/refresh-token | refreshToken; no access token required |
| Change password | POST /auth/change-password | Bearer access token, oldPassword, newPassword; sign in again afterward |
| Logout | POST /auth/logout | Bearer access token, refreshToken; revokes this refresh session |
| Logout all devices | POST /auth/logout-all | Bearer access token; invalidates all user sessions |
| Current profile | GET or PATCH /users/:_id | Bearer access token; self or admin only |

Emails are normalized. Passwords are preserved exactly, require at least eight characters when setting a password, and are limited to 72 UTF-8 bytes for bcrypt. Legacy accounts created before exact password preservation used trimmed passwords. Existing user IDs, endpoint names, and Bearer-token response shapes are unchanged.

Signup and recovery codes are separate hashed challenges. Signup resends have a 60-second cooldown and verification allows at most five attempts. Password recovery only sends to verified, active, non-admin email/password accounts; unrecognized or ineligible addresses receive the same confirmation. Recovery delivery has a 60-second cooldown. Verification and reset share a five-attempt limit, and reset consumes its challenge with an atomic conditional write. Expired, exhausted, consumed and replayed codes fail. Codes are never returned in JSON or logs.

Access and refresh JWTs carry a user token version. Protected requests and refresh verify account state and token version against MongoDB. Deleted/unverified users cannot continue using existing sessions. Reset, password change and logout-all increment the version; refresh records are revoked as well. Legacy JWTs without a version are treated as version zero, so a password change invalidates them. Admin sessions continue to use the separate admin version checks.

Single-device logout revokes its refresh token; already issued access JWTs retain their remaining lifetime. Use a short `JWT_EXPIRES_IN` (for example `15m`) and logout-all to immediately invalidate all devices. Refresh tokens currently remain stable on refresh; they are validated against unrevoked database records with expiry checks.

## User web frontend

The Next.js user frontend calls its own `/api/backend` gateway. The gateway keeps both JWTs in HttpOnly cookies, forwards Bearer tokens server-to-server, protects cookie-authenticated mutations with origin/custom-header checks, and strips JWTs from browser responses. Its Zustand store contains only transient user identity and session status. Dashboard pages validate `/auth/me` before mounting. A shared refresh request handles concurrent 401s with one retry. Backend 5xx/network failures stay retryable.

Configure server-only frontend `API_BASE_URL` to `http://localhost:4500/api` locally or the deployed backend URL. Its former `NEXT_PUBLIC_API_BASE_URL` is still accepted as a fallback. Production requires HTTPS and a Next.js server runtime. Deploy both repositories together, sign in again, and request a new reset OTP after upgrading (old recovery challenges are intentionally superseded).

Google sign-in additionally requires frontend `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, backend `GOOGLE_CLIENT_IDS`, and authorized frontend origins in Google Cloud. SMTP delivery requires backend `EMAIL_USER` and `EMAIL_PASS`. Keep stable, independent JWT secrets and `SKIP_JWT_AUTH_FOR_TESTING=false`. Apply hosting/WAF throttling to public authentication requests in addition to account OTP limits.

## Verification

`npm run test:user-auth` exercises actual HTTP routes, bcrypt, JWTs and MongoDB using an isolated temporary database and captured mail. It covers signup, verification, login, recovery attempts/expiry/concurrent reset/replay, session invalidation, deleted users, logout, and Google identity exchange (Google verification is stubbed).

Optionally set `USER_FRONTEND_PATH` to the user frontend repository before running it to exercise the real Next.js gateway against these backend routes. The frontend's `npm run test:auth` additionally covers HttpOnly/Secure cookies, CSRF rejection, token stripping, concurrent refresh and temporary failures. Tests do not send real emails or use the application's database.
