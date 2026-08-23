/**
 * npcBreeding.ts - Autonomous NPC breeding
 *
 * This file runs autonomous NPC breeding for the current day with personality-aware
 * decisions: aggressive stables breed more often, conservative stables wait for
 * higher-quality pairings, budget stables look for value sires, and trader stables
 * breed for marketability.
 *
 * Dependencies: ./types (Horse, Pregnancy, Stable, GameState), ./uuid (generateUUID), @/core/breeding/eligibility (canBreed), @/core/breeding/stallions (getAvailableStallions), @/core/calendar/breedingCalendar (inBreedingSeason), @/core/breeding/populationGenetics (computeProspectiveCoi), ./rng (Rng), @/core/breeding/leaderboardTypes (Leaderboard), @/core/breeding/strategy (BREEDING_PERSONALITIES, SINGLE_FEE_CAP_FRACTION, MIN_MARE_OVERALL, MAX_COI, scoreStallion), @/core/horse/stats (calculateOverallRating), @/core/ai/breedingAI (calculateAIStallionScore, createBreedingAIState, recordBreedingDecision), ./constants/gameConstants (BREEDING_FEE, GESTATION_DAYS)
 * Related files: npcStables.ts (uses breeding logic), breedingAI.ts (provides AI decisions)
 */

import type { Horse, Pregnancy, Stable, GameState } from "@/game/types";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { generateUUID } from "@/core/uuid";
import { canBreed } from "@/core/breeding/eligibility";
import { getAvailableStallions } from "@/core/breeding/stallions";
import { inBreedingSeason } from "@/core/calendar/breedingCalendar";
import { computeProspectiveCoi } from "@/core/breeding/populationGenetics";
import type { Rng } from "@/core/common/rng";
import type { Leaderboard } from "@/core/breeding/leaderboardTypes";
import {
  BREEDING_PERSONALITIES,
  SINGLE_FEE_CAP_FRACTION,
  MIN_MARE_OVERALL,
  MAX_COI,
  scoreStallion,
} from "@/core/breeding/strategy";
import { calculateOverallRating } from "@/core/horse/stats";
import { calculateAIStallionScore, createBreedingAIState } from "@/core/ai/breedingAI";
import { recordBreedingDecision } from "@/core/ai/breedingRecording";
import { BREEDING_FEE, GESTATION_DAYS } from "@/constants";
import type { DistressLevel } from "@/core/ai/financialDistressAI";
import {
  BREEDING_MARE_FRACTION,
  EMERGENCY_STUD_FEE_CAP_FRACTION,
} from "@/constants/financialDistressConstants";

/**
 * Run autonomous NPC breeding for the current day.
 *
 * Personality-aware breeding decisions:
 * - Aggressive stables breed more often and take more risks.
 * - Conservative stables wait for higher-quality pairings.
 * - Budget stables look for value sires.
 * - Trader stables breed for marketability.
 *
 * @param state - Current game state
 * @param stables - Array of NPC stables
 * @param rng - Random number generator
 * @param leaderboards - Optional leaderboards for stallion scoring
 * @returns Updated game state with new pregnancies
 */
