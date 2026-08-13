const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const nodeEnv = process.env.NODE_ENV || "development";
const port = parseNumber(process.env.PORT, 3000);

const configuredBaseUrl = process.env.APP_BASE_URL?.trim();
const vercelBaseUrl = process.env.VERCEL_URL?.trim();
const hostingerBaseUrl = process.env.HOSTINGER_URL?.trim();

export const env = {
  appName: process.env.APP_NAME?.trim() || "Mobulous Tech API",
  nodeEnv,
  isProduction: nodeEnv === "production",
  port,
  appBaseUrl:
    configuredBaseUrl ||
    (hostingerBaseUrl ? `https://${hostingerBaseUrl}` : null) ||
    (vercelBaseUrl ? `https://${vercelBaseUrl}` : `http://localhost:${port}`),
  mongoUri: process.env.MONGO_URI?.trim() || "",
  mongoDbName: process.env.MONGO_DB_NAME?.trim() || "",
  corsOrigins: parseList(process.env.CORS_ORIGINS),
  enableSwagger: parseBoolean(process.env.ENABLE_SWAGGER, true),
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT?.trim() || "1mb",
  loginRedirectUrl: process.env.LOGIN_REDIRECT_URL || "/login",
  otpExpiryMinutes: parseNumber(process.env.OTP_EXPIRY_MINUTES, 5),
  marketCacheDurationMinutes: parseNumber(
    process.env.MARKET_CACHE_DURATION_MINUTES,
    2,
  ),
  jwtSecret: process.env.JWT_SECRET?.trim() || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || "15m",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET?.trim() || "",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN?.trim() || "7d",
  emailUser: process.env.EMAIL_USER?.trim() || "",
  emailPass: process.env.EMAIL_PASS?.trim() || "",
  mutualFundApiBaseUrl:
    process.env.MUTUAL_FUND_API_BASE_URL?.trim() || "https://api.mfapi.in",
  mutualFundSchemeListCacheDurationMinutes: parseNumber(
    process.env.MUTUAL_FUND_SCHEME_LIST_CACHE_DURATION_MINUTES,
    720,
  ),
  mutualFundLatestCacheDurationMinutes: parseNumber(
    process.env.MUTUAL_FUND_LATEST_CACHE_DURATION_MINUTES,
    720,
  ),
  mutualFundHistoryCacheDurationMinutes: parseNumber(
    process.env.MUTUAL_FUND_HISTORY_CACHE_DURATION_MINUTES,
    1440,
  ),
  mutualFundHistoryDefaultLimit: parseNumber(
    process.env.MUTUAL_FUND_HISTORY_DEFAULT_LIMIT,
    30,
  ),
  mutualFundHistoryMaxLimit: parseNumber(
    process.env.MUTUAL_FUND_HISTORY_MAX_LIMIT,
    5000,
  ),
  mutualFundProviderTimeoutMs: parseNumber(
    process.env.MUTUAL_FUND_PROVIDER_TIMEOUT_MS,
    15000,
  ),
  googleClientIds: parseList(
    process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID,
  ),
};

export const getCorsOptions = () => {
  const hasExplicitOrigins =
    env.corsOrigins.length > 0 && !env.corsOrigins.includes("*");

  return {
    origin(origin, callback) {
      if (!hasExplicitOrigins || !origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  };
};
