# 🔐 JWT Authentication System - Complete Guide

**Implementation Date:** August 5, 2026  
**Authentication Type:** JWT (JSON Web Token)  
**Token Strategy:** Access Token + Refresh Token  
**Base URL (Local):** `http://localhost:4500`  
**Base URL (Deployed):** `https://mobulous-tech.vercel.app`

---

## 📋 Overview

This project now implements a **secure JWT authentication system** with:

- ✅ **Access Tokens** (short-lived, 15 minutes)
- ✅ **Refresh Tokens** (long-lived, 7 days)
- ✅ **Token Storage in Database** (MongoDB)
- ✅ **Device Tracking** (User Agent + IP Address)
- ✅ **Token Revocation** (Logout from single device or all devices)
- ✅ **Automatic Cleanup** (Expired tokens removed from DB)
- ✅ **Admin Role Support** (Admin-only endpoints)

---

## 🔑 Token Types

### Access Token
- **Duration:** 15 minutes
- **Purpose:** Authenticate API requests
- **Usage:** Include in `Authorization` header
- **Secret:** `JWT_SECRET`
- **Payload:**
  ```json
  {
    "userId": "64abc123...",
    "email": "user@example.com",
    "name": "John Doe",
    "admin": false,
    "type": "access",
    "iat": 1722864000,
    "exp": 1722864900,
    "iss": "Mobulous Tech API",
    "sub": "64abc123..."
  }
  ```

### Refresh Token
- **Duration:** 7 days
- **Purpose:** Generate new access tokens
- **Storage:** MongoDB database
- **Secret:** `JWT_REFRESH_SECRET`
- **Payload:**
  ```json
  {
    "userId": "64abc123...",
    "email": "user@example.com",
    "type": "refresh",
    "jti": "unique-token-id",
    "iat": 1722864000,
    "exp": 1723468800,
    "iss": "Mobulous Tech API",
    "sub": "64abc123..."
  }
  ```

---

## 🚀 How to Use Authentication

### Step 1: Login

**Endpoint:** `POST /api/login-user`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "64abc123...",
      "name": "John Doe",
      "email": "user@example.com",
      "isEmailVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "15m",
    "tokenType": "Bearer"
  }
}
```

**Store Both Tokens:**
- `accessToken` → Use for API requests (expires in 15 min)
- `refreshToken` → Use to get new access token (expires in 7 days)

---

### Step 2: Make Authenticated Requests

**Include Access Token in Header:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

**Example Request:**
```bash
curl -X GET http://localhost:4500/api/users/64abc123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response:**
```json
{
  "success": true,
  "message": "User profile fetched successfully",
  "data": {
    "_id": "64abc123...",
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

---

### Step 3: Refresh Access Token (When Expired)

**When access token expires (after 15 minutes), you'll get:**
```json
{
  "success": false,
  "message": "Access token has expired. Please refresh your token."
}
```

**Use Refresh Token to Get New Access Token:**

**Endpoint:** `POST /api/auth/refresh-token`

**Request:**
```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "data": {
    "accessToken": "NEW_ACCESS_TOKEN",
    "refreshToken": "SAME_REFRESH_TOKEN",
    "expiresIn": "15m",
    "tokenType": "Bearer"
  }
}
```

**Update Your Stored Access Token** and continue making requests.

---

## 📡 Authentication Endpoints

### 1. Login with Email/Password

**POST** `/api/login-user`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Returns:** Access Token + Refresh Token

---

### 2. Login with Google OAuth

**POST** `/api/login-google`

**Request:**
```json
{
  "idToken": "GOOGLE_ID_TOKEN"
}
```

**Returns:** Access Token + Refresh Token

---

### 3. Refresh Access Token

**POST** `/api/auth/refresh-token`

**Request:**
```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

**Returns:** New Access Token (same Refresh Token)

---

### 4. Get Current User Info

**GET** `/api/auth/me`

**Headers:** `Authorization: Bearer ACCESS_TOKEN`

**Response:**
```json
{
  "success": true,
  "message": "User info fetched successfully",
  "data": {
    "userId": "64abc123...",
    "email": "user@example.com",
    "name": "John Doe",
    "admin": false
  }
}
```

---

### 5. Logout (Revoke Single Token)

**POST** `/api/auth/revoke-token`

**Request:**
```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

**Effect:** Logs out from **this device only**

---

### 6. Logout from All Devices

**POST** `/api/auth/logout-all`

**Headers:** `Authorization: Bearer ACCESS_TOKEN`

**Effect:** Revokes **all refresh tokens** for the user

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out from all devices. 3 session(s) terminated.",
  "data": {
    "revokedCount": 3
  }
}
```

