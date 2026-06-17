/**
 * paceTendency.ts — Shared utilities for classifying a horse's running
 * tendency (front-runner, mid-pack, off-pace) from its race history, with
 * optional filters for trip distance and surface. Used by the stable filter,
 * race entry filter, and running style breakdown.
 */
import type { Horse } from "@/game/types";

export type Tendency = "front" | "mid" | "off";
export type TendencyFilter = Tendency | "any";
export type DistanceBucket = "sprint" | "mile" | "route" | "any";
export type SurfaceFilter = "Turf" | "Dirt" | "Synthetic" | "any";

export const TENDENCY_LABEL: Record<Tendency, string> = {
  front: "Front-Runner",
  mid: "Mid-Pack",
  off: "Off-Pace",
};

export const DISTANCE_LABEL: Record<DistanceBucket, string> = {
  sprint: "Sprint (≤1400m)",
  mile: "Mile (1401–1900m)",
  route: "Route (>1900m)",
  any: "Any Trip",
};

/**
 * Bucket a distance in metres into a coarse trip category.
 *
 * @param distance - Distance in metres (optional).
 */
export function distanceBucket(distance?: number): DistanceBucket {
  if (!distance) return "any";
  if (distance <= 1400) return "sprint";
  if (distance <= 1900) return "mile";
  return "route";
}

/**
 * Classify a first-call position relative to field size into a tendency.
 *
 * @param firstCall - First call position.
 * @param fieldSize - Total field size (optional, defaults to 8).
 */
export function classifyTendency(firstCall: number, fieldSize?: number): Tendency {
  const f = fieldSize ?? 8;
  if (firstCall <= Math.max(2, f * 0.25)) return "front";
  if (firstCall <= Math.max(5, f * 0.65)) return "mid";
  return "off";
}

export interface TendencyStats {
  /** Total races contributing to the stats (sample size). */
  sample: number;
  /** Count of races classified as each tendency. */
  counts: Record<Tendency, number>;
  /** Wins per tendency. */
  wins: Record<Tendency, number>;
  /** In-the-money (1-3) per tendency. */
  itm: Record<Tendency, number>;
  /** Dominant tendency (most frequent), or null when no data. */
  dominant: Tendency | null;
  /** Share (0-1) of the dominant tendency. */
  dominantShare: number;
}

export interface TendencyFilterOpts {
  distance?: DistanceBucket;
  surface?: SurfaceFilter;
}

const EMPTY: TendencyStats = {
  sample: 0,
  counts: { front: 0, mid: 0, off: 0 },
  wins: { front: 0, mid: 0, off: 0 },
  itm: { front: 0, mid: 0, off: 0 },
  dominant: null,
  dominantShare: 0,
};

/**
 * Compute tendency stats for a horse, optionally filtered to a trip+surface.
 *
 * @param horse - The horse to analyse.
 * @param opts - Optional filter for distance bucket and surface.
 */
export function getHorseTendencyStats(horse: Horse, opts: TendencyFilterOpts = {}): TendencyStats {
  const { distance = "any", surface = "any" } = opts;
  const history = horse.raceHistory ?? [];

  const counts: Record<Tendency, number> = { front: 0, mid: 0, off: 0 };
  const wins: Record<Tendency, number> = { front: 0, mid: 0, off: 0 };
  const itm: Record<Tendency, number> = { front: 0, mid: 0, off: 0 };
  let sample = 0;

  for (const r of history as any[]) {
    if (!r.pacePositions || r.pacePositions.length === 0) continue;
    if (distance !== "any" && distanceBucket(r.distance) !== distance) continue;
    if (surface !== "any" && r.surface !== surface) continue;
    const t = classifyTendency(r.pacePositions[0], r.fieldSize);
    counts[t] += 1;
    sample += 1;
    if (r.position === 1) wins[t] += 1;
    if (r.position && r.position <= 3) itm[t] += 1;
  }

  if (sample === 0) return EMPTY;

  let dominant: Tendency = "mid";
  let best = -1;
  (Object.keys(counts) as Tendency[]).forEach((k) => {
    if (counts[k] > best) {
      best = counts[k];
      dominant = k;
    }
  });

  return {
    sample,
    counts,
    wins,
    itm,
    dominant,
    dominantShare: best / sample,
  };
}

/**
 * Predicate: does a horse match the given tendency filter for a trip/surface?
 *
 * @param horse - The horse to check.
 * @param tendency - The desired tendency filter.
 * @param opts - Optional filter for distance bucket and surface.
 */
export function matchesTendency(
  horse: Horse,
  tendency: TendencyFilter,
  opts: TendencyFilterOpts = {},
): boolean {
  if (tendency === "any") return true;
  const stats = getHorseTendencyStats(horse, opts);
  if (stats.sample === 0) {
    // Fall back to declared genetic style when no race data is available.
    const declared = horse.runningStyle;
    if (tendency === "front") return declared === "E" || declared === "EP";
    if (tendency === "mid") return declared === "P";
    return declared === "S";
  }
  return stats.dominant === tendency;
}
