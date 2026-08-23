# API List

Local base URL: `http://localhost:4500`

Deployed base URL: `https://mobulous-tech.vercel.app`

Important: The app mounts routes both directly and under `/api`. The primary URLs below use `/api` where applicable. Root aliases also work for the same router endpoints, for example `/create-user`, `/users`, `/market-data`, and `/mutual-fund-data`.

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
  "examples": ["HDFC Bank", "Reliance", "Apple"]
}
```

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

## 7. Get All Users

- Method: `GET`
- Local URL: `http://localhost:4500/api/users`
- Deployed URL: `https://mobulous-tech.vercel.app/api/users`
- Payload: Not required
- Purpose: Returns all users with `password`, `otp`, and `otpExpiry` excluded.

## 8. Get User By Query ID

- Method: `GET`
- Local URL: `http://localhost:4500/api/users?_id=64abc123abc123abc123abcd`
- Deployed URL: `https://mobulous-tech.vercel.app/api/users?_id=64abc123abc123abc123abcd`
- Payload: Not required
- Query params:

| Parameter | Required | Example |
|---|---:|---|
| `_id` or `id` | Yes | `64abc123abc123abc123abcd` |

- Purpose: `GET /api/users` switches to single-user lookup when `_id` or `id` is present.

## 9. Get User By Path ID

- Method: `GET`
- Local URL: `http://localhost:4500/api/users/:_id`
- Deployed URL: `https://mobulous-tech.vercel.app/api/users/:_id`
- Example local URL: `http://localhost:4500/api/users/64abc123abc123abc123abcd`
- Payload: Not required

## 10. Update User Profile By ID

- Method: `PATCH`
- Local URL: `http://localhost:4500/api/users/:_id`
- Deployed URL: `https://mobulous-tech.vercel.app/api/users/:_id`
- Example local URL: `http://localhost:4500/api/users/64abc123abc123abc123abcd`
- Headers: `Content-Type: application/json`
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

## 11. Delete User By ID

- Method: `DELETE`
- Local URL: `http://localhost:4500/api/users/:_id`
- Deployed URL: `https://mobulous-tech.vercel.app/api/users/:_id`
- Example local URL: `http://localhost:4500/api/users/64abc123abc123abc123abcd`
- Payload: Not required

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
  "newPassword": "NewSecurePass456"
}
```

- Note: Current controller does not require `otp` in this payload.

## 15A. Search Stocks

- Method: `GET`
- Local URL: `http://localhost:4500/api/stocks`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `query` or `search` | Yes | none | `hdfc bank` |
| `region` | No | `US` | `IN` |
| `count` or `limit` | No | `10`, max `25` | `10` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Purpose: Searches Yahoo Finance stock symbols by company/share name and returns only equity results.
- Example local URL: `http://localhost:4500/api/stocks?query=hdfc%20bank&region=IN&limit=10&lang=en-IN`
- Example deployed URL: `https://mobulous-tech.vercel.app/api/stocks?query=reliance&region=IN&limit=10&lang=en-IN`

## 15. Get Supported Markets

- Method: `GET`
- Local URL: `http://localhost:4500/api/markets`
- Deployed URL: `https://mobulous-tech.vercel.app/api/markets`
- Payload: Not required
- Supported keys: `nifty`, `sensex`, `banknifty`, `nasdaq`, `hdfcbank`

## 16. Get Supported Market Trend Lists

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-trend-lists`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-trend-lists`
- Payload: Not required
- Purpose: Returns supported market movers lists, top-share periods, and supported top-share symbols.

## 17. Get All Market Data

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `forceRefresh` | No | `false` | `true` |

- Purpose: Fetches all default supported market data.
- Example local URL: `http://localhost:4500/api/market-data?forceRefresh=true`

## 18. Get Selected Market Data

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data?keys=nifty,sensex`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data?keys=nifty,sensex`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `keys` | Yes | none | `nifty,sensex` |
| `forceRefresh` | No | `false` | `true` |

- Purpose: Fetches only the selected market keys.
- Example local URL: `http://localhost:4500/api/market-data?keys=nifty,sensex&forceRefresh=true`

