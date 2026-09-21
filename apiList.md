# API List

Local base URL: `http://localhost:4500`

Deployed base URL: `https://mobulous-tech.vercel.app`

Use the `/api` URLs below for every application integration. Only the API-list and asset routers currently also expose root aliases; those aliases are compatibility routes and should not be used by new clients.

Protected endpoints require `Authorization: Bearer <accessToken>`. Admin endpoints require the same header with a token whose `admin` claim is `true`. JSON endpoints use `Content-Type: application/json`.

## 1. Get API List Markdown

- Method: `GET`
- Local URL: `http://localhost:4500/api/api-list`
- Deployed URL: `https://mobulous-tech.vercel.app/api/api-list`
- Payload: Not required
- Response type: `text/markdown`
- Purpose: Returns this `apiList.md` file so clients/admin panels can show the API documentation from the deployed backend.
- Root alias: `http://localhost:4500/api-list` and `https://mobulous-tech.vercel.app/api-list`

## 2. Health Check

- Method: `GET`
- Local URL: `http://localhost:4500/`
- Deployed URL: `https://mobulous-tech.vercel.app/`
- Payload: Not required
- Purpose: App liveness check.

## 2A. Get Assets List

- Method: `GET`
- Local URL: `http://localhost:4500/api/assets`
- Deployed URL: `https://mobulous-tech.vercel.app/api/assets`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `status` | No | all statuses | `available` or `coming_soon` |
| `isActive` | No | all | `true` or `false` |

- Purpose: Returns asset categories for frontend screens: stocks, mutual funds, ETF, fixed deposit, metals, ULIP, cash, and others.
- Default response includes all asset categories.
- Each asset item includes an `icon` URL that can be used directly in an image tag.
- Use `status=available` to return only categories that already have data/search APIs.
- Example local URL: `http://localhost:4500/api/assets`

Example item:

```json
{
  "key": "stocks",
  "name": "Stocks",
  "icon": "https://api.iconify.design/lucide:chart-candlestick.svg?color=%23156ff7",
  "description": "Company shares listed on stock exchanges.",
  "status": "available",
  "dataRoute": "/api/stocks",
  "searchParam": "query",
    "examples": ["HDFC Bank", "Reliance", "TCS"]
}
```

### Asset details and net worth

| Method | Production URL | Auth | Payload / query |
|---|---|---|---|
| `GET` | `https://mobulous-tech.vercel.app/api/assets/:id` | Required | No payload; `id` is the asset MongoDB `_id` |
| `GET` | `https://mobulous-tech.vercel.app/api/assets/net-worth` | Required | No payload; optional `userId` query is admin-only for another user |

## Indian Top 99 Stock Market Data

This public API is restricted to the configured 99 NSE (`.NS`) shares. It does not accept a country, exchange, count, or symbol-list parameter, so it cannot return non-Indian market data.

| Period | Method | Local URL | Chart coverage |
|---|---|---|---|
| Daily | `GET` | `http://localhost:4500/api/indian-market/top-99-stocks/daily` | One trading day; 5-minute candles |
| Weekly | `GET` | `http://localhost:4500/api/indian-market/top-99-stocks/weekly` | Five trading days; daily candles |
| Monthly | `GET` | `http://localhost:4500/api/indian-market/top-99-stocks/monthly` | One month; daily candles |

- Auth: Not required.
- Payload: Not required.
- Optional query: `forceRefresh=true` bypasses the short-lived cache.
- Valid `:period` values: `daily`, `weekly`, `monthly`.

Each response has `country: "India"`, `exchange: "NSE"`, `count: 99`, and a `data` array. Each item contains `rank`, `symbol`, display name, currency, exchange, latest price, previous close, and an OHLCV `points` array (`time`, `open`, `high`, `low`, `close`, `volume`, `adjustedClose`). Individual provider failures are returned as an item with `status: "error"` and are also listed in `meta.failedSymbols`.

## Indian Top Gainers and Top Losers

These public endpoints return exactly 25 NSE (`.NS`) shares. Yahoo Finance's predefined movers screen can return non-Indian symbols, so these endpoints instead rank live Yahoo quotes from the configured Indian NSE universe. The response has `country: "India"`, `exchange: "NSE"`, and `meta.universe: "configured-nse-99"`.

