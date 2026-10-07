/**
 * Deep-clones a value using the native structured clone algorithm.
 * Prefer over JSON.parse(JSON.stringify(...)) — faster and preserves
 * Dates, Maps, Sets, and undefined values. Throws on functions.
 * @param value - Value to clone
 * @returns Deep clone
 */
export function deepClone<T>(value: T): T {
  return structuredClone(value);
}
