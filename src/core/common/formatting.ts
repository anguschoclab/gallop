/**
 * formatting.ts — Pure string formatting utilities.
 * Extracted from UI components to allow use in store slices and core logic
 * without importing React components.
 */

/**
 * Format a number as currency with proper typography.
 *
 * @param amount - The numeric value to format
 * @returns Formatted currency string (e.g. "$1,000")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format race time with proper decimal precision.
 *
 * @param seconds - Total time in seconds
 * @param decimals - Number of decimal places (1 or 2, defaults to 2)
 * @returns Formatted time string (e.g. "92.41s")
 */
export function formatTime(seconds: number, decimals: 1 | 2 = 2): string {
  return `${seconds.toFixed(decimals)}s`;
}