| Purpose | Method | Local URL |
|---|---|---|
| List top 25 gainers | `GET` | `http://localhost:4500/api/indian-market/top-gainers` |
| Gainer details after a click | `GET` | `http://localhost:4500/api/indian-market/top-gainers/:symbol` |
| List top 25 losers | `GET` | `http://localhost:4500/api/indian-market/top-losers` |
| Loser details after a click | `GET` | `http://localhost:4500/api/indian-market/top-losers/:symbol` |

- Auth: Not required.
- Optional query: `forceRefresh=true` skips the two-minute market-data cache.
- For a detail URL, pass the exact `symbol` returned by its matching list, for example: `GET /api/indian-market/top-gainers/HDFCBANK.NS`.
- Detail routes reject non-NSE symbols and return `404` when the stock is no longer in that current top-25 list.
- Each list item includes rank, symbol, company name, INR price, day change/change percentage, OHLC, volume, market time, and 52-week high/low. Detail responses add bid/ask, average volume, market cap, shares outstanding, book value, P/E, EPS, dividend, and beta when Yahoo provides them.

## 3. Create User / Signup

- Method: `POST`
- Local URL: `http://localhost:4500/api/create-user`
- Deployed URL: `https://mobulous-tech.vercel.app/api/create-user`
- Headers: `Content-Type: application/json`
- Payload:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "+919876543210"
}
```

- Required fields: `name`, `email`, `password`
- Optional fields: `phone`

## 4. Verify Signup Email OTP

- Method: `POST`
- Local URL: `http://localhost:4500/api/verify-email-otp`
- Deployed URL: `https://mobulous-tech.vercel.app/api/verify-email-otp`
- Headers: `Content-Type: application/json`
- Payload:

```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

- Optional query: `redirect=true`
- Note: Current signup OTP endpoint is `/api/verify-email-otp`.

## 5. Login User

- Method: `POST`
- Local URL: `http://localhost:4500/api/login-user`
- Deployed URL: `https://mobulous-tech.vercel.app/api/login-user`
- Headers: `Content-Type: application/json`
- Payload:

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

- Response: returns the user data plus `accessToken`, `refreshToken`, and `expiresIn`. Use `accessToken` in the `Authorization: Bearer <accessToken>` header for protected APIs.

## 6. Login With Google

- Method: `POST`
- Local URL: `http://localhost:4500/api/login-google`
- Deployed URL: `https://mobulous-tech.vercel.app/api/login-google`
- Headers: `Content-Type: application/json`
- Payload:

```json
{
  "idToken": "GOOGLE_ID_TOKEN_HERE"
}
```

- Note: Requires Google client ID environment configuration.

### Token and authenticated-session APIs

| Method | Production URL | Auth | Payload |
|---|---|---|---|
| `POST` | `https://mobulous-tech.vercel.app/api/auth/refresh-token` | Public | `{ "refreshToken": "<refresh-token>" }` |
| `POST` | `https://mobulous-tech.vercel.app/api/auth/revoke-token` | Public | `{ "refreshToken": "<refresh-token>" }` |
| `POST` | `https://mobulous-tech.vercel.app/api/auth/logout` | Required | Optional `{ "refreshToken": "<refresh-token>" }` |
| `POST` | `https://mobulous-tech.vercel.app/api/auth/logout-all` | Required | No payload |
| `GET` | `https://mobulous-tech.vercel.app/api/auth/me` | Required | No payload |
| `POST` | `https://mobulous-tech.vercel.app/api/auth/change-password` | Required | `{ "oldPassword": "OldPass123", "newPassword": "NewPass456" }` |

Access tokens are sent as `Authorization: Bearer <accessToken>`. The refresh and revoke endpoints accept refresh tokens only in the JSON body.

## 7. Get All Users

- Method: `GET`
- Local URL: `http://localhost:4500/api/admin/users`
- Deployed URL: `https://mobulous-tech.vercel.app/api/admin/users`
- Payload: Not required
- Auth: Admin access required.
- Purpose: Returns all users, including soft-deleted users, with `password`, `otp`, and `otpExpiry` excluded. Each user includes `isDeleted` and `deletedAt`.

