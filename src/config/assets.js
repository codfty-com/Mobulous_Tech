export const ASSET_CATEGORIES = [
  {
    assetId: "01",
    key: "stocks",
    name: "Stocks",
    icon: "https://api.iconify.design/lucide:chart-candlestick.svg?color=%23156ff7",
    description: "Indian NSE and BSE company shares.",
    status: "available",
    dataRoute: "/api/stocks",
    searchParam: "query",
    displayOrder: 0,
    examples: ["TCS", "Reliance", "HDFC Bank", "Infosys"]
  },
  {
    assetId: "02",
    key: "mutual_funds",
    name: "Mutual Funds",
    icon: "https://api.iconify.design/lucide:chart-pie.svg?color=%2317a673",
    description: "Mutual fund schemes with NAV data.",
    status: "available",
    dataRoute: "/api/mutual-funds",
    searchParam: "query",
    displayOrder: 1,
    examples: ["Parag Parikh", "HDFC", "Axis"]
  },
  {
    assetId: "03",
    key: "etf",
    name: "ETF",
    icon: "https://api.iconify.design/lucide:layers-3.svg?color=%237c3aed",
    description: "Exchange-traded funds.",
    status: "disabled",
    dataRoute: "/api/etfs",
    searchParam: "query",
    displayOrder: 2,
    examples: ["NIFTYBEES", "BANKBEES", "SPY"]
  },
  {
    assetId: "04",
    key: "fixed_deposit",
    name: "Fixed Deposit",
    icon: "https://api.iconify.design/lucide:landmark.svg?color=%23b7791f",
    description: "Bank and NBFC fixed deposit products.",
    status: "coming_soon",
    dataRoute: null,
    searchParam: null,
    displayOrder: 3,
    examples: ["HDFC Fixed Deposit", "SBI FD", "Bajaj Finance FD"]
  },
  {
    assetId: "05",
    key: "metals",
    name: "Metals",
    icon: "https://api.iconify.design/lucide:gem.svg?color=%239ca3af",
    description: "Precious metals like gold and silver.",
    status: "coming_soon",
    dataRoute: null,
    searchParam: null,
    displayOrder: 4,
    examples: ["Gold", "Silver", "Platinum"]
  },
  {
    assetId: "06",
    key: "ulip",
    name: "ULIP",
    icon: "https://api.iconify.design/lucide:shield-check.svg?color=%23059669",
    description: "Unit linked insurance plans.",
    status: "coming_soon",
    dataRoute: null,
    searchParam: null,
    displayOrder: 5,
    examples: ["ULIP growth plan", "ULIP balanced plan"]
  },
  {
    assetId: "07",
    key: "cash",
    name: "Cash",
    icon: "https://api.iconify.design/lucide:wallet.svg?color=%232f855a",
    description: "Cash balance or liquid holdings.",
    status: "coming_soon",
    dataRoute: null,
    searchParam: null,
    displayOrder: 6,
    examples: ["Wallet cash", "Bank balance"]
  },
  {
    assetId: "08",
    key: "others",
    name: "Others",
    icon: "https://api.iconify.design/lucide:package.svg?color=%234b5563",
    description: "Other assets not covered by the listed categories.",
    status: "coming_soon",
    dataRoute: null,
    searchParam: null,
    displayOrder: 7,
    examples: ["Real estate", "Crypto", "Bonds"]
  }
];
