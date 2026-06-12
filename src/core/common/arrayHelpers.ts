/**
 * arrayHelpers.ts - Common array reduction helper functions
 *
 * This file provides reusable helper functions for common array reduction patterns
 * to avoid code duplication and improve maintainability.
 */

/**
 * Calculate the sum of all numbers in an array.
 *
 * @param arr - Array of numbers
 * @returns Sum of all numbers
 *
 * @example
 * const total = sum([1, 2, 3]); // 6
 */
export function sum(arr: number[]): number {
  return arr.reduce((acc, val) => acc + val, 0);
}

/**
 * Calculate the average of all numbers in an array.
 *
 * @param arr - Array of numbers
 * @returns Average of all numbers
 *
 * @example
 * const avg = average([1, 2, 3, 4]); // 2.5
 */
export function average(arr: number[]): number {
  return arr.length > 0 ? sum(arr) / arr.length : 0;
}

/**
 * Find the maximum value in an array.
 *
 * @param arr - Array of numbers
 * @returns Maximum value
 *
 * @example
 * const max = max([1, 2, 3]); // 3
 */
export function max(arr: number[]): number {
  return arr.reduce((acc, val) => Math.max(acc, val), -Infinity);
}

/**
 * Find the minimum value in an array.
 *
 * @param arr - Array of numbers
 * @returns Minimum value
 *
 * @example
 * const min = min([1, 2, 3]); // 1
 */
export function min(arr: number[]): number {
  return arr.reduce((acc, val) => Math.min(acc, val), Infinity);
}

/**
 * Find the object with the maximum value of a given property.
 *
 * @param arr - Array of objects
 * @param prop - Property to compare
 * @returns Object with maximum property value
 *
 * @example
 * const leader = maxBy(runners, 'position');
 */
export function maxBy<T>(arr: T[], prop: keyof T): T | undefined {
  if (arr.length === 0) return undefined;
  return arr.reduce(
    (max, current) => ((current[prop] as number) > (max[prop] as number) ? current : max),
    arr[0],
  );
}

/**
 * Group array items by a key function.
 *
 * @param arr - Array of items
 * @param keyFn - Function to extract the grouping key
 * @returns Object with keys as group identifiers and values as arrays of items
 *
 * @example
 * const byMonth = groupBy(races, r => r.month);
 */
export function groupBy<T, K extends string | number>(
  arr: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return arr.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

/**
 * Count occurrences of each unique value in an array.
 *
 * @param arr - Array of items
 * @returns Object with keys as unique values and values as counts
 *
 * @example
 * const counts = countBy(['a', 'b', 'a']); // { a: 2, b: 1 }
 */
export function countBy<T extends string | number>(arr: T[]): Record<T, number> {
  return arr.reduce(
    (acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
}
