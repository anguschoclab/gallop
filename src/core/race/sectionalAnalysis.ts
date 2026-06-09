import type { RaceSnapshot } from "./engine/raceSnapshotTypes";
import type { SectionalSplit, SectionalEntry } from "./types";

const SPLIT_LABELS = ["¼", "½", "¾", "Fin"];

type SnapshotHorseMap = Map<string, { position: number }>;

function buildSnapshotHorseMaps(snapshots: RaceSnapshot[]): SnapshotHorseMap[] {
  return snapshots.map((snap) =>
    new Map(snap.horses.map((h) => [h.horseId, { position: h.position }])),
  );
}

/**
 * Find the simulation time when a horse crossed a given distance marker.
 * Linearly interpolates between the two nearest snapshots.
 * Returns null if the horse never reached that distance (DNF).
 * @param snapshots
 * @param horseId
 * @param targetDistanceMeters
 * @param snapshotMaps - Optional pre-built maps for O(1) horse lookup (recommended for repeated calls)
 */
export function interpolateTimeAtDistance(
  snapshots: RaceSnapshot[],
  horseId: string,
  targetDistanceMeters: number,
  snapshotMaps?: SnapshotHorseMap[],
): number | null {
  const maps = snapshotMaps ?? buildSnapshotHorseMaps(snapshots);
  for (let i = 1; i < maps.length; i++) {
    const before = snapshots[i - 1];
    const after = snapshots[i];
    const hBefore = maps[i - 1].get(horseId);
    const hAfter = maps[i].get(horseId);
    if (!hBefore || !hAfter) continue;
    if (hAfter.position >= targetDistanceMeters && hBefore.position < targetDistanceMeters) {
      const d1 = hBefore.position;
      const d2 = hAfter.position;
      const t1 = before.t;
      const t2 = after.t;
      if (d2 === d1) return t2;
      return t1 + ((targetDistanceMeters - d1) * (t2 - t1)) / (d2 - d1);
    }
  }
  return null;
}

/**
 * Compute quarter-point sectional splits for all horses in a race.
 * splitMarkers defaults to [0.25, 0.5, 0.75, 1.0] * raceDistanceMeters.
 * Returns [] if snapshots is empty or undefined.
 * @param snapshots
 * @param raceDistanceMeters
 * @param horseIds
 * @param splitMarkers
 */
export function calculateSectionalSplits(
  snapshots: RaceSnapshot[],
  raceDistanceMeters: number,
  horseIds: string[],
  splitMarkers?: number[],
): SectionalSplit[] {
  if (!snapshots || snapshots.length === 0) return [];

  const markers = splitMarkers ?? [0.25, 0.5, 0.75, 1.0].map((f) => f * raceDistanceMeters);

  const splits: SectionalSplit[] = [];

  // Pre-compute cumulative times per horse per marker
  const snapshotMaps = buildSnapshotHorseMaps(snapshots);
  const cumulativeTimes: (number | null)[][] = markers.map((marker) =>
    horseIds.map((id) => interpolateTimeAtDistance(snapshots, id, marker, snapshotMaps)),
  );

  for (let mi = 0; mi < markers.length; mi++) {
    const distanceMeters = markers[mi];
    const label = SPLIT_LABELS[mi] ?? `${Math.round((mi + 1) * 25)}%`;

    const entriesRaw: {
      horseId: string;
      cumulativeTime: number;
      splitTime: number;
      velocityMs: number;
    }[] = [];

    for (let hi = 0; hi < horseIds.length; hi++) {
      const cumTime = cumulativeTimes[mi][hi];
      if (cumTime === null) continue;

      const prevCumTime = mi === 0 ? 0 : cumulativeTimes[mi - 1][hi];
      if (prevCumTime === null) continue;

      const prevDistance = mi === 0 ? 0 : markers[mi - 1];
      const segmentDistance = distanceMeters - prevDistance;
      const splitTime = cumTime - prevCumTime;
      const velocityMs = splitTime > 0 ? segmentDistance / splitTime : 0;

      entriesRaw.push({ horseId: horseIds[hi], cumulativeTime: cumTime, splitTime, velocityMs });
    }

    // Sort by cumulativeTime ascending to assign rank
    entriesRaw.sort((a, b) => a.cumulativeTime - b.cumulativeTime);

    const entries: SectionalEntry[] = entriesRaw.map((e, idx) => ({
      horseId: e.horseId,
      splitTime: e.splitTime,
      cumulativeTime: e.cumulativeTime,
      rank: idx + 1,
      velocityMs: e.velocityMs,
    }));

    splits.push({ label, distanceMeters, entries });
  }

  return splits;
}

/**
 * Alias for backward compatibility
 * @param snapshots
 * @param distance
 */
export function computeSectionalSplits(
  snapshots: RaceSnapshot[],
  distance: number,
): SectionalSplit[] {
  const allHorseIds = new Set<string>();
  for (const snap of snapshots) {
    for (const h of snap.horses) allHorseIds.add(h.horseId);
  }
  return calculateSectionalSplits(snapshots, distance, Array.from(allHorseIds));
}

/**
 * Produce a short pace position string: "3-2-2-1" (rank at each split marker).
 * @param splits
 * @param horseId
 */
export function buildPacePositionString(splits: SectionalSplit[], horseId: string): string {
  return splits
    .map((split) => {
      const entry = split.entries.find((e) => e.horseId === horseId);
      return entry?.rank ?? 0;
    })
    .join("-");
}

/**
 * Derive a human-readable running style label from pace positions.
 * @param pacePositions
 * @param fieldSize
 */
export function derivePaceStyleLabel(pacePositions: number[], fieldSize?: number): string {
  if (pacePositions.length === 0) return "Unknown";

  const firstCall = pacePositions[0];
  const lastCall = pacePositions[pacePositions.length - 1];
  const threshold = fieldSize ? fieldSize * 0.3 : 3;

  if (firstCall <= 1.5) return "Wire-to-wire";
  if (firstCall <= threshold) return "Presser";
  if (lastCall < firstCall - threshold) return "Deep Closer";
  if (lastCall < firstCall - 1) return "Closer";
  if (firstCall <= threshold * 2) return "Stalker";
  return "Deep Closer";
}

/**
 * Course familiarity multiplier applied to maxVelocity at simulation start.
 *
 * | Prior visits | Multiplier |
 * |---|---|
 * | 0 (debut)  | 0.985 |
 * | 1–2        | 0.995 |
 * | 3–4        | 1.000 |
 * | 5–9        | 1.005 |
 * | 10+        | 1.010 |
 * @param visits
 */
export function getCourseMultiplier(visits: number): number {
  if (visits === 0) return 0.985;
  if (visits <= 2) return 0.995;
  if (visits <= 4) return 1.0;
  if (visits <= 9) return 1.005;
  return 1.01;
}
