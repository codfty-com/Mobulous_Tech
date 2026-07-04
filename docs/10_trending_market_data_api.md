# Trending Market Data API

This project now exposes free Yahoo Finance powered endpoints for showing market data without any buy/sell flow.

## Provider

- Primary provider: `yahoo-finance2`
- Upstream source: Yahoo Finance public data
- Cost: free
- API key: not required

## Endpoints

### `GET /api/market-trend-lists`

Returns supported market-mover list types and cache defaults.

### `GET /api/market-data/trending`

Returns currently trending symbols for a region.

Query params:
- `region`: Yahoo region code like `US`, `IN`, `GB`
- `count`: number of rows, `1` to `25`, default `10`
- `lang`: optional locale like `en-US`, `en-IN`
- `forceRefresh`: `true` to skip cache

Example:
`GET /api/market-data/trending?region=US&count=10`

### `GET /api/market-data/movers`

Returns a daily popular list from Yahoo screeners.

Query params:
- `list`: one of `most_actives`, `day_gainers`, `day_losers`
- `region`: Yahoo region code like `US`, `IN`
- `count`: number of rows, `1` to `25`, default `10`
- `lang`: optional locale
- `forceRefresh`: `true` to skip cache

Example:
`GET /api/market-data/movers?list=most_actives&region=US&count=10`

### `GET /api/market-data/overview`

Returns a one-call payload for frontend dashboards with:
- trending symbols
- most active
- day gainers
- day losers

Query params:
- `region`
- `count`
- `lang`
- `forceRefresh`

Example:
`GET /api/market-data/overview?region=US&count=8`

## Response Notes

- `source` can be `cache`, `provider`, or `stale-cache`
- `stale-cache` means Yahoo failed and the last stored MongoDB copy was returned
- data is normalized for frontend display with fields like `symbol`, `displayName`, `price`, `change`, `changePercent`, `volume`, `marketTime`, and `rank`

## Suggested Frontend Flow

1. Call `/api/market-data/overview` for the home/dashboard screen.
2. Call `/api/market-data/movers?list=most_actives` for a dedicated “popular today” screen.
3. Call `/api/market-data/trending` when the user changes region tabs.
4. Use `forceRefresh=true` only for admin/debug or manual refresh actions.
