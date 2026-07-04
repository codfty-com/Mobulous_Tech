# Google Sheet Review

Reviewed sheet: `AssetHeaven`

Direct edit status: I could read the public Google Sheet view, but the current toolset does not provide authenticated write access to the Google Sheet. I created an import-ready update file instead:

```text
googleSheetApiUpdate.tsv
```

## Main Issues Found

- `http://localhost:4500/api//forgot-password` has a double slash. Correct URL: `http://localhost:4500/api/forgot-password`.
- `https://mobulous-tech.vercel.app/api//forgot-password` has a double slash. Correct URL: `https://mobulous-tech.vercel.app/api/forgot-password`.
- `verify-signup-otp` is not a current route. Correct signup OTP route: `/api/verify-email-otp`.
- The row for "fetch all market data" used deployed URL `/api/markets`; correct deployed URL is `/api/market-data`.
- Some rows use placeholder path params like `:schemeCode` as the test URL. For testing, use a real scheme code such as `122639`.
- New market APIs were missing from the sheet:
  - `/api/market-trend-lists`
  - `/api/market-data/trending`
  - `/api/market-data/movers`
  - `/api/market-data/top-shares`
  - `/api/market-data/top-shares/:period`
  - `/api/market-data/overview`
  - `/api/market-data/home`
- BANK NIFTY is now supported through key `banknifty`.
- The configured top-share list has 99 unique supplied symbols, not 100.
- Vercel was misspelled as "Versal" in the project task row.
- Sensitive credentials such as Mongo URI and email app password should not be kept in a shared public sheet.

## Recommended Sheet Columns

Use these columns for cleaner tracking:

```text
Module
API / Project Item
Status
Local URL
Deployed URL
Method
Payload / Query
Notes
```

## Recommended Import Flow

1. Open the Google Sheet.
2. Add a new tab named `API Inventory`.
3. Import or paste `googleSheetApiUpdate.tsv`.
4. Keep the old tab as `Legacy API Tracker` until the team confirms all rows.

