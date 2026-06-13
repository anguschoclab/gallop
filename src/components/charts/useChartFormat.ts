/**
 * useChartFormat.ts - Number/currency/date formatters with tabular-num output.
 */
const compactCurrency = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
  style: "currency",
  currency: "USD",
});
const fullCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrencyCompact(n: number): string {
  return compactCurrency.format(n);
}
export function formatCurrencyFull(n: number): string {
  return fullCurrency.format(n);
}
export function formatNumberCompact(n: number): string {
  return compactNumber.format(n);
}
export function formatDay(day: number): string {
  return `D${day}`;
}
export function formatPct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}
