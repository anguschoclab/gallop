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

import type { Horse, Pregnancy, Stable, GameState } from "./types";
import { generateUUID } from "@/game/uuid";
import { canBreed } from "@/core/breeding/eligibility";
import { getAvailableStallions } from "@/core/breeding/stallions";
import { inBreedingSeason } from "@/core/calendar/breedingCalendar";
import { computeProspectiveCoi } from "@/core/breeding/populationGenetics";
import type { Rng } from "@/game/rng";
import type { Leaderboard } from "@/core/breeding/leaderboardTypes";
import {
  BREEDING_PERSONALITIES,
  SINGLE_FEE_CAP_FRACTION,
  MIN_MARE_OVERALL,
  MAX_COI,
  scoreStallion,
} from "@/core/breeding/strategy";
import { calculateOverallRating } from "@/core/horse/stats";
import {
  calculateAIStallionScore,
  createBreedingAIState,
  recordBreedingDecision,
} from "@/core/ai/breedingAI";
import { BREEDING_FEE, GESTATION_DAYS } from "@/game/constants/gameConstants";

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
  let updatedState = { ...state };

  // Northern/Southern hemisphere seasons differ
  const month = Math.floor(((day - 1) % 365) / 30) + 1;
  const northernSeason = inBreedingSeason(day, "Northern");
  const southernSeason = inBreedingSeason(day, "Southern");

  if (!northernSeason && !southernSeason) return updatedState;

  for (const stable of stables) {
    if (stable.owned) continue; // Skip player stable

    const personality = BREEDING_PERSONALITIES[stable.personality] || BREEDING_PERSONALITIES.balanced;
    
    // Chance to breed today if in season
    if (rng.next() > personality.breedingFrequency) continue;

    // Identify candidate mares (not pregnant, eligible age)
    const minMareQuality = MIN_MARE_OVERALL * personality.qualityThreshold;
    const maxCoi = MAX_COI * (1 / personality.riskAversion);

    const candidateMares = state.horses.filter(
      (h) =>
        h.stableId === stable.id &&
        h.lifecycleStatus === "active" &&
        (h.gender === "mare" || h.gender === "filly") &&
        h.age >= 3 &&
        h.age <= 20 &&
        ((h.hemisphere === "Northern" && northernSeason) ||
          (h.hemisphere === "Southern" && southernSeason)) &&
        !state.pregnancies.some((p) => !p.resolved && p.damId === h.id) &&
        calculateOverallRating(h) >= minMareQuality,
    );

    // Best mares first — the stable's best cash on its best mares.
    candidateMares.sort((a, b) => calculateOverallRating(b) - calculateOverallRating(a));

    // Track running cash so we don't over-commit within one season.
    let stableCash = stables.find((s) => s.id === stable.id)!.cash;

    for (const mare of candidateMares) {
      if (stableCash < BREEDING_FEE) break;

      // Identify candidate stallions within budget
      const maxFeePerMare = stableCash * SINGLE_FEE_CAP_FRACTION;
      const stallions = getAvailableStallions(state.horses, mare).filter(
        (s) => s.stud!.standingFee <= maxFeePerMare && s.stableId !== stable.id,
      );

      if (stallions.length === 0) continue;

      // Inbreeding-tolerance pre-filter — refuse stallions whose pairing
      // would exceed the personality's COI cap.
      const toleratedStallions = stallions.filter((stallion) => {
        const coi = computeProspectiveCoi(stallion, mare);
        return coi <= maxCoi;
      });

      const candidates = toleratedStallions.length > 0 ? toleratedStallions : stallions;
      const maxFee = Math.max(...candidates.map((s) => s.stud!.standingFee));

      // Score and pick the best stallion using AI-enhanced scoring
      let best: Horse | undefined;
      let bestScore = -1;

      for (const stallion of candidates) {
        const score = calculateAIStallionScore(
          stallion,
          mare,
          stable,
          maxFee,
          state,
          leaderboards
        );

        if (score > bestScore) {
          bestScore = score;
          best = stallion;
        }
      }

      if (best && bestScore > 0.4) { // Minimum suitability threshold
        const sire = best;
        const totalFee = sire.stud!.standingFee + BREEDING_FEE;

        // Create the pregnancy
        const pregnancy: Pregnancy = {
          id: generateUUID(),
          damId: mare.id,
          sireId: sire.id,
          damName: mare.name,
          sireName: sire.name,
          startDay: day,
          dueDay: day + GESTATION_DAYS,
          resolved: false,
          stableId: stable.id,
          isPlayerOwned: false,
        };

        updatedState.pregnancies.push(pregnancy);
        stableCash -= totalFee;

        // Record decision in AI state if possible
        if (npcAIManager) {
           const aiState = createBreedingAIState(stable);
           recordBreedingDecision(aiState, mare, sire, true, day);
        }
      }
    }
  }

  return updatedState;
}
