/**
 * formatting.ts — Pure string formatting utilities.
 * Extracted from UI components to allow use in store slices and core logic
 * without importing React components.
 */

/**
 * formatCurrency — Format a number as currency with proper typography.
 *
 * Design Bible:
 * - Uses IBM Plex Mono with tabular-nums
 * - Uses Intl.NumberFormat for consistent formatting
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * formatTime — Format race time with proper decimals.
 *
 * Design Bible:
 * - Finish time: two decimal places (92.41s)
 * - Split time: one decimal place (23.4s)
 */
export function formatTime(seconds: number, decimals: 1 | 2 = 2): string {
  return `${seconds.toFixed(decimals)}s`;
}
