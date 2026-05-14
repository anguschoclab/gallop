/**
 * sectionalAnalysis.ts - Sectional timing computation
 *
 * This file provides pure functions for computing quarter-mile sectional splits
 * from race snapshots, including leader identification, position tracking, and
 * per-horse pace extraction. It uses linear interpolation for precision between ticks.
 *
 * Dependencies: ./engine/raceSnapshotTypes (RaceSnapshot), ./types (SectionalSplit, SectionalEntry)
 */

import type { RaceSnapshot } from "./engine/raceSnapshotTypes";
import type { SectionalSplit, SectionalEntry } from "./types";

/**
 * Linearly interpolates the time a horse crossed a specific distance marker.
 */
function interpolateTimeAtDistance(
  before: RaceSnapshot,
  after: RaceSnapshot,
  horseId: string,
  distance: number,
): number {
  const hBefore = before.horses.find((h) => h.horseId === horseId);
  const hAfter = after.horses.find((h) => h.horseId === horseId);

  if (!hBefore || !hAfter) return after.t;

  const d1 = hBefore.position;
  const d2 = hAfter.position;
  const t1 = before.t;
  const t2 = after.t;

  if (d2 === d1) return t2;

  return t1 + ((distance - d1) * (t2 - t1)) / (d2 - d1);
}

/**
 * Compute quarter-mile sectional splits from race snapshots.
 * @param snapshots - Race snapshots recorded at 0.1s intervals
 * @param distance - Total race distance in meters
 * @returns Array of sectional splits for each quarter-mile marker
 */
export function computeSectionalSplits(
  snapshots: RaceSnapshot[],
  distance: number
): SectionalSplit[] {
  const quarterMile = 402.336; // meters
  const splits: SectionalSplit[] = [];
  const numQuarters = Math.floor(distance / quarterMile);

  for (let q = 1; q <= numQuarters; q++) {
    const marker = q * quarterMile;
    
    // Find index of snapshot where leader crosses marker
    const snapIndex = snapshots.findIndex(s =>
      s.horses.some(h => h.position >= marker)
    );

    if (snapIndex > 0) {
      const snapAfter = snapshots[snapIndex];
      const snapBefore = snapshots[snapIndex - 1];

      const sortedHorses = [...snapAfter.horses]
        .sort((a, b) => b.position - a.position);
      
      const leaderId = sortedHorses[0].horseId;
      const exactTime = interpolateTimeAtDistance(snapBefore, snapAfter, leaderId, marker);

      splits.push({
        quarter: q,
        time: exactTime,
        leader: leaderId,
        positions: sortedHorses.map(h => ({
          horseId: h.horseId,
          position: sortedHorses.findIndex(sh => sh.horseId === h.horseId) + 1
        }))
      });
    }
  }

  return splits;
}

/**
 * Compute per-horse sectional entries from splits.
 * @param splits - Sectional splits array
 * @returns Map of horseId to sectional entries
 */
export function computeSectionalEntries(
  splits: SectionalSplit[]
): Record<string, SectionalEntry> {
  const entries: Record<string, SectionalEntry> = {};

  for (const split of splits) {
    for (const pos of split.positions) {
      if (!entries[pos.horseId]) {
        entries[pos.horseId] = { horseId: pos.horseId, splits: [] };
      }
      entries[pos.horseId].splits.push({
        quarter: split.quarter,
        time: split.time,
        position: pos.position
      });
    }
  }

  return entries;
}

/**
 * Extract pace positions from sectional entries.
 * @param entries - Sectional entries
 * @param horseId - Horse to extract positions for
 * @returns Array of positions at each quarter (1-indexed)
 */
export function extractPacePositions(
  entries: Record<string, SectionalEntry>,
  horseId: string
): number[] | undefined {
  const entry = entries[horseId];
  if (!entry) return undefined;
  return entry.splits.map(s => s.position);
}

/**
 * Derives a human-readable pace style label based on a horse's average positions.
 */
export function derivePaceStyleLabel(pacePositions: number[]): string {
  if (pacePositions.length === 0) return "Unknown";

  const firstCall = pacePositions[0];
  const lastCall = pacePositions[pacePositions.length - 1];

  if (firstCall <= 1.5) return "Front-runner";
  if (firstCall <= 3) return "Stalker";
  if (lastCall < firstCall - 3) return "Closer";
  if (firstCall > 6) return "Deep Closer";

  return "Mid-pack";
}