## 8. Get User By Path ID

- Method: `GET`
- Local URL: `http://localhost:4500/api/admin/users/:_id`
- Deployed URL: `https://mobulous-tech.vercel.app/api/admin/users/:_id`
- Example local URL: `http://localhost:4500/api/admin/users/64abc123abc123abc123abcd`
- Payload: Not required
- Auth: Admin access required.

## 9. Update User Profile By ID

- Method: `PATCH`
- Local URL: `http://localhost:4500/api/users/:_id`
- Deployed URL: `https://mobulous-tech.vercel.app/api/users/:_id`
- Example local URL: `http://localhost:4500/api/users/64abc123abc123abc123abcd`
- Headers: `Content-Type: application/json`
- Auth: Required. A user can update only their own profile; an admin can update any profile.
- Payload:

```json
{
  "name": "John Updated",
  "phone": "+919999999999",
  "profilePicture": "https://example.com/profile.png"
}
```

- Allowed fields: `name`, `phone`, `profilePicture`
- Note: Send `null` or `""` for `phone` or `profilePicture` to remove them.

## 10. Soft Delete User By ID (Admin)

- Method: `DELETE`
- Local URL: `http://localhost:4500/api/admin/users/:_id`
- Deployed URL: `https://mobulous-tech.vercel.app/api/admin/users/:_id`
- Example local URL: `http://localhost:4500/api/admin/users/64abc123abc123abc123abcd`
- Payload: Not required
- Auth: Admin access required.

- Purpose: Marks the user as deleted while retaining the record and its `deletedAt` timestamp.

## 11. Permanently Delete User By ID (Admin)

- Method: `DELETE`
- Local URL: `http://localhost:4500/api/admin/users/:_id/permanent`
- Deployed URL: `https://mobulous-tech.vercel.app/api/admin/users/:_id/permanent`
- Example local URL: `http://localhost:4500/api/admin/users/64abc123abc123abc123abcd/permanent`
- Payload: Not required
- Auth: Admin access required.
- Purpose: Permanently removes the user record. This action cannot be undone.

## 12. Forgot Password / Send OTP

- Method: `POST`
- Local URL: `http://localhost:4500/api/forgot-password`
- Deployed URL: `https://mobulous-tech.vercel.app/api/forgot-password`
- Headers: `Content-Type: application/json`
- Payload:

```json
{
  "email": "john@example.com"
}
```

## 13. Verify Password Reset OTP

- Method: `POST`
- Local URL: `http://localhost:4500/api/verify-otp`
- Deployed URL: `https://mobulous-tech.vercel.app/api/verify-otp`
- Headers: `Content-Type: application/json`
- Payload:

```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

## 14. Reset Password

- Method: `POST`
- Local URL: `http://localhost:4500/api/reset-password`
- Deployed URL: `https://mobulous-tech.vercel.app/api/reset-password`
- Headers: `Content-Type: application/json`
- Payload:

```json
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass456"
}
```

- Required fields: `email`, the unexpired 6-digit `otp`, and `newPassword` (minimum 8 characters). A successful reset consumes the OTP.

## 15A. Search Stocks

- Method: `GET`
- Local URL: `http://localhost:4500/api/stocks`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `query` or `search` | Yes | none | `hdfc bank` |
| `region` | No | `IN` (the only accepted value) | `IN` |
| `count` or `limit` | No | `10`, max `25` | `10` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Auth: Not required.
- Purpose: Searches only Indian cash equities listed on NSE (`.NS`) or BSE (`.BO`). Funds, indices, ETFs, crypto, ADRs, and overseas shares are excluded. Every result includes `country: "India"`, `exchange`, `currency`, and `isIndianStock: true` so it can be used to prefill the add-transaction form.
- `region` must be `IN`; any other value returns `400`.
- Example local URL: `http://localhost:4500/api/stocks?query=hdfc%20bank&region=IN&limit=10&lang=en-IN`
- Example deployed URL: `https://mobulous-tech.vercel.app/api/stocks?query=reliance&region=IN&limit=10&lang=en-IN`

## 15. Get Indices