export function runAutonomousBreeding(
  state: GameState,
  stables: Stable[],
  rng: Rng,
  leaderboards?: Record<string, Leaderboard>,
): GameState {
  const { day, npcAIManager } = state;
  const updatedState = { ...state };
  const newPregnancies: Pregnancy[] = [];

  // Northern/Southern hemisphere seasons differ
  const month = Math.floor(((day - 1) % 365) / 30) + 1;
  const northernSeason = inBreedingSeason(day, "Northern");
  const southernSeason = inBreedingSeason(day, "Southern");

  if (!northernSeason && !southernSeason) return updatedState;

  for (const stable of stables) {
    if (!BREEDING_PERSONALITIES.includes(stable.personality)) continue;

    // Distress-aware breeding: check financial distress from AI state
    const distressLevel: DistressLevel =
      npcAIManager?.stableStates[stable.id]?.financialDistress?.level ?? "healthy";

    // Critical distress: skip breeding entirely
    if (distressLevel === "critical") continue;

    // Try to breed if in season

    // Identify candidate mares (not pregnant, eligible age)
    const minMareQuality = MIN_MARE_OVERALL[stable.personality] ?? 50;
    const maxCoi = MAX_COI[stable.personality] ?? 0.1;

    const candidateMares = Object.values(state.horses)
      .filter(
        (h) =>
          h.ownership?.type === "npc" &&
          h.ownership.stableId === stable.id &&
          (!h.lifecycleStatus || h.lifecycleStatus === "active") &&
          (h.gender === "mare" || h.gender === "filly") &&
          h.age >= 3 &&
          h.age <= 20 &&
          ((h.hemisphere === "Northern" && northernSeason) ||
            (h.hemisphere === "Southern" && southernSeason)) &&
          !state.pregnancies.some((p) => !p.resolved && p.damId === h.id) &&
          calculateOverallRating(h) >= minMareQuality,
      )
      .map(ensurePhenotypeResolved);

    // Best mares first — the stable's best cash on its best mares.
    candidateMares.sort((a, b) => calculateOverallRating(b) - calculateOverallRating(a));

    // Distress-aware: limit number of mares bred
    let maxMaresToBreed = candidateMares.length;
    if (distressLevel === "caution") {
      maxMaresToBreed = Math.ceil(candidateMares.length * BREEDING_MARE_FRACTION.caution);
    } else if (distressLevel === "emergency") {
      maxMaresToBreed = Math.ceil(candidateMares.length * BREEDING_MARE_FRACTION.emergency);
    }
    const maresToBreed = candidateMares.slice(0, maxMaresToBreed);

    // Track running cash so we don't over-commit within one season.
    let stableCash = stables.find((s) => s.id === stable.id)!.cash;

    for (const mare of maresToBreed) {
      if (stableCash < BREEDING_FEE) break;

      // Identify candidate stallions within budget
      let maxFeePerMare = stableCash * (SINGLE_FEE_CAP_FRACTION[stable.personality] ?? 0.1);
      // Emergency distress: cap stud fees at EMERGENCY_STUD_FEE_CAP_FRACTION of normal budget
      if (distressLevel === "emergency") {
        maxFeePerMare *= EMERGENCY_STUD_FEE_CAP_FRACTION;
      }
      const stallions = getAvailableStallions(Object.values(state.horses), mare)
        .filter((s) => !(s.ownership?.type === "npc" && s.ownership.stableId === stable.id))
        .map(ensurePhenotypeResolved)
        .filter((s) => s.stud!.standingFee <= maxFeePerMare)
        .filter((s) => s.stud!.seasonBookings < s.stud!.bookSize)
        .filter((s) => s.hemisphere === mare.hemisphere);

      if (stallions.length === 0) continue;

      // Inbreeding-tolerance pre-filter — refuse stallions whose pairing
      // would exceed the personality's COI cap. No fallback: if no stallion
      // passes the COI filter, skip this mare entirely.
      const candidates = stallions.filter((stallion) => {
        const coi = computeProspectiveCoi(stallion, mare);
        return coi <= maxCoi;
      });

      if (candidates.length === 0) continue;
      const maxFee = Math.max(...candidates.map((s) => s.stud!.standingFee));

      // Score and pick the best stallion using AI-enhanced scoring
      let best: Horse | undefined;
      let bestScore = -1;

      // Get AI state if manager is present
      const aiState = npcAIManager ? createBreedingAIState(stable) : undefined;

      for (const stallion of candidates) {
        const score = aiState
          ? calculateAIStallionScore(aiState, stallion, mare, stable, maxFee, leaderboards)
          : scoreStallion(stallion, mare, stable, maxFee, leaderboards);

        if (score > bestScore) {
          bestScore = score;
          best = stallion;
        }
      }

      if (best && bestScore > 0.1) {
        // Minimum suitability threshold
        const sire = best;

        // Final eligibility check via canBreed
        const allPregnancies = [...(state.pregnancies || []), ...newPregnancies];
        const breedCheck = canBreed(sire, mare, day, allPregnancies);
        if (!breedCheck.ok) continue;

        const totalFee = sire.stud!.standingFee + BREEDING_FEE;

        // Create the pregnancy
        const pregnancy: Pregnancy = {
          id: generateUUID(),
          damId: mare.id,
          sireId: sire.id,
          damName: mare.name,
          sireName: sire.name,
          conceivedDay: day,
          dueDay: day + GESTATION_DAYS,
          resolved: false,
          stableId: stable.id,
          isPlayerOwned: false,
        };

        newPregnancies.push(pregnancy);
        stableCash -= totalFee;

        // Record decision in AI state if possible
        if (npcAIManager) {
          let aiState = createBreedingAIState(stable);
          aiState = recordBreedingDecision(
            aiState,
            sire.id,
            mare.id,
            sire.name,
            mare.name,
            stable.id,
            stable.personality,
            day,
            bestScore,
          );
          // Note: In a real system we'd persist this back to state.npcAIManager
        }
      }
    }
  }

  updatedState.pregnancies = [...(state.pregnancies || []), ...newPregnancies];
  return updatedState;
}

/**
 * Adapter for test compatibility
 * @param state - Game state (any type for test compatibility)
 * @param day - Current game day
 * @param rng - Random number generator
 * @returns Object containing horses, npcStables, newPregnancies, and logs
 */
export function runNpcBreeding(state: Partial<GameState>, day: number, rng: Rng) {
  const originalPregnanciesLength = state.pregnancies ? state.pregnancies.length : 0;

  const tempState = { ...state, day };
  const updatedState = runAutonomousBreeding(
    tempState as GameState,
    state.npcStables || [],
    rng,
    state.sireLeaderboards,
  );

  return {
    horses: updatedState.horses || [],
    npcStables: updatedState.npcStables || [],
    newPregnancies: updatedState.pregnancies
      ? updatedState.pregnancies.slice(originalPregnanciesLength)
      : [],
    logs: [],
  };
}
