/**
 * logHelpers.ts - Shared helpers for appending to the game journal log.
 *
 * Extracted from duplicated patterns across store slices. Each slice was
 * manually constructing `[{ day, text }, ...log].slice(0, N)` with varying
 * cap sizes. These helpers consolidate that into a single utility.
 *
 * Dependencies: none (pure)
 * Related files: src/game/store/slices/*.ts (consumers)
 */

export type LogEntry = { day: number; text: string };

/**
 * Default log cap for slice actions (matches the most common slice value).
 */
export const DEFAULT_LOG_CAP = 50;

/**
 * Prepend a new log entry to an existing log, capping the total length.
 * @param log - Existing log entries (newest first after prepend).
 * @param day - The game day for the new entry.
 * @param text - The log message text.
 * @param cap - Maximum number of entries to retain (default 50).
 * @returns A new array with the entry prepended, capped to `cap` entries.
 */
export function prependLogEntry(
  log: LogEntry[],
  day: number,
  text: string,
  cap: number = DEFAULT_LOG_CAP,
): LogEntry[] {
  return [{ day, text }, ...log].slice(0, cap);
}

/**
 * Prepend multiple log entries to an existing log, capping the total length.
 * @param log - Existing log entries (newest first after prepend).
 * @param entries - New entries to prepend (in order).
 * @param cap - Maximum number of entries to retain (default 50).
 * @returns A new array with entries prepended, capped to `cap` entries.
 */
export function prependLogEntries(
  log: LogEntry[],
  entries: LogEntry[],
  cap: number = DEFAULT_LOG_CAP,
): LogEntry[] {
  return [...entries, ...log].slice(0, cap);
}
