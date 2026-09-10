import axios from "axios";

const PERIODS = {
  weekly: { label: "Weekly", range: "7d", interval: "1d" },
  "3months": { label: "3 months", range: "3mo", interval: "1d" },
  "6months": { label: "6 months", range: "6mo", interval: "1d" },
  "1year": { label: "1 year", range: "1y", interval: "1d" },
  "3years": { label: "3 years", range: "3y", interval: "1wk" },
};

const signedQuantity = (transaction) =>
  transaction.transactionType === "sell"
    ? -Number(transaction.quantity || 0)
    : Number(transaction.quantity || 0);

const fetchHistory = async (symbol, config) => {
  const response = await axios.get(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
    {
      params: { range: config.range, interval: config.interval, includePrePost: false },
      timeout: 12000,
    },
  );
  const chart = response.data?.chart;
  if (chart?.error) throw new Error(chart.error.description || "Yahoo Finance chart error");

  const result = chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const points = (result?.timestamp || [])
    .map((timestamp, index) => ({ timestamp: timestamp * 1000, close: Number(closes[index]) }))
    .filter((point) => Number.isFinite(point.close));

  if (!points.length) throw new Error("No historical closing prices were returned");
  return points;
};

/**
 * Builds an authenticated user's portfolio value at each market close. Holdings
 * are replayed from that user's buy and sell transaction ledger, so no other
 * user's transactions can affect this result.
 */
export const getStockNetWorthHistory = async ({ transactions, period }) => {
  const config = PERIODS[period];
  if (!config) throw new Error(`Unsupported net-worth period: ${period}`);

  const transactionsBySymbol = new Map();
  for (const transaction of transactions) {
    const symbol = transaction.symbol;
    const timestamp = new Date(transaction.transactionDate).getTime();
    if (!symbol || !Number.isFinite(timestamp)) continue;
    const rows = transactionsBySymbol.get(symbol) || [];
    const quantity = signedQuantity(transaction);
    rows.push({
      timestamp,
      quantity,
      cashFlow: quantity * Number(transaction.purchasePrice || 0),
    });
    transactionsBySymbol.set(symbol, rows);
  }

  for (const rows of transactionsBySymbol.values()) {
    rows.sort((left, right) => left.timestamp - right.timestamp);
  }

  const symbols = [...transactionsBySymbol.keys()];
  const settled = await Promise.allSettled(
    symbols.map(async (symbol) => ({ symbol, points: await fetchHistory(symbol, config) })),
  );
  const histories = new Map();
  const unavailableSymbols = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") histories.set(result.value.symbol, result.value.points);
    else unavailableSymbols.push(symbols[index]);
  });

  const timestamps = [
    ...new Set([...histories.values()].flatMap((points) => points.map((point) => point.timestamp))),
  ].sort((left, right) => left - right);

  const quantityIndexes = new Map();
  const priceIndexes = new Map();
  const quantities = new Map();
  for (const symbol of histories.keys()) {
    quantityIndexes.set(symbol, 0);
    priceIndexes.set(symbol, 0);
    quantities.set(symbol, 0);
  }

  const points = timestamps.map((timestamp) => {
    let totalNetWorth = 0;
    for (const [symbol, prices] of histories) {
      const userTransactions = transactionsBySymbol.get(symbol) || [];
      let quantityIndex = quantityIndexes.get(symbol);
      let quantity = quantities.get(symbol);
      while (quantityIndex < userTransactions.length && userTransactions[quantityIndex].timestamp <= timestamp) {
        quantity += userTransactions[quantityIndex].quantity;
        quantityIndex += 1;
      }
      quantityIndexes.set(symbol, quantityIndex);
      quantities.set(symbol, quantity);

      let priceIndex = priceIndexes.get(symbol);
      while (priceIndex + 1 < prices.length && prices[priceIndex + 1].timestamp <= timestamp) {
        priceIndex += 1;
      }
      priceIndexes.set(symbol, priceIndex);
      if (quantity > 0 && prices[priceIndex].timestamp <= timestamp) {
        totalNetWorth += quantity * prices[priceIndex].close;
      }
    }
    return { date: new Date(timestamp), totalNetWorth };
  });

  const first = points[0];
  const last = points.at(-1);
  const netContributions = first && last
    ? [...transactionsBySymbol.values()]
        .flat()
        .filter((transaction) => transaction.timestamp > first.date.getTime() && transaction.timestamp <= last.date.getTime())
        .reduce((total, transaction) => total + transaction.cashFlow, 0)
    : 0;
  const profitLoss = last
    ? last.totalNetWorth - (first?.totalNetWorth || 0) - netContributions
    : 0;
  const performanceBase = (first?.totalNetWorth || 0) + netContributions;

  return {
    points,
    unavailableSymbols,
    performance: {
      available: Boolean(last),
      period,
      label: config.label,
      startDate: first?.date || null,
      endDate: last?.date || null,
      startNetWorth: first?.totalNetWorth ?? 0,
      endNetWorth: last?.totalNetWorth ?? 0,
      netContributions,
      profitLoss,
      profitLossPercentage: performanceBase ? (profitLoss / performanceBase) * 100 : 0,
    },
  };
};
