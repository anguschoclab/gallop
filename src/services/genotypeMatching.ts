import type { Horse } from "@/game/types";
import { TRAIT_SCORE } from "@/core/genetics/phenotype";

/**
 * Calculate genetic compatibility based on horse genome research
 * Based on the Wikipedia article on Horse Genome which identified:
 * - Genes governing sensory perception, signal transduction, and immunity
 * - Breed-specific genetic variations (1 million SNPs cataloged)
 * - Leopard complex (Lp) gene linked to TRPM1 and CSNB risk
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
  score += sensoryScore * 0.25;

  // Evaluate signal transduction genes
  const signalScore = evaluateGeneticTrait(
    sireGenetics.signalTransduction,
    damGenetics.signalTransduction,
  );
  score += signalScore * 0.25;

  // Evaluate immunity genes
  const immunityScore = evaluateGeneticTrait(sireGenetics.immunity, damGenetics.immunity);
  score += immunityScore * 0.25;

  // Evaluate genetic diversity (breed-specific variations)
  const sireDiversity = sireGenetics.geneticDiversity || 0.5;
  const damDiversity = damGenetics.geneticDiversity || 0.5;
  const avgDiversity = (sireDiversity + damDiversity) / 2;
  score += avgDiversity * 0.25;

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
  if (score >= 0.8) description = "Excellent genetic compatibility";
  else if (score >= 0.6) description = "Good genetic compatibility";
  else if (score >= 0.4) description = "Moderate genetic compatibility";
  else description = "Poor genetic compatibility";

  return {
    score,
    description,
    warning: warnings.length > 0 ? warnings.join("; ") : undefined,
  };
}

function evaluateGeneticTrait(sireTrait: string | undefined, damTrait: string | undefined): number {
  const sireValue = TRAIT_SCORE[sireTrait || "fair"] ?? 0.5;
  const damValue = TRAIT_SCORE[damTrait || "fair"] ?? 0.5;
  return (sireValue + damValue) / 2;
}
