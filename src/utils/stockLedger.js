import { AppError } from "./http.js";

// Legacy documents represent one transaction; new documents retain every trade.
export const stockTransactions = (stock) => stock.transactions?.length
  ? stock.transactions.map((entry) => entry.toObject ? entry.toObject() : entry)
  : [{
      _id: stock._id,
      quantity: stock.quantity,
      purchasePrice: stock.purchasePrice ?? 0,
      transactionType: stock.transactionType || "buy",
      transactionDate: stock.transactionDate || stock.purchaseDate || stock.createdAt,
    }];

export const calculateHolding = (transactions) => {
  const ordered = [...transactions].sort(
    (left, right) => new Date(left.transactionDate) - new Date(right.transactionDate),
  );
  let quantity = 0;
  let cost = 0;
  for (const trade of ordered) {
    if (trade.transactionType === "sell") {
      // Tolerate only floating point rounding at fractional-share boundaries.
      const tolerance = Number.EPSILON * Math.max(quantity, trade.quantity) * 8;
      if (trade.quantity - quantity > tolerance) {
        throw new AppError(`Cannot sell ${trade.quantity} shares. Available quantity on the transaction date is ${Math.max(quantity, 0)}.`, 409);
      }
      cost -= (quantity ? cost / quantity : 0) * trade.quantity;
      quantity -= trade.quantity;
      if (Math.abs(quantity) <= tolerance) { quantity = 0; cost = 0; }
    } else {
      quantity += trade.quantity;
      cost += trade.quantity * trade.purchasePrice;
    }
  }
  if (!Number.isFinite(quantity) || !Number.isFinite(cost)) {
    throw new AppError("Stock quantity or investment exceeds the supported range", 400);
  }
  return {
    quantity,
    purchasePrice: quantity ? cost / quantity : 0,
    purchaseDate: ordered[0]?.transactionDate,
    transactionDate: ordered.at(-1)?.transactionDate,
    transactionType: ordered.at(-1)?.transactionType || "buy",
  };
};

