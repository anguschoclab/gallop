import type { Horse } from "@/game/types";
import { TRAIT_SCORE } from "@/core/genetics/phenotype";

/**
 * Calculate conformation compatibility between a sire and a dam.
 * Conformation is the single most important factor for physical soundness.
 *
 * @param sire - The stallion
 * @param dam - The mare
 * @returns Score and descriptive summary
 */
export function calculateConformationCompatibility(
  sire: Horse,
  dam: Horse,
): { score: number; description: string } {
  let sireRaw =
    typeof sire.conformation === "number"
      ? sire.conformation
      : TRAIT_SCORE[sire.conformation || "fair"];
  let damRaw =
    typeof dam.conformation === "number"
      ? dam.conformation
      : TRAIT_SCORE[dam.conformation || "fair"];

  const sireValue = sireRaw > 1 ? sireRaw / 100 : sireRaw;
  const damValue = damRaw > 1 ? damRaw / 100 : damRaw;

  // Both parents should have good conformation
  const avgValue = (sireValue + damValue) / 2;

  let description = "Average conformation";
  if (avgValue >= 0.875) description = "Excellent conformation on both sides";
  else if (avgValue >= 0.625) description = "Good conformation";
  else if (avgValue >= 0.375) description = "Fair conformation";
  else description = "Poor conformation - risk factor";

  return { score: avgValue, description };
}

/**
 * Calculate temperament compatibility between a sire and a dam.
 * Temperament is important for racehorse confidence and focus.
 *
 * @param sire - The stallion
 * @param dam - The mare
 * @returns Score and descriptive summary
 */
export function calculateTemperamentCompatibility(
  sire: Horse,
  dam: Horse,
): { score: number; description: string } {
  let sireRaw =
    typeof sire.temperament === "number"
      ? sire.temperament
      : TRAIT_SCORE[sire.temperament || "fair"];
  let damRaw =
    typeof dam.temperament === "number" ? dam.temperament : TRAIT_SCORE[dam.temperament || "fair"];

  const sireValue = sireRaw > 1 ? sireRaw / 100 : sireRaw;
  const damValue = damRaw > 1 ? damRaw / 100 : damRaw;

  const avgValue = (sireValue + damValue) / 2;

  let description = "Average temperament";
  if (avgValue >= 0.875) description = "Excellent temperament on both sides";
  else if (avgValue >= 0.625) description = "Good temperament";
  else if (avgValue >= 0.375) description = "Fair temperament";
  else description = "Poor temperament - may affect performance";

  return { score: avgValue, description };
}
