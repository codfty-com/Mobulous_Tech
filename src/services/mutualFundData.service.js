import axios from "axios";
import {
  DEFAULT_MUTUAL_FUND_SCHEME_CODES,
  MUTUAL_FUND_PROVIDER,
  MUTUAL_FUND_SEARCH_DEFAULT_LIMIT,
  MUTUAL_FUND_SEARCH_MAX_LIMIT,
} from "../config/mutualFundSchemes.js";
import MutualFundScheme from "../models/mutualFundScheme.js";
import MutualFundSnapshot from "../models/mutualFundSnapshot.js";

const SCHEME_LIST_CACHE_MINUTES = Number(
  process.env.MUTUAL_FUND_SCHEME_LIST_CACHE_DURATION_MINUTES || 720,
);
const LATEST_NAV_CACHE_MINUTES = Number(
  process.env.MUTUAL_FUND_LATEST_CACHE_DURATION_MINUTES || 720,
);
const HISTORY_NAV_CACHE_MINUTES = Number(
  process.env.MUTUAL_FUND_HISTORY_CACHE_DURATION_MINUTES || 1440,
);
const HISTORY_DEFAULT_LIMIT = Number(
  process.env.MUTUAL_FUND_HISTORY_DEFAULT_LIMIT || 30,
);
const HISTORY_MAX_LIMIT = Number(process.env.MUTUAL_FUND_HISTORY_MAX_LIMIT || 5000);
const PROVIDER_TIMEOUT_MS = Number(
  process.env.MUTUAL_FUND_PROVIDER_TIMEOUT_MS || 15000,
);

const providerClient = axios.create({
  baseURL: MUTUAL_FUND_PROVIDER.baseUrl,
  timeout: PROVIDER_TIMEOUT_MS,
});

const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60 * 1000);

const toNumberOrNull = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const parseNavDate = (value) => {
  if (!value) return null;

  const [day, month, year] = String(value).split("-").map(Number);

  if (!day || !month || !year) return null;

  return new Date(Date.UTC(year, month - 1, day));
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeSchemeCode = (value) => {
  const schemeCode = Number(value);
  return Number.isInteger(schemeCode) && schemeCode > 0 ? schemeCode : null;
};

const normalizeLimit = (value) => {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    return MUTUAL_FUND_SEARCH_DEFAULT_LIMIT;
  }

  return Math.min(limit, MUTUAL_FUND_SEARCH_MAX_LIMIT);
};

const normalizeHistoryLimit = (value) => {
  if (String(value || "").toLowerCase() === "all") return null;

  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    return HISTORY_DEFAULT_LIMIT;
  }

  return Math.min(limit, HISTORY_MAX_LIMIT);
};

const normalizeScheme = (scheme, fetchedAt, cachedUntil) => {
  const schemeCode = normalizeSchemeCode(scheme.schemeCode);
  const schemeName = String(scheme.schemeName || "").trim();

  if (!schemeCode || !schemeName) return null;

  return {
    schemeCode,
    schemeName,
    isinGrowth: scheme.isinGrowth || null,
    isinDivReinvestment: scheme.isinDivReinvestment || null,
    source: MUTUAL_FUND_PROVIDER.name,
    cachedUntil,
    lastFetchedAt: fetchedAt,
  };
};

const normalizeNavEntry = (entry) => {
  const nav = toNumberOrNull(entry.nav);

  if (nav === null || !entry.date) return null;

  return {
    date: entry.date,
    navDate: parseNavDate(entry.date),
    nav,
  };
};

const normalizeSnapshot = (payload, fetchedAt, includeHistory = false) => {
  const meta = payload?.meta || {};
  const schemeCode = normalizeSchemeCode(meta.scheme_code);
  const schemeName = String(meta.scheme_name || "").trim();
  const navHistory = (payload?.data || []).map(normalizeNavEntry).filter(Boolean);
  const latest = navHistory[0];

  if (!schemeCode || !schemeName || !latest) return null;

  const normalized = {
    schemeCode,
    schemeName,
    fundHouse: meta.fund_house || "",
    schemeType: meta.scheme_type || "",
    schemeCategory: meta.scheme_category || "",
    isinGrowth: meta.isin_growth || null,
    isinDivReinvestment: meta.isin_div_reinvestment || null,
    latestNav: latest.nav,
    latestNavDate: latest.navDate,
    latestNavDateText: latest.date,
    source: MUTUAL_FUND_PROVIDER.name,
    lastFetchedAt: fetchedAt,
    latestCachedUntil: addMinutes(fetchedAt, LATEST_NAV_CACHE_MINUTES),
    ...(includeHistory
      ? {
          navHistory,
          historyCachedUntil: addMinutes(fetchedAt, HISTORY_NAV_CACHE_MINUTES),
        }
      : {}),
  };

  return normalized;
};

const formatScheme = (scheme) => ({
  schemeCode: scheme.schemeCode,
  schemeName: scheme.schemeName,
  isinGrowth: scheme.isinGrowth || null,
  isinDivReinvestment: scheme.isinDivReinvestment || null,
  source: scheme.source,
  cachedUntil: scheme.cachedUntil,
  lastFetchedAt: scheme.lastFetchedAt,
});

