import type { Horse, GameState } from "@/game/types";

// Reverse-lookup helpers: given a sire/dam ID, find that horse's foals in the
// live horses[] array. Linear scans for now — fine at the scale of a single
// stable + a couple hundred NPC horses. Memoize later if needed.

export function getFoalsBy(state: Pick<GameState, "horses">, stallionId: string): Horse[] {
  return state.horses.filter((h) => h.pedigree?.sireId === stallionId);
}

export function getFoalsOf(state: Pick<GameState, "horses">, damId: string): Horse[] {
  return state.horses.filter((h) => h.pedigree?.damId === damId);
}

// "Is this foal a stakes winner?" — true if any race in their history has a
// graded badge OR raceClass Stakes/Group at position 1. Mirrors the same
// predicate used inside resolveRace's blue-hen update path.
export function isStakesWinner(foal: Horse): boolean {
  return foal.raceHistory.some((r) => r.position === 1 && (r.grade !== undefined || r.purse !== undefined && r.purse >= 18000));
}

export function isG1Winner(foal: Horse): boolean {
  return foal.raceHistory.some((r) => r.position === 1 && r.grade === "G1");
}

export function getStakesFoalsBy(state: Pick<GameState, "horses">, stallionId: string): number {
  return getFoalsBy(state, stallionId).filter(isStakesWinner).length;
}

export function getG1FoalsBy(state: Pick<GameState, "horses">, stallionId: string): number {
  return getFoalsBy(state, stallionId).filter(isG1Winner).length;
}

// Total earnings across a stallion's foals. Sums all raceHistory entries,
// taking the prize-split share for the recorded position. Approximate: we
// reconstruct earnings from purse × split rather than persisting per-race
// payouts. Good enough for AEI computation.
const PRIZE_SPLIT = [0.6, 0.25, 0.1, 0.05];
export function foalLifetimeEarnings(foal: Horse): number {
  let total = 0;
  for (const r of foal.raceHistory) {
    if (r.position - 1 < PRIZE_SPLIT.length && r.purse) {
      total += Math.round(r.purse * PRIZE_SPLIT[r.position - 1]);
    }
  }
  return total;
}

export function totalEarningsBy(state: Pick<GameState, "horses">, stallionId: string): number {
  return getFoalsBy(state, stallionId).reduce((sum, h) => sum + foalLifetimeEarnings(h), 0);
}

// Foals per the "racing age" definition (2 or older). Used for AEI denominator
// and Sire Watch's runners/starters columns.
export function getRunnersBy(state: Pick<GameState, "horses">, stallionId: string): Horse[] {
  return getFoalsBy(state, stallionId).filter((h) => h.age >= 2 && h.raceHistory.length > 0);
}
