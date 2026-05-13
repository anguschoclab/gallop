/**
 * sectionalAnalysis.ts - Sectional timing computation
 *
 * This file provides pure functions for computing quarter-mile sectional splits
 * from race snapshots, including leader identification, position tracking, and
 * per-horse pace extraction.
 *
 * Dependencies: ./engine/raceSnapshotTypes (RaceSnapshot), ./types (SectionalSplit, SectionalEntry)
 * Related files: liveRaceResolution.ts (uses to compute splits), raceImpactGenerator.ts (uses to compute splits)
 */

import type { RaceSnapshot } from "./engine/raceSnapshotTypes";
import type { SectionalSplit, SectionalEntry } from "./types";

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
    // Find snapshot where leader crosses marker
    const crossingSnapshot = snapshots.find(s =>
      s.horses.some(h => h.position >= marker)
    );

    if (crossingSnapshot) {
      const sortedHorses = [...crossingSnapshot.horses]
        .sort((a, b) => b.position - a.position);

      splits.push({
        quarter: q,
        time: crossingSnapshot.t,
        leader: sortedHorses[0].horseId,
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
