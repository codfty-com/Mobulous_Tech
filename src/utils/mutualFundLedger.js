import { AppError } from "./http.js";

// Older records stored one buy/sell per document. New records keep one
// position per scheme and retain every trade in this ledger.
export const mutualFundTransactions = (fund) => fund.transactions?.length
  ? fund.transactions.map((entry) => entry.toObject ? entry.toObject() : entry)
  : [{
      _id: fund._id,
      units: fund.units,
      purchaseNav: fund.purchaseNav ?? (fund.units ? fund.investedAmount / fund.units : 0),
      transactionType: fund.transactionType || "buy",
      transactionDate: fund.transactionDate || fund.purchaseDate || fund.createdAt,
    }];

export const calculateMutualFundHolding = (transactions) => {
  const ordered = [...transactions].sort(
    (left, right) => new Date(left.transactionDate) - new Date(right.transactionDate),
  );
  let units = 0;
  let cost = 0;

  for (const trade of ordered) {
    if (trade.transactionType === "sell") {
      const tolerance = Number.EPSILON * Math.max(units, trade.units) * 8;
      if (trade.units - units > tolerance) {
        throw new AppError(`Cannot sell ${trade.units} units. Available units on the transaction date are ${Math.max(units, 0)}.`, 409);
      }
      cost -= (units ? cost / units : 0) * trade.units;
      units -= trade.units;
      if (Math.abs(units) <= tolerance) { units = 0; cost = 0; }
    } else {
      units += trade.units;
      cost += trade.units * trade.purchaseNav;
    }
  }

  if (!Number.isFinite(units) || !Number.isFinite(cost)) {
    throw new AppError("Mutual fund units or investment exceeds the supported range", 400);
  }
  return {
    units,
    investedAmount: cost,
    purchaseNav: units ? cost / units : 0,
    purchaseDate: ordered[0]?.transactionDate,
    transactionDate: ordered.at(-1)?.transactionDate,
    transactionType: ordered.at(-1)?.transactionType || "buy",
  };
};
