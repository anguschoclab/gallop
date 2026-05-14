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
 * Linearly interpolates the exact time a horse crossed a specific distance marker.
 * Used for precise sectional timing between simulation ticks.
 * 
 * @param {RaceSnapshot} before - The snapshot before crossing the marker.
 * @param {RaceSnapshot} after - The snapshot after crossing the marker.
 * @param {string} horseId - The unique ID of the horse.
 * @param {number} distance - The distance marker in meters.
 * @returns {number} The interpolated time in seconds.
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
 * Computes quarter-mile sectional splits for a race based on simulation snapshots.
 * 
 * @param {RaceSnapshot[]} snapshots - Array of race snapshots recorded during the simulation.
 * @param {number} distance - Total race distance in meters.
 * @returns {SectionalSplit[]} An array of computed sectional splits for each quarter-mile marker.
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
 * Computes per-horse sectional entries from a list of race sectional splits.
 * Organizes the split data by horse ID for easier retrieval.
 * 
 * @param {SectionalSplit[]} splits - The array of sectional splits.
 * @returns {Record<string, SectionalEntry>} A map of horse IDs to their sectional entries.
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
 * Extracts the sequence of positions at each quarter-mile marker for a specific horse.
 * 
 * @param {Record<string, SectionalEntry>} entries - The map of sectional entries.
 * @param {string} horseId - The unique ID of the horse.
 * @returns {number[] | undefined} An array of positions (1-indexed), or undefined if the horse is not found.
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
 * Derives a human-readable pace style label (e.g., "Front-runner", "Closer") based on a horse's average positions during the race.
 * 
 * @param {number[]} pacePositions - The array of positions at each quarter-mile marker.
 * @returns {string} The derived pace style label.
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