- Method: `GET`
- Local URL: `http://localhost:4500/api/indices`
- Deployed URL: `https://mobulous-tech.vercel.app/api/indices`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `forceRefresh` | No | `false` | `true` |

- Purpose: Fetches only configured instruments whose type is `INDEX`. Equities such as `hdfcbank` are excluded.
- Example local URL: `http://localhost:4500/api/indices?forceRefresh=true`

## News APIs — `src/routes/newsRoutes.js`

Only two public news feeds are available. Both accept optional `count` (default `10`, maximum `50`) and `forceRefresh` (default `false`).

## 31. Get India Trading News (Default)

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-news`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-news`
- Purpose: India trading news from NIFTY 50 and SENSEX feeds. The service filters articles to India-market coverage and does not accept country, language, symbol, or keyword overrides.

## 32. Get Global Trading News

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-news/global`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-news/global`
- Purpose: Global trading news balanced across S&P 500, FTSE 100, Nikkei 225, and Hang Seng feeds.

## 41. Search Mutual Funds

- Method: `GET`
- Local URL: `http://localhost:4500/api/mutual-funds`
- Deployed URL: `https://mobulous-tech.vercel.app/api/mutual-funds`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `query` or `search` | No | empty search | `parag parikh` |
| `limit` | No | `50`, max `100` | `10` |
| `forceRefresh` | No | `false` | `true` |

- Example local URL: `http://localhost:4500/api/mutual-funds?query=parag%20parikh&limit=10`

## 42. Get Mutual Fund Data For Default Schemes

- Method: `GET`
- Local URL: `http://localhost:4500/api/mutual-fund-data`
- Deployed URL: `https://mobulous-tech.vercel.app/api/mutual-fund-data`
- Payload: Not required
- Default scheme codes: `122639`, `120465`, `100119`

## 43. Get Mutual Fund Data For Selected Scheme Codes

- Method: `GET`
- Local URL: `http://localhost:4500/api/mutual-fund-data?schemeCodes=122639,120465`
- Deployed URL: `https://mobulous-tech.vercel.app/api/mutual-fund-data?schemeCodes=122639,120465`
- Payload: Not required
- Query params:

| Parameter | Required | Example |
|---|---:|---|
| `schemeCodes` | Yes | `122639,120465` |
| `forceRefresh` | No | `true` |

## 44. Get Mutual Fund Data By Scheme Code

- Method: `GET`
- Local URL: `http://localhost:4500/api/mutual-fund-data/:schemeCode`
- Deployed URL: `https://mobulous-tech.vercel.app/api/mutual-fund-data/:schemeCode`
- Example local URL: `http://localhost:4500/api/mutual-fund-data/122639`
- Payload: Not required
- Query params: `forceRefresh` optional

## 45. Get Mutual Fund History By Scheme Code

- Method: `GET`
- Local URL: `http://localhost:4500/api/mutual-fund-data/:schemeCode/history`
- Deployed URL: `https://mobulous-tech.vercel.app/api/mutual-fund-data/:schemeCode/history`
- Example local URL: `http://localhost:4500/api/mutual-fund-data/122639/history?limit=30`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `limit` | No | `30` | `30` or `all` |
| `forceRefresh` | No | `false` | `true` |

## Common Error Shape

```json
{
  "success": false,
  "message": "Human-readable error message",
  "details": {}
}
```

## Current Future / Not Configured Areas

No endpoint is currently configured for these areas:

- ETFs
- IPO
- Watchlist


## 56. Add Stock to Collection

