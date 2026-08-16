import type { Horse, Stable, GameState } from "@/game/types";
import { isFemaleHorse } from "@/core/horse/gender";
import { calculateOverallRating } from "@/core/horse/stats";
import { runBreedingSimulation } from "@/core/genetics/breedingSimulator";
import { cachedSimulation } from "@/core/genetics/genotypeCache";
import { getArchetypeById } from "@/core/breeding/archetypes";
import { calculateGeneticDistance } from "@/core/breeding/programs";
import { createRng, hashStr, type Rng } from "@/core/common/rng";
import { computeProspectiveCoi } from "@/core/breeding/populationGenetics";
import { canBreed } from "@/core/breeding/eligibility";
import type { EconomicTrend } from "./strategicCoordinator";
import type { BreedingDecision } from "./breedingAI";

export function selectSireForDam(
  dam: Horse,
  candidateSires: Horse[],
  stable: Stable,
  gameState: GameState,
  rng: Rng,
): Horse | null {
  const eligibleSires = candidateSires.filter((sire) => {
    const coi = computeProspectiveCoi(sire, dam);
    if (coi > 0.125) return false;
    const pregnancies = gameState.pregnancies ?? [];
    const breedCheck = canBreed(sire, dam, gameState.day ?? 1, pregnancies);
    if (!breedCheck.ok) return false;
    return true;
  });

  if (eligibleSires.length === 0) return null;

  if (stable.breedingArchetype) {
    const archetype = getArchetypeById(stable.breedingArchetype);
    if (!archetype) {
      return selectSireByTraditionalScoring(dam, eligibleSires, stable, gameState);
    }

    let bestSire: Horse | null = null;
    let bestDistance = 1.0;

    for (const sire of eligibleSires) {
      const simulation = cachedSimulation(sire.id, dam.id, () => {
        const simRng = createRng(hashStr(`breeding-sim:${sire.id}:${dam.id}`));
        return runBreedingSimulation(sire, dam, gameState, simRng);
      });
      const syntheticFoal = {
        stats: {
          speed: simulation.stats.speed.p75,
          stamina: simulation.stats.stamina.p75,
          acceleration: simulation.stats.acceleration.p75,
          consistency: simulation.stats.consistency.p75,
        },
      } as unknown as Horse;

      const distance = calculateGeneticDistance(syntheticFoal, archetype);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSire = sire;
      }
    }

    if (bestSire && bestDistance < 0.5) {
      return bestSire;
    }
  }

  return selectSireByTraditionalScoring(dam, eligibleSires, stable, gameState);
}

function selectSireByTraditionalScoring(
  dam: Horse,
  candidateSires: Horse[],
  stable: Stable,
  gameState: GameState,
): Horse | null {
  if (candidateSires.length === 0) return null;

  const industryMean = gameState.industryMeanEarnings ?? 0;

  const scored = candidateSires.map((sire) => {
    let score = calculateOverallRating(sire);

    const sireEarnings = sire.lifetimeEarnings ?? 0;
    if (industryMean > 0 && sireEarnings > 0) {
      const earningsRatio = sireEarnings / industryMean;
      score += Math.min(15, (earningsRatio - 1) * 10);
    }

    return { sire, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].sire;
}

export function evaluateMareRetirement(
  mare: Horse,
  stable: Stable,
  recentForm: number[],
  industryMeanEarnings?: number,
): { shouldRetire: boolean; reason?: string } {
  if (!isFemaleHorse(mare.gender)) {
    return { shouldRetire: false };
  }

  if (mare.age < 5) return { shouldRetire: false };

  const rating = calculateOverallRating(mare);

  if (mare.age >= 8 && rating < 60) {
    return { shouldRetire: true, reason: "age_decline" };
  }

  if (recentForm.length >= 3) {
    const avgPosition = recentForm.reduce((sum, p) => sum + p, 0) / recentForm.length;
    if (avgPosition > 6 && mare.age >= 6) {
      return { shouldRetire: true, reason: "poor_form" };
    }
  }

  if (industryMeanEarnings !== undefined && industryMeanEarnings > 0 && mare.age >= 6) {
    if (mare.lifetimeEarnings < industryMeanEarnings * 0.3) {
      return { shouldRetire: true, reason: "below_industry_earnings" };
    }
  }

  if (mare.age >= 7 && rating >= 80) {
    return { shouldRetire: true, reason: "high_breeding_value" };
  }

  return { shouldRetire: false };
}

export function getBreedingMarketTiming(trend: EconomicTrend): number {
  const indexDeviation = (trend.yearlingPriceIndex - 100) / 100;
  const multiplier = 1 + Math.max(-0.5, Math.min(0.5, indexDeviation * 2));
  return multiplier;
}

export function hasSyndicateShare(stable: Stable, sire: Horse): boolean {
  const shares = (stable as unknown as { syndicateShares?: Array<{ horseId: string }> })
    .syndicateShares;
  if (!shares) return false;
  return shares.some((s) => s.horseId === sire.id);
}

export function applySyndicatePreference(baseScore: number, stable: Stable, sire: Horse): number {
  if (hasSyndicateShare(stable, sire)) {
    return baseScore * 1.15;
  }
  return baseScore;
}

export function assessGeneticDiversity(
  breedingHistory: BreedingDecision[],
  horses: Map<string, Horse>,
): { averageCoi: number; riskLevel: "low" | "moderate" | "high" } {
  const recentBreedings = breedingHistory.slice(-10);
  if (recentBreedings.length === 0) {
    return { averageCoi: 0, riskLevel: "low" };
  }

  let totalCoi = 0;
  let count = 0;

  for (const decision of recentBreedings) {
    const sire = horses.get(decision.sireId);
    const dam = horses.get(decision.damId);
    if (sire && dam) {
      totalCoi += computeProspectiveCoi(sire, dam);
      count++;
    }
  }

  const averageCoi = count > 0 ? totalCoi / count : 0;

  let riskLevel: "low" | "moderate" | "high" = "low";
  if (averageCoi > 0.08) {
    riskLevel = "high";
  } else if (averageCoi > 0.05) {
    riskLevel = "moderate";
  }

  return { averageCoi, riskLevel };
}