---

## 🔒 Protected Endpoints

### User Management

| Endpoint | Method | Auth Required | Admin Only |
|---|---|---|---|
| `POST /api/create-user` | POST | ❌ No | ❌ No |
| `POST /api/verify-email-otp` | POST | ❌ No | ❌ No |
| `POST /api/login-user` | POST | ❌ No | ❌ No |
| `POST /api/login-google` | POST | ❌ No | ❌ No |
| `GET /api/users` | GET | ✅ Yes | ✅ Yes |
| `GET /api/users/:id` | GET | ✅ Yes | ❌ No |
| `PATCH /api/users/:id` | PATCH | ✅ Yes | ❌ No |
| `DELETE /api/users/:id` | DELETE | ✅ Yes | ✅ Yes |

### Market Data

| Endpoint | Method | Auth Required |
|---|---|---|
| `GET /api/markets` | GET | ❌ No |
| `GET /api/stocks` | GET | ❌ No |
| `GET /api/market-data` | GET | ❌ No |
| `GET /api/market-data/:key` | GET | ❌ No |
| `POST /api/market-data/refresh` | POST | ✅ Yes |

### Mutual Funds

| Endpoint | Method | Auth Required |
|---|---|---|
| `GET /api/mutual-funds` | GET | ❌ No |
| `GET /api/mutual-fund-data` | GET | ❌ No |
| `POST /api/mutual-fund-data/refresh` | POST | ✅ Yes |

### Authentication

| Endpoint | Method | Auth Required |
|---|---|---|
| `POST /api/auth/refresh-token` | POST | ❌ No |
| `POST /api/auth/revoke-token` | POST | ❌ No |
| `POST /api/auth/logout-all` | POST | ✅ Yes |
| `GET /api/auth/me` | GET | ✅ Yes |

---

## 🛡️ Security Features

### 1. Token Expiry
- **Access Token:** 15 minutes (short for security)
- **Refresh Token:** 7 days (long for convenience)

### 2. Database Storage
- All refresh tokens stored in MongoDB
- Can be revoked anytime
- Tracks device info (User Agent, IP)

### 3. Device Tracking
```json
{
  "deviceInfo": {
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "ip": "192.168.1.100"
  }
}
```

### 4. Token Limits
- Maximum **5 refresh tokens** per user
- Older tokens automatically revoked
- Prevents unlimited device sessions

### 5. Token Revocation
- **Single Device:** Revoke one token
- **All Devices:** Revoke all user tokens
- **Expired Cleanup:** Automatic removal

### 6. Admin Role
- Special `admin: true` field in token
- Admin-only endpoints protected with `requireAdmin` middleware
- Example: `GET /api/users` (list all users)

---

## 📱 Frontend Implementation

### JavaScript Example

