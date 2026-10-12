export const roundAmount = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
export const profitLossStatus = (value) => value == null ? "unavailable" : value > 0 ? "profit" : value < 0 ? "loss" : "neutral";

// Percentages use the unrounded totals, never the sum of individual returns.
export const holdingMetrics = ({ investedAmount, currentValue, todayChange }) => {
  const gain = currentValue - investedAmount;
  const previousValue = todayChange == null ? null : currentValue - todayChange;
  const profitLoss = roundAmount(gain);
  const daily = todayChange == null ? null : roundAmount(todayChange);
  return {
    totalHoldingAmount: roundAmount(currentValue),
    profitLoss,
    profitLossPercentage: investedAmount > 0 ? roundAmount(gain / investedAmount * 100) : null,
    profitLossStatus: profitLossStatus(profitLoss),
    todayChange: daily,
    todayChangePercentage: previousValue > 0 ? roundAmount(todayChange / previousValue * 100) : null,
    todayChangeStatus: profitLossStatus(daily),
  };
};
