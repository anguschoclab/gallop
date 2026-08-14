/**
 * Shared deterministic tie-break comparator for race finish ordering.
 *
 * Sort chain: finishTime (ascending) → barrier (ascending) → horseId (lexicographic).
 * null/Infinity finishTime sorts last.
 */

export interface FinishOrderable {
  finishTime?: number | null;
  time?: number | null;
  barrier?: number;
  horseId: string;
}

export function compareFinishOrder(a: FinishOrderable, b: FinishOrderable): number {
  const at = a.finishTime ?? a.time ?? Infinity;
  const bt = b.finishTime ?? b.time ?? Infinity;
  if (at !== bt) return at - bt;
  const ab = a.barrier ?? Infinity;
  const bb = b.barrier ?? Infinity;
  if (ab !== bb) return ab - bb;
  return a.horseId < b.horseId ? -1 : a.horseId > b.horseId ? 1 : 0;
}
