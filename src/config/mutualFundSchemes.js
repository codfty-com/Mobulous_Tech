import { env } from "./env.js";

export const MUTUAL_FUND_PROVIDER = {
  baseUrl: env.mutualFundApiBaseUrl,
  name: "mfapi.in",
};

export const DEFAULT_MUTUAL_FUND_SCHEME_CODES = [
  122639, // Parag Parikh Flexi Cap Fund - Direct Plan - Growth
  120465, // Axis Large Cap Fund - Direct Plan - Growth
  100119, // HDFC Balanced Advantage Fund - Growth Plan
];

export const MUTUAL_FUND_SEARCH_DEFAULT_LIMIT = 50;
export const MUTUAL_FUND_SEARCH_MAX_LIMIT = 100;