const formatSnapshot = (
  snapshot,
  { includeHistory = false, historyLimit } = {},
) => {
  const navHistory = snapshot.navHistory || [];
  const previous = navHistory[1] || null;
  const change =
    previous && typeof snapshot.latestNav === "number"
      ? snapshot.latestNav - previous.nav
      : null;
  const changePercent =
    previous && previous.nav
      ? ((snapshot.latestNav - previous.nav) / previous.nav) * 100
      : null;

  return {
    schemeCode: snapshot.schemeCode,
    schemeName: snapshot.schemeName,
    fundHouse: snapshot.fundHouse,
    schemeType: snapshot.schemeType,
    schemeCategory: snapshot.schemeCategory,
    isinGrowth: snapshot.isinGrowth || null,
    isinDivReinvestment: snapshot.isinDivReinvestment || null,
    latestNav: snapshot.latestNav,
    latestNavDate: snapshot.latestNavDate,
    latestNavDateText: snapshot.latestNavDateText,
    change,
    changePercent,
    source: snapshot.source,
    cachedUntil: includeHistory
      ? snapshot.historyCachedUntil
      : snapshot.latestCachedUntil,
    lastFetchedAt: snapshot.lastFetchedAt,
    ...(includeHistory
      ? {
          count: historyLimit
            ? navHistory.slice(0, historyLimit).length
            : navHistory.length,
          navHistory: historyLimit
            ? navHistory.slice(0, historyLimit)
            : navHistory,
        }
      : {}),
  };
};

const fetchSchemesFromProvider = async () => {
  const response = await providerClient.get("/mf");
  return Array.isArray(response.data) ? response.data : [];
};

const fetchSnapshotFromProvider = async (schemeCode, includeHistory = false) => {
  const path = includeHistory ? `/mf/${schemeCode}` : `/mf/${schemeCode}/latest`;
  const response = await providerClient.get(path);
  return response.data;
};

const saveSchemes = async (schemes) => {
  if (!schemes.length) return;

  await MutualFundScheme.bulkWrite(
    schemes.map((scheme) => ({
      updateOne: {
        filter: { schemeCode: scheme.schemeCode },
        update: { $set: scheme },
        upsert: true,
      },
    })),
    { ordered: false },
  );
};

const saveSnapshot = async (snapshot, includeHistory = false) => {
  const update = {
    schemeCode: snapshot.schemeCode,
    schemeName: snapshot.schemeName,
    fundHouse: snapshot.fundHouse,
    schemeType: snapshot.schemeType,
    schemeCategory: snapshot.schemeCategory,
    isinGrowth: snapshot.isinGrowth,
    isinDivReinvestment: snapshot.isinDivReinvestment,
    latestNav: snapshot.latestNav,
    latestNavDate: snapshot.latestNavDate,
    latestNavDateText: snapshot.latestNavDateText,
    source: snapshot.source,
    lastFetchedAt: snapshot.lastFetchedAt,
    latestCachedUntil: snapshot.latestCachedUntil,
    ...(includeHistory
      ? {
          navHistory: snapshot.navHistory,
          historyCachedUntil: snapshot.historyCachedUntil,
        }
      : {}),
  };

  return MutualFundSnapshot.findOneAndUpdate(
    { schemeCode: snapshot.schemeCode },
    { $set: update },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    },
  ).lean();
};

const ensureSchemeListCache = async (forceRefresh = false) => {
  const now = new Date();

  if (!forceRefresh) {
    const freshScheme = await MutualFundScheme.exists({
      cachedUntil: { $gt: now },
    });

    if (freshScheme) {
      return { source: "cache" };
    }
  }

  try {
    const fetchedAt = new Date();
    const cachedUntil = addMinutes(fetchedAt, SCHEME_LIST_CACHE_MINUTES);
    const schemes = (await fetchSchemesFromProvider())
      .map((scheme) => normalizeScheme(scheme, fetchedAt, cachedUntil))
      .filter(Boolean);

    if (!schemes.length) {
      throw new Error("No mutual fund schemes returned from provider");
    }

    await saveSchemes(schemes);

    return { source: "provider" };
  } catch (error) {
    const hasStaleSchemes = await MutualFundScheme.exists({});

    if (hasStaleSchemes) {
      return {
        source: "stale-cache",
        warning:
          "Live provider request failed, returning last cached mutual fund schemes instead",
      };
    }

    error.statusCode = 502;
    throw error;
  }
};

export const searchMutualFundSchemes = async ({
  query,
  limit,
  forceRefresh = false,
} = {}) => {
  const cacheResult = await ensureSchemeListCache(forceRefresh);
  const cleanQuery = String(query || "").trim();
  const safeLimit = normalizeLimit(limit);
  const filter = cleanQuery
    ? { schemeName: { $regex: escapeRegex(cleanQuery), $options: "i" } }
    : {};

  const [total, schemes] = await Promise.all([
    MutualFundScheme.countDocuments(filter),
    MutualFundScheme.find(filter).sort({ schemeName: 1 }).limit(safeLimit).lean(),
  ]);

  return {
    source: cacheResult.source,
    warning: cacheResult.warning,
    query: cleanQuery || null,
    total,
    count: schemes.length,
    limit: safeLimit,
    data: schemes.map(formatScheme),
  };
};

