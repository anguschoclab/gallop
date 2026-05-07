/**
 * Pure ordinal suffix calculation
 * Returns the ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 * Extracted from: stable.$horseId.tsx, BeyerChart.tsx, store.ts
 */
export function getOrdinalSuffix(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = n % 100;
  return suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
}
