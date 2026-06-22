export const MUTUAL_FUND_PROVIDER = {
  baseUrl: process.env.MUTUAL_FUND_API_BASE_URL || "https://api.mfapi.in",
  name: "mfapi.in",
};

export const DEFAULT_MUTUAL_FUND_SCHEME_CODES = [
  122639, // Parag Parikh Flexi Cap Fund - Direct Plan - Growth
  120465, // Axis Large Cap Fund - Direct Plan - Growth
  100119, // HDFC Balanced Advantage Fund - Growth Plan
];

export const MUTUAL_FUND_SEARCH_DEFAULT_LIMIT = 50;
export const MUTUAL_FUND_SEARCH_MAX_LIMIT = 100;