export const getMutualFundSnapshot = async ({
  schemeCode,
  forceRefresh = false,
} = {}) => {
  const normalizedSchemeCode = normalizeSchemeCode(schemeCode);

  if (!normalizedSchemeCode) {
    const error = new Error("A valid schemeCode is required");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();

  if (!forceRefresh) {
    const cachedSnapshot = await MutualFundSnapshot.findOne({
      schemeCode: normalizedSchemeCode,
      latestCachedUntil: { $gt: now },
    }).lean();

    if (cachedSnapshot) {
      return {
        source: "cache",
        data: formatSnapshot(cachedSnapshot),
      };
    }
  }

  try {
    const fetchedAt = new Date();
    const payload = await fetchSnapshotFromProvider(normalizedSchemeCode);
    const snapshot = normalizeSnapshot(payload, fetchedAt);

    if (!snapshot) {
      return {
        source: "provider",
        data: null,
      };
    }

    const savedSnapshot = await saveSnapshot(snapshot);

    return {
      source: "provider",
      data: formatSnapshot(savedSnapshot),
    };
  } catch (error) {
    const fallbackCache = await MutualFundSnapshot.findOne({
      schemeCode: normalizedSchemeCode,
    }).lean();

    if (fallbackCache) {
      return {
        source: "stale-cache",
        warning:
          "Live provider request failed, returning last cached mutual fund data instead",
        data: formatSnapshot(fallbackCache),
      };
    }

    error.statusCode = 502;
    throw error;
  }
};

export const getMutualFundHistory = async ({
  schemeCode,
  limit,
  forceRefresh = false,
} = {}) => {
  const normalizedSchemeCode = normalizeSchemeCode(schemeCode);
  const historyLimit = normalizeHistoryLimit(limit);

  if (!normalizedSchemeCode) {
    const error = new Error("A valid schemeCode is required");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();

  if (!forceRefresh) {
    const cachedSnapshot = await MutualFundSnapshot.findOne({
      schemeCode: normalizedSchemeCode,
      historyCachedUntil: { $gt: now },
    }).lean();

    if (cachedSnapshot) {
      return {
        source: "cache",
        data: formatSnapshot(cachedSnapshot, {
          includeHistory: true,
          historyLimit,
        }),
      };
    }
  }

  try {
    const fetchedAt = new Date();
    const payload = await fetchSnapshotFromProvider(normalizedSchemeCode, true);
    const snapshot = normalizeSnapshot(payload, fetchedAt, true);

    if (!snapshot) {
      return {
        source: "provider",
        data: null,
      };
    }

    const savedSnapshot = await saveSnapshot(snapshot, true);

    return {
      source: "provider",
      data: formatSnapshot(savedSnapshot, {
        includeHistory: true,
        historyLimit,
      }),
    };
  } catch (error) {
    const fallbackCache = await MutualFundSnapshot.findOne({
      schemeCode: normalizedSchemeCode,
    }).lean();

    if (fallbackCache?.navHistory?.length) {
      return {
        source: "stale-cache",
        warning:
          "Live provider request failed, returning last cached mutual fund history instead",
        data: formatSnapshot(fallbackCache, {
          includeHistory: true,
          historyLimit,
        }),
      };
    }

    error.statusCode = 502;
    throw error;
  }
};

export const getMutualFundSnapshots = async ({
  schemeCodes = DEFAULT_MUTUAL_FUND_SCHEME_CODES,
  forceRefresh = false,
} = {}) => {
  const invalidSchemeCodes = [];
  const validSchemeCodes = [];

  for (const rawSchemeCode of schemeCodes) {
    const schemeCode = normalizeSchemeCode(rawSchemeCode);

    if (!schemeCode) {
      invalidSchemeCodes.push(rawSchemeCode);
      continue;
    }

    validSchemeCodes.push(schemeCode);
  }

  if (!validSchemeCodes.length) {
    const error = new Error("No valid scheme codes were provided");
    error.statusCode = 400;
    error.details = {
      defaultSchemeCodes: DEFAULT_MUTUAL_FUND_SCHEME_CODES,
      invalidSchemeCodes,
    };
    throw error;
  }

  const results = await Promise.all(
    validSchemeCodes.map((schemeCode) =>
      getMutualFundSnapshot({ schemeCode, forceRefresh }),
    ),
  );
  const notFoundSchemeCodes = [];
  const data = [];
  const warnings = [];
  const sources = new Set();

  results.forEach((result, index) => {
    sources.add(result.source);

    if (result.warning) {
      warnings.push(result.warning);
    }

    if (!result.data) {
      notFoundSchemeCodes.push(validSchemeCodes[index]);
      return;
    }

    data.push(result.data);
  });

  return {
    source: sources.size === 1 ? [...sources][0] : "mixed",
    invalidSchemeCodes,
    notFoundSchemeCodes,
    warning: warnings[0],
    data,
  };
};
