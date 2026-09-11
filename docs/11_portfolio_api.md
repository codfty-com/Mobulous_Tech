# Portfolio API

All portfolio routes require `Authorization: Bearer <access_token>`. The server derives the user from this token; it ignores `userId` sent by a client.

## Dashboard

`GET /api/portfolio/dashboard`

Returns every active asset category, including categories with no holdings.

```json
{
  "success": true,
  "data": {
    "portfolio": {
      "holdingCount": 3,
      "investedAmount": 325000,
      "currentValue": 437255,
      "netWorth": 437255,
      "totalGain": 112255,
      "todayChange": -171.78,
      "returnPercentage": 34.54
    },
    "assets": [
      {
        "assetId": "01",
        "categoryId": "...",
        "key": "stocks",
        "name": "Stocks",
        "holdingCount": 2,
        "currentValue": 254855
      }
    ]
  }
}
```

## Add a holding

`POST /api/portfolio/holdings`

```json
{
  "categoryKey": "stocks",
  "instrumentId": "mongodb-instrument-id",
  "accountId": "mongodb-account-id",
  "quantity": 10,
  "averagePurchasePrice": 2450,
  "source": "manual"
}
```

`accountId` is optional. `userId`, `categoryId`, `investedAmount`, current value, price, NAV, gain, and return fields are not accepted from the request. The server validates that the selected instrument belongs to `categoryKey` and calculates invested amount.

## Holding and history routes

```http
GET    /api/portfolio/categories/stocks
PATCH  /api/portfolio/holdings/:holdingId
DELETE /api/portfolio/holdings/:holdingId
GET    /api/portfolio/history?period=1M
```

Supported history periods are `1W`, `1M`, `6M`, `1Y`, `3Y`, `5Y`, and `YTD`. Snapshots are stored by the `createPortfolioSnapshot(userId)` service, intended for a scheduled daily job.

## Seed master categories

```bash
npm run seed:assets
```

The seed is idempotent and removes legacy `totalHoldingAmounts` and `sortOrder` fields from asset-category documents.
