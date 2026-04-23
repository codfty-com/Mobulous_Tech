# 📈 Market Data Flow

## How Market Data Works

The market data system uses a **cache-first strategy** with MongoDB as the cache store and Yahoo Finance (`yahoo-finance2`) as the live data provider.

---

## Supported Markets

Defined in `src/config/marketSymbols.js`:

| Key | Symbol | Display Name | Type | Exchange | Country |
|---|---|---|---|---|---|
| `nifty` | `^NSEI` | NIFTY 50 | INDEX | NSE | India |
| `sensex` | `^BSESN` | SENSEX | INDEX | BSE | India |
| `nasdaq` | `^IXIC` | NASDAQ Composite | INDEX | NASDAQ | United States |
| `hdfcbank` | `HDFCBANK.NS` | HDFC Bank | EQUITY | NSE | India |

To add new markets, simply add an entry to `MARKET_SYMBOLS` in `marketSymbols.js`.

---

## Cache Strategy

```
Request arrives with keys[]
        │
        ▼
forceRefresh == true?
        │
   YES  │  NO
        │   ▼
        │  getFreshCache(keys)
        │  [MongoDB: cachedUntil > now]
        │         │
        │    All keys cached?
        │         │
        │   YES   │  NO
        │    ▼    │
        │  Return │
        │  cache  │
        │         ▼
        └────► fetchQuotesFromYahoo(markets)
                    │
               Success?
                    │
             YES    │  NO
              ▼     │
        normalizeQuote()   │
        saveSnapshots()    ▼
        return "provider"  getAnyCache(keys)
                               │
                          Found stale?
                               │
                          YES  │  NO
                           ▼   │
                       Return  ▼
                       "stale-cache"  throw 502
                       + warning
```

---

## Cache Duration

Controlled by env var `MARKET_CACHE_DURATION_MINUTES` (default: `2` minutes).

```js
cachedUntil = lastFetchedAt + CACHE_MINUTES * 60 * 1000
```

After `cachedUntil` passes, the next request triggers a fresh Yahoo Finance fetch.

---

## Data Normalization

**File:** `src/services/marketData.service.js` → `normalizeQuote()`

Raw Yahoo Finance quote fields are mapped to the internal schema:

| Yahoo Field | Internal Field | Notes |
|---|---|---|
| `regularMarketPrice` | `price` | null if non-finite |
| `regularMarketChange` | `change` | null if non-finite |
| `regularMarketChangePercent` | `changePercent` | null if non-finite |
| `regularMarketOpen` | `open` | null if non-finite |
| `regularMarketDayHigh` | `dayHigh` | null if non-finite |
| `regularMarketDayLow` | `dayLow` | null if non-finite |
| `regularMarketPreviousClose` | `previousClose` | null if non-finite |
| `regularMarketVolume` | `volume` | null if non-finite |
| `regularMarketTime` | `marketTime` | converted to Date |
| `fiftyTwoWeekHigh` | `fiftyTwoWeekHigh` | null if non-finite |
| `fiftyTwoWeekLow` | `fiftyTwoWeekLow` | null if non-finite |
| `fullExchangeName` or `exchange` | `exchange` | provider name preferred |
| `longName` or `shortName` | `displayName` | falls back to config name |

All numeric values use `toNumberOrNull()` — returns `null` for `Infinity`, `NaN`, `undefined`.

---

## Response `source` Field

Every market data response includes a `source` field:

| Value | Meaning |
|---|---|
| `"cache"` | Served from MongoDB (within TTL) |
| `"provider"` | Freshly fetched from Yahoo Finance |
| `"stale-cache"` | Yahoo Finance failed; stale MongoDB data served with `warning` |

---

## `invalidKeys` Field

If the client sends an unknown market key (not in `MARKET_SYMBOLS`), it is listed in `invalidKeys` in the response. Valid keys are still processed normally.

Example:
```
GET /api/market-data?keys=nifty,unknown123
```
```json
{
  "invalidKeys": ["unknown123"],
  "count": 1,
  "data": [{ "key": "nifty", ... }]
}
```

---

## Upsert Strategy

When fresh data is fetched, it is saved using Mongoose `findOneAndUpdate` with `upsert: true`:

```js
MarketSnapshot.findOneAndUpdate(
  { key: snapshot.key },
  snapshot,
  { upsert: true, new: true, setDefaultsOnInsert: true }
)
```

This ensures at-most-one document per market key — no duplicates, safe for concurrent serverless invocations.

---

## Yahoo Finance Fields Requested

```js
const QUOTE_FIELDS = [
  "symbol", "shortName", "longName", "currency",
  "exchange", "fullExchangeName", "marketState",
  "regularMarketPrice", "regularMarketChange",
  "regularMarketChangePercent", "regularMarketOpen",
  "regularMarketDayHigh", "regularMarketDayLow",
  "regularMarketPreviousClose", "regularMarketVolume",
  "regularMarketTime", "fiftyTwoWeekHigh", "fiftyTwoWeekLow"
]
```

Limiting fields reduces response payload size from Yahoo's API.

---

## Adding a New Market

1. Add an entry to `src/config/marketSymbols.js`:
```js
export const MARKET_SYMBOLS = {
  // ... existing entries
  dowjones: {
    key: "dowjones",
    symbol: "^DJI",
    displayName: "Dow Jones Industrial Average",
    type: "INDEX",
    exchange: "NYSE",
    country: "United States",
  },
};
```

2. That's it — no other code changes needed. The service picks up all keys from `MARKET_SYMBOLS` automatically.