- Method: `POST`
- Local URL: `http://localhost:4500/api/stocks`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>`
- Payload:

```json
{
  "symbol": "RELIANCE.NS",
  "name": "Reliance Industries Limited",
  "icon": "https://example.com/icons/reliance.png",
  "quantity": 10,
  "price": 2500.50,
  "purchasePrice": 2500.50,
  "currentPrice": 2650.00,
  "exchange": "NSE",
  "sector": "Energy",
  "currency": "INR",
  "transactionDate": "2026-01-15",
  "purchaseDate": "2026-01-15",
  "transactionType": "buy",
  "marketCap": "Large Cap",
  "dividendYield": 0.8,
  "peRatio": 12.5,
  "notes": "Long term investment for dividend income",
  "tags": ["blue-chip", "energy", "dividend"],
  "watchlist": true,
  "alerts": {
    "enabled": true,
    "targetPrice": 3000.00,
    "stopLoss": 2200.00
  }
}
```

- Required fields: `symbol`, `name`, `quantity`, and either `price` or `purchasePrice`.
- Only Indian equities can be saved: the symbol must end in `.NS` (NSE) or `.BO` (BSE). The API derives the matching `exchange` and saves the currency as `INR`; a conflicting exchange or non-INR currency is rejected.
- `quantity` must be greater than zero. The transaction type controls whether it adds to or subtracts from the holding.
- `price` is accepted as a frontend-friendly alias for `purchasePrice`; for a sell row it is the sale price. If `currentPrice` is omitted, `price` is also used as `currentPrice`.
- Calculated response fields include `transactionValue`, `signedQuantity`, and the legacy `totalInvestment`/`totalValue` aliases.
- `transactionType` must be `buy` or `sell`; default is `buy`.
- A sell is rejected with `409` when its quantity exceeds the authenticated user's available quantity for that symbol.
- `transactionDate` is accepted as the manual transaction date. `purchaseDate` remains supported for older clients.
- Supported market caps: `Large Cap`, `Mid Cap`, `Small Cap`, `Micro Cap`

## 57. Get User's Stock Collection

- Method: `GET`
- Local URL: `http://localhost:4500/api/stocks`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks`
- Headers: `Authorization: Bearer <JWT_TOKEN>`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `symbol` | No | all | `RELIANCE` (partial match) |
| `sector` | No | all | `Energy` (partial match) |
| `exchange` | No | all | `NSE` |
| `transactionType` | No | all | `buy` or `sell` |
| `watchlist` | No | all | `true` or `false` |
| `tags` | No | all | `blue-chip,dividend` |
| `page` | No | `1` | `1` |
| `limit` | No | `50`, max `100` | `20` |
| `sortBy` | No | `createdAt` | `symbol`, `name`, `quantity`, `purchasePrice`, `currentPrice`, `sector`, `purchaseDate`, `transactionDate`, `transactionType` |
| `sortOrder` | No | `desc` | `asc` or `desc` |

- Example local URL: `http://localhost:4500/api/stocks?sector=Energy&watchlist=true&page=1&limit=20&sortBy=currentPrice&sortOrder=desc`
- Response includes: transaction rows, pagination info, signed portfolio summary, and `transactionOptions: ["buy", "sell"]`. Every row contains its own `transactionType`.

## 57A. Get Consolidated Stock Holdings

- Method: `GET`
- Local URL: `http://localhost:4500/api/stocks/holdings`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/holdings`
- Headers: `Authorization: Bearer <JWT_TOKEN>`
- Payload: Not required
- Purpose: Groups all buy and sell transactions by symbol and returns only open positions with net quantity, latest current price, current value, net investment, and profit/loss.

## 58. Get Portfolio Summary

- Method: `GET`
- Local URL: `http://localhost:4500/api/stocks/summary`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/summary`
- Headers: `Authorization: Bearer <JWT_TOKEN>`
- Payload: Not required
- Purpose: Returns overall portfolio statistics and breakdown by sector
- Response includes: totalInvestment, totalCurrentValue, totalProfitLoss, totalProfitLossPercentage, sector-wise breakdown

## 58A. Get Logged-in User's Stock Net Worth

- Method: `GET`
- Local URL: `http://localhost:4500/api/stocks/net-worth`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/net-worth`
- Headers: `Authorization: Bearer <JWT_TOKEN>`
- Query params: `period=weekly|3months|6months|1year|3years|all` (default: `all`). Short forms such as `1y`, `3y`, `3m`, and `6m` are also accepted.
- Purpose: Returns the total current value of the authenticated user's stock holdings only. The owner is obtained exclusively from the verified JWT; a `userId` supplied in a request cannot select another user's data. For a selected period, the response also replays that user's buy/sell transactions against historical market closing prices.
- Response includes: `totalNetWorth`, `totalInvestedValue`, `totalProfitLoss`, `totalProfitLossPercentage`, `holdingsCount`, `totalQuantity`, `period` (including period P/L, P/L percent, and net contributions), `history`, and `calculatedAt`.
- Example: `http://localhost:4500/api/stocks/net-worth?period=3months`