```javascript
class AuthService {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async login(email, password) {
    const response = await fetch('/api/login-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    
    if (result.success) {
      this.accessToken = result.data.accessToken;
      this.refreshToken = result.data.refreshToken;
      
      localStorage.setItem('accessToken', this.accessToken);
      localStorage.setItem('refreshToken', this.refreshToken);
    }

    return result;
  }

  async makeAuthenticatedRequest(url, options = {}) {
    // Add Authorization header
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`
    };

    let response = await fetch(url, options);

    // If token expired, refresh and retry
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      
      if (refreshed) {
        options.headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(url, options);
      }
    }

    return response.json();
  }

  async refreshAccessToken() {
    const response = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    const result = await response.json();

    if (result.success) {
      this.accessToken = result.data.accessToken;
      localStorage.setItem('accessToken', this.accessToken);
      return true;
    }

    // Refresh token expired - need to login again
    this.logout();
    return false;
  }

  async logout() {
    await fetch('/api/auth/revoke-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.accessToken = null;
    this.refreshToken = null;
  }

  async logoutAllDevices() {
    await fetch('/api/auth/logout-all', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    this.logout();
  }
}

// Usage
const auth = new AuthService();

// Login
await auth.login('user@example.com', 'password');

// Make authenticated request
const userData = await auth.makeAuthenticatedRequest('/api/users/64abc123');

// Logout
await auth.logout();
```

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# JWT Access Token
JWT_SECRET=rIdphI6SdHfdp5HubkdaRW9BWr8oBZjBtJWt0K-aP7A-AssetHeavenSecureKey2026
JWT_EXPIRES_IN=15m

# JWT Refresh Token
JWT_REFRESH_SECRET=RefreshSecret-AssetHeaven-2026-MoreSecureRefreshKey-XyZ123
JWT_REFRESH_EXPIRES_IN=7d
```

### Time Format Options
- `s` - seconds (e.g., `30s`)
- `m` - minutes (e.g., `15m`)
- `h` - hours (e.g., `2h`)
- `d` - days (e.g., `7d`)

---

## ❌ Error Responses

### 401 Unauthorized - Missing Token
```json
{
  "success": false,
  "message": "Authorization header must be: Bearer <access_token>"
}
```

### 401 Unauthorized - Expired Token
```json
{
  "success": false,
  "message": "Access token has expired. Please refresh your token."
}
```

### 401 Unauthorized - Invalid Token
```json
{
  "success": false,
  "message": "Invalid access token. Please login again."
}
```

### 403 Forbidden - Not Admin
```json
{
  "success": false,
  "message": "Admin access required"
}
```

### 401 Unauthorized - Refresh Token Invalid
```json
{
  "success": false,
  "message": "Refresh token is invalid or has been revoked"
}
```

---

## 🧪 Testing with cURL

### 1. Login
```bash
curl -X POST http://localhost:4500/api/login-user \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 2. Access Protected Endpoint
```bash
curl -X GET http://localhost:4500/api/users/64abc123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Refresh Token
```bash
curl -X POST http://localhost:4500/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### 4. Logout
```bash
curl -X POST http://localhost:4500/api/auth/revoke-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

---

## 🎯 Best Practices

### 1. Token Storage
- ✅ **Access Token:** Memory or sessionStorage (not localStorage for XSS protection)
- ✅ **Refresh Token:** httpOnly cookie (most secure) or localStorage
- ❌ **Never:** Store in plain text, URL parameters, or logs

### 2. Token Refresh Strategy
- Refresh access token **before** it expires (e.g., at 14 minutes)
- Or refresh **on demand** when you get 401 error
- Implement **silent refresh** in background

### 3. Logout
- Always call `/api/auth/revoke-token` on logout
- Clear tokens from storage
- Redirect to login page

### 4. Security
- Use HTTPS in production (always)
- Validate tokens on every request
- Implement rate limiting on auth endpoints
- Log suspicious activity (multiple failed logins)

---

## 📊 Database Schema

### RefreshToken Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  token: String (unique),
  expiresAt: Date,
  isRevoked: Boolean,
  deviceInfo: {
    userAgent: String,
    ip: String
  },
  lastUsedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ token: 1, isRevoked: 1 }` - Fast token lookup
- `{ userId: 1, isRevoked: 1 }` - User's active tokens
- `{ expiresAt: 1, isRevoked: 1 }` - Cleanup expired tokens

---

## 🔄 Token Lifecycle

```
1. User Login
   ↓
2. Generate Access + Refresh Tokens
   ↓
3. Store Refresh Token in DB
   ↓
4. Return Both Tokens to Client
   ↓
5. Client Uses Access Token (15 min)
   ↓
6. Access Token Expires
   ↓
7. Client Calls /refresh-token with Refresh Token
   ↓
8. Verify Refresh Token (JWT + DB)
   ↓
9. Generate New Access Token
   ↓
10. Return New Access Token
    ↓
11. Repeat Steps 5-10 (for 7 days)
    ↓
12. Refresh Token Expires → User Must Login Again
```

---

## 🚀 Deployment Notes

### Vercel Environment Variables

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_REFRESH_EXPIRES_IN=7d
```

### Production Checklist
- ✅ Set strong JWT secrets (not the example ones!)
- ✅ Enable HTTPS (Vercel does this automatically)
- ✅ Configure CORS properly (`CORS_ORIGINS`)
- ✅ Add rate limiting to auth endpoints
- ✅ Monitor token usage and failed logins
- ✅ Set up automatic cleanup job for expired tokens

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue:** "JWT authentication is not configured"
- **Fix:** Set `JWT_SECRET` in `.env` file

**Issue:** "Refresh token is invalid or has been revoked"
- **Fix:** User must login again (refresh token expired or revoked)

**Issue:** "Authorization header must be: Bearer <access_token>"
- **Fix:** Include `Authorization: Bearer YOUR_TOKEN` header

**Issue:** Access token works locally but not on Vercel
- **Fix:** Add JWT secrets to Vercel environment variables

---

**Created by:** Kiro AI  
**Date:** August 5, 2026  
**Version:** 1.0.0  
**Token Strategy:** Access (15m) + Refresh (7d)
