import { INDEX_MARKET_KEYS } from "../config/marketSymbols.js";
import { getMarketSnapshots } from "./marketData.service.js";

/**
 * Fetches only configured market indices. Equities, including bank stocks,
 * are deliberately excluded by INDEX_MARKET_KEYS.
 */
export const getIndices = async ({ forceRefresh = false } = {}) => {
  const result = await getMarketSnapshots({
    keys: INDEX_MARKET_KEYS,
    forceRefresh,
  });

  return {
    ...result,
    data: result.data.filter((item) => item.type === "INDEX"),
  };
};
