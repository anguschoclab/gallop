/**
 * tradeSeries.ts - Shared daily trade aggregation
 *
 * Both the exchange (`exchange.ts::tradeSeries`) and the auction house price
 * history (`houseQuotes.ts::housePriceSeries`) aggregate trades into a daily
 * volume/turnover/avgPrice series. The only behavioural difference is that the
 * house series carries the last known avgPrice forward on empty days, while the
 * exchange series reports 0. This shared helper lets both delegate.
 *
 * Pure logic only - no store access, no mutation of inputs.
 */

export type DailyTradePoint = {
  day: number;
  volume: number;
  turnover: number;
  avgPrice: number;
};

/**
 * Aggregate trades into a daily series over a trailing window ending at `day`.
 *
 * @param trades - Trades to aggregate (must expose `day` and `price`)
 * @param day - Last day of the window (inclusive)
 * @param windowDays - Number of days to include (default 30)
 * @param carryAvg - When true, empty days inherit the last known avgPrice
 *   instead of reporting 0 (auction-house behaviour). Default false (exchange
 *   behaviour).
 * @param carryAvg.carryAvg - Whether to carry the last known avgPrice forward
 */
export function dailyTradeSeries(
  trades: { day: number; price: number }[],
  day: number,
  windowDays = 30,
  { carryAvg = false }: { carryAvg?: boolean } = {},
): DailyTradePoint[] {
  const out: DailyTradePoint[] = [];
  let carry = 0;
  for (let d = Math.max(1, day - windowDays + 1); d <= day; d++) {
    const dayTrades = trades.filter((t) => t.day === d);
    const turnover = dayTrades.reduce((sum, t) => sum + t.price, 0);
    const avg = dayTrades.length > 0 ? Math.round(turnover / dayTrades.length) : carry;
    if (dayTrades.length > 0 || !carryAvg) carry = avg;
    out.push({ day: d, volume: dayTrades.length, turnover, avgPrice: avg });
  }
  return out;
}