## 59. Get Watchlist Stocks

- Method: `GET`
- Local URL: `http://localhost:4500/api/stocks/watchlist`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/watchlist`
- Headers: `Authorization: Bearer <JWT_TOKEN>`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `page` | No | `1` | `1` |
| `limit` | No | `20`, max `100` | `10` |
| `sortBy` | No | `lastUpdated` | `symbol`, `currentPrice`, `purchaseDate` |
| `sortOrder` | No | `desc` | `asc` or `desc` |

- Purpose: Returns only stocks marked as watchlist items

## 60. Get Single Stock Details

- Method: `GET`
- Local URL: `http://localhost:4500/api/stocks/:id`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/:id`
- Example local URL: `http://localhost:4500/api/stocks/64abc123abc123abc123abcd`
- Headers: `Authorization: Bearer <JWT_TOKEN>`
- Payload: Not required

## 61. Update Stock Transaction

- Method: `PATCH` or `PUT`
- Local URL: `http://localhost:4500/api/stocks/:id`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/:id`
- Example local URL: `http://localhost:4500/api/stocks/64abc123abc123abc123abcd`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>`
- Payload: Send at least one field. A change is rejected if it would make the user's quantity for that symbol negative.

```json
{
  "quantity": 15,
  "currentPrice": 2700.00,
  "sector": "Oil & Gas",
  "notes": "Increased position due to positive outlook",
  "tags": ["blue-chip", "energy", "dividend", "growth"],
  "watchlist": false,
  "alerts": {
    "enabled": true,
    "targetPrice": 3200.00,
    "stopLoss": 2400.00
  }
}
```

## 62. Bulk Update Stock Prices

- Method: `PATCH`
- Local URL: `http://localhost:4500/api/stocks/prices`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/prices`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>`
- Payload:

```json
{
  "updates": [
    {
      "id": "64abc123abc123abc123abcd",
      "currentPrice": 2700.00
    },
    {
      "id": "64abc456def456def456def4",
      "currentPrice": 1680.50
    }
  ]
}
```

- Maximum 50 stocks per request
- Each update requires: `id` and `currentPrice`

## 63. Add/Remove Stock from Watchlist

- Method: `PATCH`
- Local URL: `http://localhost:4500/api/stocks/:id/watchlist`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/:id/watchlist`
- Example local URL: `http://localhost:4500/api/stocks/64abc123abc123abc123abcd/watchlist`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>`
- Payload:

```json
{
  "watchlist": true
}
```

- Purpose: Toggle watchlist status for a stock

## 64. Set Price Alerts for Stock

- Method: `PATCH`
- Local URL: `http://localhost:4500/api/stocks/:id/alerts`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/:id/alerts`
- Example local URL: `http://localhost:4500/api/stocks/64abc123abc123abc123abcd/alerts`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>`
- Payload:

```json
{
  "enabled": true,
  "targetPrice": 3000.00,
  "stopLoss": 2200.00
}
```

- All fields optional, at least one required
- Purpose: Set target price and stop loss alerts

## 65. Delete Stock from Collection

- Method: `DELETE`
- Local URL: `http://localhost:4500/api/stocks/:id`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/:id`
- Example local URL: `http://localhost:4500/api/stocks/64abc123abc123abc123abcd`
- Headers: `Authorization: Bearer <JWT_TOKEN>`
- Payload: Not required
- Purpose: Permanently removes stock from user's collection

---

## Stock Management Features

### Automatic Calculations
- **Total Investment:** `purchasePrice × quantity`
- **Current Value:** `currentPrice × quantity`  
- **Profit/Loss:** `currentValue - totalInvestment`
- **Profit/Loss %:** `((currentValue - totalInvestment) / totalInvestment) × 100`

### Watchlist Management
- Add/remove stocks from watchlist
- Get watchlist-only view
- Filter by watchlist status