## 19. Get Trending Market Symbols

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/trending`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/trending`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `region` | No | `US` | `IN` |
| `count` | No | `10` | `20` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Example local URL: `http://localhost:4500/api/market-data/trending?region=IN&count=20&lang=en-IN`

## 20. Get Market Movers - Most Active

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/movers?list=most_actives`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/movers?list=most_actives`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `list` or `listId` | No | `most_actives` | `most_actives` |
| `region` | No | `US` | `IN` |
| `count` | No | `10` | `20` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Example local URL: `http://localhost:4500/api/market-data/movers?list=most_actives&region=IN&count=20&lang=en-IN`

## 21. Get Market Movers - Top Gainers

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/movers?list=day_gainers`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/movers?list=day_gainers`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `list` or `listId` | Yes | `most_actives` | `day_gainers` |
| `region` | No | `US` | `IN` |
| `count` | No | `10` | `20` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Example local URL: `http://localhost:4500/api/market-data/movers?list=day_gainers&region=IN&count=20&lang=en-IN`

## 22. Get Market Movers - Top Losers

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/movers?list=day_losers`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/movers?list=day_losers`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `list` or `listId` | Yes | `most_actives` | `day_losers` |
| `region` | No | `US` | `IN` |
| `count` | No | `10` | `20` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Example local URL: `http://localhost:4500/api/market-data/movers?list=day_losers&region=IN&count=20&lang=en-IN`

## 22A. Get Market Mover Full Detail By List And Id

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/movers/day_gainers/1`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/movers/day_gainers/1`
- Payload: Not required
- Path params:

| Parameter | Required | Example |
|---|---:|---|
| `listId` | Yes | `day_gainers` |
| `id` | Yes | `1` or `RELIANCE.NS` |

- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `region` | No | `US` | `IN` |
| `count` | No | `10` | `20` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Purpose: Returns one market mover with full details. The `id` can be the mover `rank` from the list response or the stock `symbol`.

## 22B. Get Top 10 Gainers Full Detail List

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/top-gainers/details`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/top-gainers/details`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `ids` or `positions` or `ranks` | No | all top 10 | `1,2,3` |
| `region` | No | `US` | `IN` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Purpose: Returns the full-detail list of the current top 10 gainers.
- If `ids` is omitted, it returns all current top 10 gainers with details.
- If `ids` is provided, it accepts rank positions like `1,2,3` or symbols from the current top 10 list.
## 22B. Get Top Gainer Full Detail By Id

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/top-gainers/1`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/top-gainers/1`
- Payload: Not required
- Path params:

| Parameter | Required | Example |
|---|---:|---|
| `id` | Yes | `1` or `RELIANCE.NS` |

- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `region` | No | `US` | `IN` |
| `count` | No | `10` | `20` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Purpose: Returns one top gainer with full details by `rank` or `symbol`.

## 22C. Get Top Loser Full Detail By Id

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/top-losers/1`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/top-losers/1`
- Payload: Not required
- Path params:

| Parameter | Required | Example |
|---|---:|---|
| `id` | Yes | `1` or `RELIANCE.NS` |

- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `region` | No | `US` | `IN` |
| `count` | No | `10` | `20` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Purpose: Returns one top loser with full details by `rank` or `symbol`.

## 23. Get Top Share Markets

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/top-shares`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/top-shares`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `period` or `type` | No | `daily` | `weekly` |
| `count` | No | full configured list | `10` |
| `symbol` or `ticker` | No | none | `RELIANCE.NS` |
| `symbols` | No | none | `RELIANCE.NS,TCS.NS` |
| `forceRefresh` | No | `false` | `true` |

- Supported periods: `daily`, `weekly`, `monthly`
- Example local URL: `http://localhost:4500/api/market-data/top-shares?period=weekly&count=10`

## 24. Get Selected Top Share Data By Symbol

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/top-shares?symbol=RELIANCE.NS`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/top-shares?symbol=RELIANCE.NS`
- Payload: Not required
- Query params:

| Parameter | Required | Example |
|---|---:|---|
| `symbol` or `ticker` | Yes | `RELIANCE.NS` |
| `period` or `type` | No | `daily` |
| `forceRefresh` | No | `true` |

- Purpose: Returns only the selected supported share data.

## 25. Get Selected Top Share Data By Multiple Symbols

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/top-shares?symbols=RELIANCE.NS,TCS.NS`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/top-shares?symbols=RELIANCE.NS,TCS.NS`
- Payload: Not required
- Query params:

| Parameter | Required | Example |
|---|---:|---|
| `symbols` | Yes | `RELIANCE.NS,TCS.NS` |
| `period` or `type` | No | `weekly` |
| `forceRefresh` | No | `true` |

## 26. Get Top Share Markets By Daily Period

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/top-shares/daily`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/top-shares/daily`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `count` | No | full configured list | `10` |
| `symbol` or `ticker` | No | none | `RELIANCE.NS` |
| `symbols` | No | none | `RELIANCE.NS,TCS.NS` |
| `forceRefresh` | No | `false` | `true` |

## 27. Get Top Share Markets By Weekly Period

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/top-shares/weekly`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/top-shares/weekly`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `count` | No | full configured list | `10` |
| `symbol` or `ticker` | No | none | `RELIANCE.NS` |
| `symbols` | No | none | `RELIANCE.NS,TCS.NS` |
| `forceRefresh` | No | `false` | `true` |

## 28. Get Top Share Markets By Monthly Period

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/top-shares/monthly`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/top-shares/monthly`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `count` | No | full configured list | `10` |
| `symbol` or `ticker` | No | none | `RELIANCE.NS` |
| `symbols` | No | none | `RELIANCE.NS,TCS.NS` |
| `forceRefresh` | No | `false` | `true` |

## 29. Get Market Overview

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/overview`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/overview`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `region` | No | `US` | `IN` |
| `count` | No | `10` | `10` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Response includes: `trending`, `mostActives`, `dayGainers`, `dayLosers`
- Example local URL: `http://localhost:4500/api/market-data/overview?region=IN&count=10&lang=en-IN`

## 30. Get Market Home

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/home`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/home`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `region` | No | `IN` | `IN` |
| `count` | No | `20` | `20` |
| `lang` | No | region language | `en-IN` |
| `topShareCount` or `nifty100Count` | No | full configured list | `99` |
| `topSharePeriod` or `period` | No | `daily` | `weekly` |
| `forceRefresh` | No | `false` | `true` |

- Response sections: `marketIndices`, `trendingStocks`, `mostActive`, `topGainers`, `topLosers`, `nifty100`, `mutualFunds`, `etfs`, `ipo`, `marketNews`, `watchlist`
- Example local URL: `http://localhost:4500/api/market-data/home?region=IN&count=20&topShareCount=99`

## 31. Get Market News

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-news`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-news`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `query` or `search` | No | `stock market` | `banking stocks` |
| `region` | No | `US` | `IN` |
| `count` | No | `10`, max `50` | `20` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Purpose: Search Yahoo Finance market news by keyword.
- Note: If the selected region returns no news, the service falls back to `US` news and marks it in response metadata.

## 32. Get Live Trading News

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-news/live`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-news/live`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `query` or `search` | No | `stock market today` | `nifty today` |
| `region` | No | `US` | `IN` |
| `count` | No | `10`, max `50` | `20` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Purpose: Latest trading/live market news feed.
- Example local URL: `http://localhost:4500/api/market-news/live?region=IN&count=20`

## 33. Get Related Market News By Symbols

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-news/related`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-news/related`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `symbols` | No | none | `RELIANCE.NS,TCS.NS` |
| `symbol` or `ticker` | No | none | `RELIANCE.NS` |
| `query` or `search` | No | `stock market` if no symbols | `technology stocks` |
| `region` | No | `US` | `IN` |
| `count` | No | `10`, max `50` | `20` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Purpose: Related news for one or more selected share symbols.
- Example local URL: `http://localhost:4500/api/market-news/related?symbols=RELIANCE.NS,TCS.NS&count=20`

