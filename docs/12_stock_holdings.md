# Manual stock holdings

## Client API flow: search, select, buy or sell

1. Search: `GET /api/stocks?query=reliance` (public). Use the exact listing symbol returned by search, such as `RELIANCE.NS`; NSE and BSE listings are separate symbols.
2. On selection: `GET /api/stocks/lookup?symbol=RELIANCE.NS` with `Authorization: Bearer <token>`. This is an exact, case-insensitive lookup scoped to the logged-in user, not a substring search. It never creates a holding.
3. Submit a buy or sell: `POST /api/stocks` with the same token and the body below. Always use POST for an additional trade, including when lookup reports an existing stock.
4. Refresh: `GET /api/stocks` for the full list, or `GET /api/stocks/holdings` for open positions. Refetching also removes retired duplicate IDs from older client state.

Selection returns this `data` shape (inside the standard success response):

```json
{
  "symbol": "RELIANCE.NS",
  "exists": true,
  "stock": { "_id": "<holding-id>", "symbol": "RELIANCE.NS", "quantity": 10, "purchasePrice": 100, "totalInvestment": 1000 },
  "availableQuantity": 10,
  "canBuy": true,
  "canSell": true
}
```

`stock` contains the full holding; the example shows selected fields. When absent, `exists` is false, `stock` is null, `availableQuantity` is 0 and `canSell` is false. A fully sold holding still exists but cannot be sold again until bought. Old duplicate records are combined for this preview without writing to the database. An invalid symbol returns 400; invalid legacy sell history returns 409. Selection is a preview: POST checks the latest balance again inside its transaction.

Buy request:

```json
{
  "symbol": "RELIANCE.NS",
  "name": "Reliance Industries",
  "quantity": 5,
  "price": 160,
  "currentPrice": 170,
  "transactionType": "buy"
}
```

Here `price` is the per-share execution price and `quantity` is the number of shares in this new trade, not the desired total. Starting with 10 shares at 100, this produces 15 shares, average cost 120, remaining investment 1800, current value 2550 and unrealized profit 750. Send `currentPrice` to value the holding at a separate market quote; otherwise the validator uses the trade price.

For a sell, use the same endpoint with `transactionType: "sell"`, the quantity being sold and its execution price. Selling 5 shares from the above position leaves 10 shares at average cost 120 and remaining investment 1200. Selling more than the available quantity returns 409 with no change.

POST returns 201 and `action: "created"` for the first buy; subsequent trades return 200 and `action: "updated"` with the same `data._id`. Replace the client item by this ID (or refetch); do not unconditionally append every successful response. Transaction history entries are individual trades, not separate stock list items. `PUT/PATCH /api/stocks/:id` corrects existing data and is not the API for an additional buy/sell.

`POST /api/stocks` uses the verified JWT user and the trimmed, uppercase symbol as its identity. New symbols return HTTP 201 (`action: "created"`). Existing symbols return HTTP 200 (`action: "updated"`) with the same stock `_id` and an increased quantity for a buy or reduced quantity for a sell.

Example request, with `Authorization: Bearer <token>`:

```json
{
  "symbol": "RELIANCE.NS",
  "name": "Reliance Industries",
  "quantity": 5,
  "price": 160,
  "transactionType": "buy"
}
```

If the user already owns 10 shares at 100, the response contains quantity 15 and average purchase price 120. `data.transactions` preserves the original and added trades. No frontend lookup is necessary; replace the local item matching the returned `_id`, or refetch `GET /api/stocks`.

POST serializes writes for the authenticated user and normalized symbol using a database transaction and a `StockWriteLock` document with a unique `_id`. This also prevents simultaneous first purchases from creating multiple rows when the legacy stock index is still non-unique. If old duplicate rows exist, POST consolidates all matching rows into the oldest stock ID and archives the original rows in `userstocks_before_consolidation`, within the same transaction. Matching handles legacy casing and surrounding whitespace. Supplied metadata updates that holding. A fully sold position stays at quantity zero and reuses its ID on the next buy. Trade replay also prevents backdated or simultaneous sells from making the holding negative.

MongoDB must support transactions (a replica set or sharded cluster, including MongoDB Atlas). An unrelated symbol with invalid legacy history does not block adding a valid symbol. If the requested symbol itself has invalid sell history, POST returns a conflict rather than inserting another stock. The model also defines a unique `{ userId: 1, symbol: 1 }` index, which the optional migration below installs on legacy databases.

`GET /api/stocks` returns holdings, with their transaction histories. `/holdings` returns open positions. Portfolio summaries and holdings now use the remaining average purchase cost. Sale proceeds no longer reduce the remaining cost basis; profit/loss on these endpoints is unrealized profit/loss on open holdings. This changes the previous net-cash-invested convention. Historical net worth uses the individual dated trades.

For trade corrections with `PATCH` or `PUT /api/stocks/:id`, pass `transactionId` together with the corrected fields when the stock has more than one trade. IDs come from `data.transactions`. Metadata edits need no transaction ID. Deleting a stock deletes its history too.

## Existing database migration