### Price Alerts
- Set target price alerts
- Set stop loss alerts
- Enable/disable alerts per stock

### Portfolio Analytics
- Overall portfolio value and P&L
- Sector-wise breakdown
- Performance tracking

### Data Validation
- Allows multiple manual stock transactions for the same user and symbol
- Validates stock symbols, prices, quantities
- Supports various market caps and sectors

---

## 66. Manual Mutual Fund Holdings

These endpoints manage a user's manually entered mutual-fund holdings. They are separate from the public mutual-fund scheme/NAV lookup endpoints, and all require `Authorization: Bearer <JWT_TOKEN>`.

| Action | Method | URL |
|---|---|---|
| Add holding | `POST` | `/api/mutual-fund-holdings` |
| List holdings | `GET` | `/api/mutual-fund-holdings` |
| Get holding | `GET` | `/api/mutual-fund-holdings/:id` |
| Update holding | `PATCH` or `PUT` | `/api/mutual-fund-holdings/:id` |
| Delete holding | `DELETE` | `/api/mutual-fund-holdings/:id` |

Required add payload fields are `fundName`, plus either `units`/`quantity` and `investedAmount`, or `units`/`quantity` and `price`/`purchaseNav` so the server can calculate `investedAmount`. Optional fields are `schemeCode`, `folioNumber`, `icon`, `purchaseNav`, `currentNav`, `transactionDate`, `transactionType`, `purchaseDate`, `fundHouse`, `category`, `notes`, and `tags`.

Example add payload:

```json
{
  "fundName": "Example Flexi Cap Fund - Direct Growth",
  "schemeCode": "122639",
  "icon": "https://example.com/icons/flexi-cap.png",
  "quantity": 125.5,
  "price": 180.5,
  "currentNav": 205.75,
  "transactionDate": "2026-01-15",
  "transactionType": "buy"
}
```

The response includes calculated `totalValue` as the invested amount. In the example above, `investedAmount` is calculated as `quantity * price`.

List holdings query params: `search`, `transactionType=buy|sell`, `page`, `limit`, and `sortOrder=asc|desc`.

Update payload: send any non-empty subset of the add fields. `quantity` aliases `units`, `price` aliases `purchaseNav`, and `transactionDate` aliases `purchaseDate`. The `GET`, `PATCH`/`PUT`, and `DELETE` `:id` routes use the holding MongoDB `_id` returned by the add/list APIs. Delete has no request payload.

---

## 67. Expense APIs

`GET /api/expenses/categories` is public and has no payload. It returns: `food`, `shopping`, `transport`, `bills`, and `entertainment`. Every other expense endpoint requires `Authorization: Bearer <accessToken>` and operates only on the authenticated user's records.

| Action | Method | Production URL | Payload / query |
|---|---|---|---|
| Categories | `GET` | `https://mobulous-tech.vercel.app/api/expenses/categories` | No payload |
| Add | `POST` | `https://mobulous-tech.vercel.app/api/expenses` | Expense JSON shown below |
| List | `GET` | `https://mobulous-tech.vercel.app/api/expenses` | Query: `category`, `search`, `from`/`dateFrom`, `to`/`dateTo`, `page`, `limit`, `sortOrder` |
| Summary | `GET` | `https://mobulous-tech.vercel.app/api/expenses/summary` | Query: `budget`/`totalBudget`, `from`/`dateFrom`, `to`/`dateTo` |
| Get one | `GET` | `https://mobulous-tech.vercel.app/api/expenses/:id` | No payload |
| Update | `PATCH` or `PUT` | `https://mobulous-tech.vercel.app/api/expenses/:id` | Any non-empty subset of the expense fields |
| Delete | `DELETE` | `https://mobulous-tech.vercel.app/api/expenses/:id` | No payload |

Add-expense payload (`amount` and `category` required):

```json
{
  "amount": 850.5,
  "category": "food",
  "notes": "Dinner",
  "expenseDate": "2026-09-09T18:30:00.000Z"
}
```

`transactionDate` is accepted as an alias for `expenseDate`. `limit` defaults to `50` and is capped at `100`; `sortOrder` is `asc` or `desc`.

---

## Complete route index

