/**
 * Race Resolution Helper Functions
 * Pure business logic for race result processing
 */

import { createRng, hashStr, type Rng } from "@/game/rng";
import { PRIZE_SPLIT } from "@/game/constants/gameConstants";

export type RankedResult = { horseId: string; position: number; time: number; dnf: boolean };

/**
 * Computes prize money payout splits for a race
 * @param purse - Total prize purse for the race
 * @param finisherCount - Number of horses that finished the race
 * @returns Array of prize amounts for each finishing position
 */
export function computePayoutSplits(purse: number, finisherCount: number): number[] {
  const splits: number[] = [];
  let runningPaid = 0;
  for (let i = 0; i < Math.min(PRIZE_SPLIT.length, finisherCount); i++) {
    const pay = Math.round(purse * PRIZE_SPLIT[i]);
    splits.push(pay);
    runningPaid += pay;
  }
  // Route any unpaid remainder to the last paid finisher
  if (splits.length > 0 && runningPaid < purse && finisherCount >= PRIZE_SPLIT.length) {
    splits[splits.length - 1] += purse - runningPaid;
  }
  return splits;
}

/**
 * Sanitizes and ranks race results, handling ties and DNFs
 * @param rawResult - Raw race results with horse IDs and times
 * @param raceId - Race ID for deterministic tie-breaking
 * @returns Object containing ranked results, finishers only, and DNFs only
 */
export function sanitizeAndRankResults(
  rawResult: { horseId: string; time: number }[],
  raceId: string,
): { ranked: RankedResult[]; finishers: RankedResult[]; dnfs: RankedResult[] } {
  const tieRng = createRng(hashStr(raceId) ^ 0x7e57);
  const enriched = rawResult.map((r) => ({ ...r, dnf: !Number.isFinite(r.time) || r.time <= 0 }));
  const finishersRaw = enriched
    .filter((r) => !r.dnf)
    .sort((a, b) => {
      if (a.time === b.time) return tieRng.next() - 0.5;
      return a.time - b.time;
    });
  const finishers = finishersRaw.map((r, idx) => ({ ...r, position: idx + 1 }));
  const dnfs = enriched
    .filter((r) => r.dnf)
    .map((r, idx) => ({ ...r, position: finishersRaw.length + idx + 1 }));
  const ranked = [...finishers, ...dnfs];
  return { ranked, finishers, dnfs };
}

/**
 * Detects if a race had a photo finish (finishers within 0.05 seconds)
 * @param finishers - Array of ranked finisher results
 * @returns True if any two consecutive finishers are within 0.05 seconds
 */
export function detectPhotoFinish(finishers: RankedResult[]): boolean {
  for (let i = 1; i < finishers.length; i++) {
    if (Math.abs(finishers[i].time - finishers[i - 1].time) < 0.05) {
      return true;
    }
  }
  return false;
}
