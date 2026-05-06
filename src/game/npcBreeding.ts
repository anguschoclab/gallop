import type { Horse, Pregnancy, Stable, GameState } from "./types";
import { generateUUID } from "./uuid";
import { canBreed } from "@/core/breeding/eligibility";
import { getAvailableStallions } from "@/core/breeding/stallions";
import { isBreedingSeasonStart } from "@/core/calendar/breedingCalendar";
import { computeCoiFromSnapshot } from "@/core/breeding/populationGenetics";
import type { Rng } from "./rng";
import type { Leaderboard } from "@/core/breeding/leaderboardTypes";
import {
  BREEDING_PERSONALITIES,
  SINGLE_FEE_CAP_FRACTION,
  MIN_MARE_OVERALL,
  MAX_COI,
  overallRating,
  scoreStallion,
} from "@/core/breeding/strategy";
import { calculateAIStallionScore, createBreedingAIState, recordBreedingDecision } from "@/core/ai/breedingAI";

const BREEDING_FEE = 2000;
const GESTATION_DAYS = 30;

/**
 * Run autonomous NPC breeding for the current day. Personality-aware:
 * each stable evaluates mares against its quality floor, picks stallions
 * scored by its strategy, respects its single-fee budget cap, and refuses
 * inbreeding above its tolerance. Now influenced by sire leaderboards and AI learning.
 */
export function runNpcBreeding(
  state: Pick<GameState, "horses" | "npcStables" | "pregnancies" | "day" | "sireLeaderboards">,
  newDay: number,
  rng: Rng,
): {
  horses: Horse[];
  npcStables: Stable[];
  newPregnancies: Pregnancy[];
  logs: { day: number; text: string }[];
} {
  const northernStart = isBreedingSeasonStart(newDay, "Northern");
  const southernStart = isBreedingSeasonStart(newDay, "Southern");
  if (!northernStart && !southernStart) {
    return { horses: state.horses, npcStables: state.npcStables, newPregnancies: [], logs: [] };
  }

  const newPregnancies: Pregnancy[] = [];
  const logs: { day: number; text: string }[] = [];
  let horses = [...state.horses];
  let stables = [...state.npcStables];

  // Create AI states for each stable (in a real implementation, these would be persisted)
  const aiStates = new Map<string, ReturnType<typeof createBreedingAIState>>();

  for (const stable of stables) {
    if (!BREEDING_PERSONALITIES.includes(stable.personality)) continue;

    // Initialize AI state for this stable
    if (!aiStates.has(stable.id)) {
      aiStates.set(stable.id, createBreedingAIState(stable));
    }
    const aiState = aiStates.get(stable.id)!;

    const minMareQuality = MIN_MARE_OVERALL[stable.personality];
    const maxCoi = MAX_COI[stable.personality];
    const feeCapFraction = SINGLE_FEE_CAP_FRACTION[stable.personality];

    // Mares of breeding age in the hemisphere whose season just opened, above
    // the personality's quality floor.
    const stableHorses = horses.filter((h) => h.stableId === stable.id);
    const candidateMares = stableHorses.filter(
      (h) =>
        (h.gender === "mare" || h.gender === "filly") &&
        h.age >= 3 &&
        h.age <= 20 &&
        ((h.hemisphere === "Northern" && northernStart) ||
          (h.hemisphere === "Southern" && southernStart)) &&
        !state.pregnancies.some((p) => !p.resolved && p.damId === h.id) &&
        overallRating(h) >= minMareQuality,
    );

    // Best mares first — the stable's best cash on its best mares.
    candidateMares.sort((a, b) => overallRating(b) - overallRating(a));

    // Track running cash so we don't over-commit within one season.
    let stableCash = stables.find((s) => s.id === stable.id)!.cash;

    for (const mare of candidateMares) {
      const maxFeeForThisMare = stableCash * feeCapFraction;

      const stallions = getAvailableStallions({ horses, day: newDay }, mare.hemisphere)
        .filter((h) => h.id !== mare.id)
        .filter((h) => stableCash >= BREEDING_FEE + h.stud!.standingFee)
        .filter((h) => h.stud!.standingFee <= maxFeeForThisMare);

      if (stallions.length === 0) continue;

      // Inbreeding-tolerance pre-filter — refuse stallions whose pairing
      // would exceed the personality's COI cap.
      const toleratedStallions = stallions.filter((stallion) => {
        const hypotheticalPedigree = {
          sireId: stallion.id,
          damId: mare.id,
          sirePedigree: stallion.pedigree,
          damPedigree: mare.pedigree,
        };
        const coi = computeCoiFromSnapshot(hypotheticalPedigree);
        return coi <= maxCoi;
      });

      const candidates = toleratedStallions.length > 0 ? toleratedStallions : stallions;
      const maxFee = Math.max(...candidates.map((s) => s.stud!.standingFee));

      // Score and pick the best stallion using AI-enhanced scoring
      let best: Horse | undefined;
      let bestScore = -Infinity;
      for (const stallion of candidates) {
        let score = calculateAIStallionScore(
          aiState,
          stallion,
          mare,
          stable,
          maxFee,
          state.sireLeaderboards,
        );

        // Ownership Bonus: encourage NPCs to use their own stallions if competitive
        if (stallion.stableId === stable.id) {
          score += 20;
        }

        if (score > bestScore) {
          bestScore = score;
          best = stallion;
        }
      }
      if (!best) continue;

      const elig = canBreed(best, mare, newDay, [...state.pregnancies, ...newPregnancies]);
      if (!elig.ok) continue;

      // Ownership Discount: don't pay stud fees to self
      const studFee = best.stableId === stable.id ? 0 : best.stud!.standingFee;
      const totalCost = BREEDING_FEE + studFee;
      stableCash -= totalCost;

      stables = stables.map((st) => {
        if (st.id === stable.id) return { ...st, cash: st.cash - totalCost };
        // Only credit revenue if it's an external stable
        if (best!.stableId && best!.stableId !== stable.id && st.id === best!.stableId) {
          return { ...st, cash: st.cash + studFee };
        }
        return st;
      });
      horses = horses.map((h) =>
        h.id === best!.id && h.stud
          ? { ...h, stud: { ...h.stud, seasonBookings: h.stud.seasonBookings + 1 } }
          : h,
      );

      // Record breeding decision for AI learning
      recordBreedingDecision(
        aiState,
        best.id,
        mare.id,
        best.name,
        mare.name,
        stable.id,
        stable.personality,
        newDay,
        bestScore,
      );

      const preg: Pregnancy = {
        id: generateUUID(rng),
        sireId: best.id,
        damId: mare.id,
        sireName: best.name,
        damName: mare.name,
        conceivedDay: newDay,
        dueDay: newDay + GESTATION_DAYS,
        resolved: false,
        liveFoalGuarantee: false,
        reBreedingAttempts: 0,
        refunded: false,
      };
      newPregnancies.push(preg);
      logs.push({
        day: newDay,
        text: `${stable.name}: ${best.name} × ${mare.name} (foal due ${preg.dueDay}).`,
      });
    }
  }

  return { horses, npcStables: stables, newPregnancies, logs };
}