This index is the authoritative list of primary `/api` routes implemented in `src/app.js`. `Body: none` means do not send a JSON payload; use the documented path or query parameters instead.

| Method | Path | Access | Body |
|---|---|---|---|
| `GET` | `/` | Public | None |
| `GET` | `/api/api-list` | Public | None |
| `GET` | `/api/assets` | User | None |
| `GET` | `/api/assets/net-worth` | User | None |
| `GET` | `/api/assets/:id` | User | None |
| `POST` | `/api/create-user` | Public | `name`, `email`, `password`; optional `phone` |
| `POST` | `/api/verify-email-otp` | Public | `email`, `otp` |
| `POST` | `/api/login-user` | Public | `email`, `password` |
| `POST` | `/api/login-google` | Public | `idToken` |
| `GET` | `/api/admin/users` | Admin | None |
| `GET` | `/api/admin/users/:_id` | Admin | None |
| `DELETE` | `/api/admin/users/:_id` | Admin | Soft delete |
| `DELETE` | `/api/admin/users/:_id/permanent` | Admin | Permanent delete |
| `PATCH` | `/api/users/:_id` | User/owner or admin | Partial profile object |
| `POST` | `/api/forgot-password` | Public | `email` |
| `POST` | `/api/verify-otp` | Public | `email`, `otp` |
| `POST` | `/api/reset-password` | Public | `email`, `otp`, `newPassword` |
| `POST` | `/api/auth/refresh-token` | Public | `refreshToken` |
| `POST` | `/api/auth/revoke-token` | Public | `refreshToken` |
| `POST` | `/api/auth/logout` | User | Optional `refreshToken` |
| `POST` | `/api/auth/logout-all` | User | None |
| `GET` | `/api/auth/me` | User | None |
| `POST` | `/api/auth/change-password` | User | `oldPassword`, `newPassword` |
| `GET` | `/api/indices` | Public | Optional `forceRefresh` |
| `GET` | `/api/indian-market/top-99-stocks/:period` | Public | `:period` is `daily`, `weekly`, or `monthly`; optional `forceRefresh=true` |
| `GET` | `/api/market-news` | Public | None |
| `GET` | `/api/market-news/global` | Public | None |
| `GET` | `/api/mutual-funds` | Public | None |
| `GET` | `/api/mutual-fund-data` | Public | None |
| `GET` | `/api/mutual-fund-data/:schemeCode/history` | Public | None |
| `GET` | `/api/mutual-fund-data/:schemeCode` | Public | None |
| `GET` | `/api/stocks?query=...` | Public | Indian NSE/BSE equity search; `region=IN`, `limit=1..25` |
| `POST`, `GET` | `/api/stocks` | User | Add Indian-stock transaction for `POST`; omit `query` for portfolio `GET` |
| `GET` | `/api/stocks/summary` | User | None |
| `GET` | `/api/stocks/holdings` | User | None |
| `GET` | `/api/stocks/net-worth` | User | Optional `period`; owner is always the JWT user |
| `GET` | `/api/stocks/watchlist` | User | None |
| `PATCH` | `/api/stocks/prices` | User | `updates` array |
| `GET`, `DELETE` | `/api/stocks/:id` | User | None |
| `PATCH`, `PUT` | `/api/stocks/:id` | User | Partial stock transaction object |
| `PATCH` | `/api/stocks/:id/watchlist` | User | `watchlist` boolean |
| `PATCH` | `/api/stocks/:id/alerts` | User | `enabled`, `targetPrice`, `stopLoss` |
| `POST`, `GET` | `/api/mutual-fund-holdings` | User | Add body for `POST`; none for `GET` |
| `GET`, `DELETE` | `/api/mutual-fund-holdings/:id` | User | None |
| `PATCH`, `PUT` | `/api/mutual-fund-holdings/:id` | User | Partial holding object |
| `GET` | `/api/expenses/categories` | Public | None |
| `POST`, `GET` | `/api/expenses` | User | Add body for `POST`; none for `GET` |
| `GET` | `/api/expenses/summary` | User | None |
| `GET`, `DELETE` | `/api/expenses/:id` | User | None |
| `PATCH`, `PUT` | `/api/expenses/:id` | User | Partial expense object |
