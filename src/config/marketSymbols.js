export const MARKET_SYMBOLS = {
  nifty: {
    key: "nifty",
    symbol: "^NSEI",
    displayName: "NIFTY 50",
    type: "INDEX",
    exchange: "NSE",
    country: "India",
  },
  sensex: {
    key: "sensex",
    symbol: "^BSESN",
    displayName: "SENSEX",
    type: "INDEX",
    exchange: "BSE",
    country: "India",
  },
  nasdaq: {
    key: "nasdaq",
    symbol: "^IXIC",
    displayName: "NASDAQ Composite",
    type: "INDEX",
    exchange: "NASDAQ",
    country: "United States",
  },
  hdfcbank: {
    key: "hdfcbank",
    symbol: "HDFCBANK.NS",
    displayName: "HDFC Bank",
    type: "EQUITY",
    exchange: "NSE",
    country: "India",
  },
};

export const DEFAULT_MARKET_KEYS = Object.keys(MARKET_SYMBOLS);