The updated POST handles the requested symbol without requiring a global migration. To clean up all existing duplicate symbols proactively and install the unique stock index, pause stock writes while migrating and deploying; the previous application writes separate transaction rows and is incompatible with that index. Configure `MONGO_URI` and optional `MONGO_DB_NAME` for the intended database.

1. Preview: `npm run migrate:stock-indexes` (read-only).
2. Apply: `npm run migrate:stock-indexes -- --apply`.
3. Deploy the updated application, then resume stock writes.

The migration validates all merged holdings first, normalizes symbols, keeps the oldest stock ID, preserves every trade, combines tags and watchlist membership, and uses the latest row for other metadata. Before modifying a group it copies the original rows to `userstocks_before_consolidation` within the same database transaction. Original row IDs are retained as embedded transaction IDs; clients should refetch their stock list because duplicate top-level IDs are retired. The migration then replaces the old non-unique index with a unique index. It is safe to rerun after completion or a partial interruption while writes remain paused. If legacy trades have negative historical balances or invalid data, the migration fails before applying any merges so that those records can be corrected.

This command now consolidates holdings; it no longer removes uniqueness to allow duplicate stock rows.

## Verification

`npm run test:stocks` runs unit checks and real HTTP/database integration checks against an isolated local MongoDB replica set. Coverage includes concurrent initial purchases and additions with a non-unique legacy stock index, per-symbol duplicate consolidation, metadata preservation, and unrelated invalid legacy trades. Tests never use the configured application database. The first run may download a MongoDB test binary.

## Holding value and daily performance

All amounts are INR; percentages are percentage points (5.26 means 5.26%).

| Field | Meaning |
| --- | --- |
| totalHoldingAmount | Current price multiplied by remaining quantity |
| todayPriceChange | Current price minus previous trading session close, per share |
| todayChange | todayPriceChange multiplied by remaining quantity |
| todayChangePercentage | todayChange divided by the previous-close value of those shares, times 100 |
| profitLoss | Current holding value minus remaining average purchase cost |
| profitLossPercentage | profitLoss divided by remaining purchase cost, times 100 |
| holdingPercentage | Holding current value divided by all holdings' current value, times 100 |
| profitLossStatus | profit, loss, or neutral for total holding profit/loss |
| todayChangeStatus | profit, loss, neutral, or unavailable for daily movement |

Use profit for green, loss for red, and neutral/unavailable for a neutral color. Total and daily statuses are independent: a holding can be profitable overall while falling today. Daily movement values describe the latest supplied market session on the currently held quantity; they are not transaction-adjusted intraday trading P&L. Aggregate daily percentages use total previous-close value, never a sum or average of stock percentages. Percentages are null when their denominator is zero.

Prices are stored snapshots, not automatically fetched live. Supply currentPrice and previousClose from the same quote session through POST /api/stocks, PUT/PATCH /api/stocks/:id, or PATCH /api/stocks/prices:

```json
{
  "updates": [
    { "id": "<stock-id>", "currentPrice": 200, "previousClose": 190 }
  ]
}
```

Omitting previousClose preserves the existing baseline; refresh it when the market session changes. If no baseline exists, daily amount/percentage are null and todayChangeStatus is unavailable. If any open holding lacks daily data, the aggregate daily result is unavailable too. Where a current price is missing, consolidated valuations use average purchase cost and expose priceSource: average_cost. Otherwise priceSource is stored.

For 10 shares with average purchase cost 120, currentPrice 200 and previousClose 190:

```json
{
  "totalHoldingAmount": 2000,
  "todayPriceChange": 10,
  "todayChange": 100,
  "todayChangePercentage": 5.26,
  "todayChangeStatus": "profit",
  "profitLoss": 800,
  "profitLossPercentage": 66.67,
  "profitLossStatus": "profit",
  "holdingPercentage": 100
}
```

Updated read APIs:

- GET /api/stocks/holdings: metrics per open holding in data; combined totals in summary.
- GET /api/stocks/:id: daily metrics and totalHoldingAmount in data alongside existing profitLoss and profitLossPercentage.
- GET /api/stocks: metrics per data item and corrected aggregate summary (authenticated holdings request without a search query).
- GET /api/stocks/summary: corrected overall and bySector totals, daily changes and statuses.
- GET /api/stocks/net-worth: totalHoldingAmount, daily changes and statuses alongside totalProfitLoss and totalProfitLossPercentage. Historical period calculations remain transaction-based; top-level totals describe current open holdings.
- GET /api/portfolio/dashboard: metrics in data.portfolio and data.assets; includes manual stock daily movement.
- GET /api/portfolio/categories/stocks: metrics in data.category and data.holdings; includes manual stock holdings with source: manual_stock. Edit these holdings via /api/stocks/:id, not /api/portfolio/holdings/:id.
- GET /api/assets: inherits the dashboard metrics for active categories and portfolio totals. GET /api/assets/net-worth inherits the corrected stock cost basis in its existing totals.

holdingPercentage is returned by the consolidated holdings and category detail APIs; it is the weight within that response's full holdings set. The same daily/total metrics also appear for other portfolio categories, using their instrument prices. Existing aliases such as currentValue, totalCurrentValue, totalGain and returnPercentage are preserved; use profitLossPercentage for consistent null handling when the cost is zero.
