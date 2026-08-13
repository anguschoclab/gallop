import type { Horse, Jockey } from "@/game/types";
import { getCompatibility } from "@/core/jockey/compatibility";

export function scoreJockeyChemistry(horse: Horse, jockey: Jockey): number {
  const fameScore = jockey.fame * 0.5;
  const affinityXP = jockey.affinityMap?.[horse.id] ?? 0;
  const affinityScore = Math.min(affinityXP / 10, 50);
  const compat = getCompatibility(horse, jockey);
  const compatibilityBonus =
    compat === "High" ? 20 : compat === "Good" ? 10 : compat === "Poor" ? -15 : 0;
  return fameScore + affinityScore + compatibilityBonus;
}

export function selectBestFreeAgentJockey(horse: Horse, freeAgents: Jockey[]): Jockey | null {
  if (freeAgents.length === 0) return null;
  let best = freeAgents[0];
  let bestScore = scoreJockeyChemistry(horse, best);
  for (let i = 1; i < freeAgents.length; i++) {
    const score = scoreJockeyChemistry(horse, freeAgents[i]);
    if (score > bestScore) {
      best = freeAgents[i];
      bestScore = score;
    }
  }
  return best;
}
