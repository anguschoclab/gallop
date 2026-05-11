import type { Horse } from "@/game/types";
import { TRAIT_SCORE } from "@/core/genetics/phenotype";
import {
  GENETIC_TRAIT_WEIGHT,
  DEFAULT_GENETIC_DIVERSITY,
  GENETIC_COMPATIBILITY_EXCELLENT_THRESHOLD,
  GENETIC_COMPATIBILITY_GOOD_THRESHOLD,
  GENETIC_COMPATIBILITY_MODERATE_THRESHOLD,
  DEFAULT_TRAIT_SCORE,
} from "@/game/constants/gameConstants";

/**
 * Calculate genetic compatibility based on horse genome research.
 *
 * Based on the Wikipedia article on Horse Genome which identified:
 * - Genes governing sensory perception, signal transduction, and immunity
 * - Breed-specific genetic variations (1 million SNPs cataloged)
 * - Leopard complex (Lp) gene linked to TRPM1 and CSNB risk
 *
 * @param sire - The sire horse data
 * @param dam - The dam horse data
 * @returns Object containing compatibility score, description, and warnings
 */
export function calculateGeneticCompatibility(
  sire: Horse,
  dam: Horse,
): { score: number; description: string; warning?: string } {
  const sireGenetics = sire.geneticMarkers || {};
  const damGenetics = dam.geneticMarkers || {};

  let score = 0;
  const warnings: string[] = [];

  // Evaluate sensory perception genes
  const sensoryScore = evaluateGeneticTrait(
    sireGenetics.sensoryPerception,
    damGenetics.sensoryPerception,
  );
  score += sensoryScore * GENETIC_TRAIT_WEIGHT;

  // Evaluate signal transduction genes
  const signalScore = evaluateGeneticTrait(
    sireGenetics.signalTransduction,
    damGenetics.signalTransduction,
  );
  score += signalScore * GENETIC_TRAIT_WEIGHT;

  // Evaluate immunity genes
  const immunityScore = evaluateGeneticTrait(sireGenetics.immunity, damGenetics.immunity);
  score += immunityScore * GENETIC_TRAIT_WEIGHT;

  // Evaluate genetic diversity (breed-specific variations)
  const sireDiversity = sireGenetics.geneticDiversity || DEFAULT_GENETIC_DIVERSITY;
  const damDiversity = damGenetics.geneticDiversity || DEFAULT_GENETIC_DIVERSITY;
  const avgDiversity = (sireDiversity + damDiversity) / 2;
  score += avgDiversity * GENETIC_TRAIT_WEIGHT;

  // Check for Leopard complex (Lp) homozygous risk
  if (sireGenetics.leopardComplex === "dominant" && damGenetics.leopardComplex === "dominant") {
    warnings.push("Both parents homozygous for Leopard complex - high CSNB risk in foal");
  }

  // Check for covering sickness transmission risk
  // Based on Wikipedia: Covering sickness is a sexually transmitted disease
  if (sire.healthStatus === "covering_sickness" || dam.healthStatus === "covering_sickness") {
    warnings.push(
      "High risk of covering sickness (dourine) transmission - sexually transmitted disease with 50%+ mortality",
    );
  }

  let description = "Moderate genetic compatibility";
  if (score >= GENETIC_COMPATIBILITY_EXCELLENT_THRESHOLD) description = "Excellent genetic compatibility";
  else if (score >= GENETIC_COMPATIBILITY_GOOD_THRESHOLD) description = "Good genetic compatibility";
  else if (score >= GENETIC_COMPATIBILITY_MODERATE_THRESHOLD) description = "Moderate genetic compatibility";
  else description = "Poor genetic compatibility";

  return {
    score,
    description,
    warning: warnings.length > 0 ? warnings.join("; ") : undefined,
  };
}

/**
 * Helper to evaluate a genetic trait score from parental traits.
 *
 * @param sireTrait - Genetic trait identifier for sire
 * @param damTrait - Genetic trait identifier for dam
 * @returns Averaged trait score (0-1)
 */
function evaluateGeneticTrait(sireTrait: string | undefined, damTrait: string | undefined): number {
  const sireValue = TRAIT_SCORE[sireTrait || "fair"] ?? DEFAULT_TRAIT_SCORE;
  const damValue = TRAIT_SCORE[damTrait || "fair"] ?? DEFAULT_TRAIT_SCORE;
  return (sireValue + damValue) / 2;
}
