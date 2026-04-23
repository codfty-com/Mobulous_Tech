# 🗄️ Database Design

## Connection Strategy

**File:** `src/config/db.js`

The database uses a **cached singleton** pattern specifically designed for Vercel's serverless environment:

```
First request  → mongoose.connect() → cache on globalThis.__mongoose
Warm invocation → cached.conn exists → return immediately (no reconnect)
```

```js
let cached = globalThis.__mongoose || { conn: null, promise: null };
```

Storing on `globalThis` ensures the connection persists across multiple invocations of the same warm serverless container, avoiding the cold-start latency penalty of reconnecting on every request.

---

## DB Wait Middleware

In `src/app.js`, a middleware waits for the DB connection promise before any route handler runs:

```js
const dbPromise = connectDB(); // called once at module load

app.use(async (req, res, next) => {
  await dbPromise;   // resolves immediately if already connected
  next();
});
```

This guarantees routes never execute against an unconnected database.

---

## Models

### `User` — `src/models/user.js`

Stores registered users. Supports both email/password and Google OAuth.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `name` | `String` | optional, trimmed | Display name |
| `email` | `String` | **required**, unique, lowercase | Primary identifier |
| `password` | `String` | optional | bcrypt hash; absent for Google-only users |
| `phone` | `Number` | optional | Contact number |
| `googleId` | `String` | unique, sparse, indexed | Google OAuth sub claim |
| `profilePicture` | `String` | optional | URL from Google |
| `authMethods` | `[String]` | enum: `email_password` \| `google` | List of allowed login methods |
| `lastLoginMethod` | `String` | enum above | Last used method |
| `isEmailVerified` | `Boolean` | default `false` | Set to `true` after OTP verification |
| `otp` | `String` | temporary | 6-digit OTP (cleared after use) |
| `otpExpiry` | `Date` | temporary | OTP expiry timestamp |
| `createdAt` | `Date` | auto | Mongoose timestamp |
| `updatedAt` | `Date` | auto | Mongoose timestamp |

**Indexes:**
- `email` — unique index
- `googleId` — unique sparse index (allows multiple `null` values)

---

### `MarketSnapshot` — `src/models/marketSnapshot.js`

Acts as a **MongoDB-based cache** for Yahoo Finance market data.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `key` | `String` | required, unique | e.g. `nifty`, `sensex`, `nasdaq` |
| `symbol` | `String` | required, unique | Yahoo Finance ticker e.g. `^NSEI` |
| `displayName` | `String` | required | Human-readable name |
| `type` | `String` | required | `INDEX` or `EQUITY` |
| `exchange` | `String` | optional | e.g. `NSE`, `BSE` |
| `currency` | `String` | optional | e.g. `INR`, `USD` |
| `country` | `String` | optional | e.g. `India` |
| `marketState` | `String` | optional | `REGULAR`, `CLOSED`, `PRE`, `POST` |
| `price` | `Number` | optional | Current market price |
| `change` | `Number` | optional | Price change |
| `changePercent` | `Number` | optional | % change |
| `open` | `Number` | optional | Opening price |
| `dayHigh` | `Number` | optional | Intraday high |
| `dayLow` | `Number` | optional | Intraday low |
| `previousClose` | `Number` | optional | Previous session close |
| `volume` | `Number` | optional | Trading volume |
| `fiftyTwoWeekHigh` | `Number` | optional | 52-week high |
| `fiftyTwoWeekLow` | `Number` | optional | 52-week low |
| `marketTime` | `Date` | optional | Timestamp of the quote |
| `source` | `String` | default `yahoo-finance2` | Data provider |
| `cachedUntil` | `Date` | **required** | Cache expiry (used by cache validity check) |
| `lastFetchedAt` | `Date` | **required** | When data was last fetched |
| `createdAt` | `Date` | auto | Mongoose timestamp |
| `updatedAt` | `Date` | auto | Mongoose timestamp |

**Cache Logic:**
- On read: `cachedUntil > now` → serve from MongoDB (source: `"cache"`)
- On miss or `forceRefresh=true` → fetch from Yahoo Finance → upsert into MongoDB
- If Yahoo Finance fails → serve stale MongoDB data (source: `"stale-cache"`) with a warning

---

## MongoDB Connection Options

```js
mongoose.connect(env.mongoUri, {
  bufferCommands: false,   // fail fast instead of queuing commands if not connected
})
```

`bufferCommands: false` is critical for serverless — without it, Mongoose would silently queue commands and potentially time out on cold starts.
