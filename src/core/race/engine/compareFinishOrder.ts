/**
 * Shared deterministic tie-break comparator for race finish ordering.
 *
 * Sort chain: finishTime/time (ascending) → gate (ascending) → horseId (lexicographic).
 * null/Infinity time sorts last. Supports both `Runner` (finishTime) and
 * finish-order accumulator entries (time).
 */

export interface FinishOrderable {
  finishTime?: number | null;
  time?: number;
  gate?: number;
  horseId: string;
}

function getTime(f: FinishOrderable): number {
  if (f.finishTime !== undefined && f.finishTime !== null) return f.finishTime;
  if (f.time !== undefined && f.time !== null) return f.time;
  return Infinity;
}

export function compareFinishOrder(a: FinishOrderable, b: FinishOrderable): number {
  const at = getTime(a);
  const bt = getTime(b);
  if (at !== bt) return at - bt;
  const ag = a.gate ?? Infinity;
  const bg = b.gate ?? Infinity;
  if (ag !== bg) return ag - bg;
  return a.horseId < b.horseId ? -1 : a.horseId > b.horseId ? 1 : 0;
}