## 34. Get Market News By Symbol

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-news/symbol/:symbol`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-news/symbol/:symbol`
- Example local URL: `http://localhost:4500/api/market-news/symbol/RELIANCE.NS?count=10`
- Payload: Not required
- Query params:

| Parameter | Required | Default | Example |
|---|---:|---|---|
| `region` | No | `US` | `IN` |
| `count` | No | `10`, max `50` | `10` |
| `lang` | No | region language | `en-IN` |
| `forceRefresh` | No | `false` | `true` |

- Purpose: News for a single selected share symbol.

## 35. Get Market Data By Key - NIFTY

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/nifty`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/nifty`
- Payload: Not required
- Query params: `forceRefresh` optional

## 36. Get Market Data By Key - SENSEX

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/sensex`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/sensex`
- Payload: Not required
- Query params: `forceRefresh` optional

## 37. Get Market Data By Key - BANK NIFTY

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/banknifty`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/banknifty`
- Payload: Not required
- Query params: `forceRefresh` optional

## 38. Get Market Data By Key - NASDAQ

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/nasdaq`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/nasdaq`
- Payload: Not required
- Query params: `forceRefresh` optional

## 39. Get Market Data By Key - HDFC Bank

- Method: `GET`
- Local URL: `http://localhost:4500/api/market-data/hdfcbank`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/hdfcbank`
- Payload: Not required
- Query params: `forceRefresh` optional

## 40. Refresh Market Data

- Method: `POST`
- Local URL: `http://localhost:4500/api/market-data/refresh`
- Deployed URL: `https://mobulous-tech.vercel.app/api/market-data/refresh`
- Headers: `Content-Type: application/json`
- Payload:

```json
{
  "keys": ["nifty", "sensex", "banknifty", "nasdaq", "hdfcbank"]
}
```

- Alternative query URL: `http://localhost:4500/api/market-data/refresh?keys=nifty,sensex`
- Note: If `keys` is omitted, default supported market keys are refreshed.

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

## 46. Refresh Mutual Fund Data

- Method: `POST`
- Local URL: `http://localhost:4500/api/mutual-fund-data/refresh`
- Deployed URL: `https://mobulous-tech.vercel.app/api/mutual-fund-data/refresh`
- Headers: `Content-Type: application/json`
- Payload option 1:

```json
{
  "schemeCodes": [122639, 120465]
}
```

- Payload option 2:

```json
{
  "schemeCode": 122639
}
```

- Alternative query URL: `http://localhost:4500/api/mutual-fund-data/refresh?schemeCodes=122639,120465`
- Note: If scheme code input is omitted, default scheme codes are refreshed.

## Common Error Shape

```json
{
  "success": false,
  "message": "Human-readable error message",
  "details": {}
}
```

## Current Future / Not Configured Areas

These are represented in `GET /api/market-data/home`, but do not have standalone APIs yet:

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

- Required fields: `symbol`, `name`, `quantity`
- Optional fields: All others. `price` is accepted as a frontend-friendly alias for `purchasePrice`; if `currentPrice` is omitted, `price` is also used as `currentPrice`.
- Calculated response fields include `totalInvestment` and `totalValue` as `purchasePrice * quantity`.
- `transactionType` must be `buy` or `sell`; default is `buy`.
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
- Response includes: stocks array, pagination info, and portfolio summary

## 58. Get Portfolio Summary

- Method: `GET`
- Local URL: `http://localhost:4500/api/stocks/summary`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/summary`
- Headers: `Authorization: Bearer <JWT_TOKEN>`
- Payload: Not required
- Purpose: Returns overall portfolio statistics and breakdown by sector
- Response includes: totalInvestment, totalCurrentValue, totalProfitLoss, totalProfitLossPercentage, sector-wise breakdown

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

## 61. Update Stock Details

- Method: `PUT`
- Local URL: `http://localhost:4500/api/stocks/:id`
- Deployed URL: `https://mobulous-tech.vercel.app/api/stocks/:id`
- Example local URL: `http://localhost:4500/api/stocks/64abc123abc123abc123abcd`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>`
- Payload (all fields optional):

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
