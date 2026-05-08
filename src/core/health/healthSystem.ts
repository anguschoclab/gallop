import type { Horse } from "@/game/types";
import type { Rng } from "@/game/rng";
import type { InjuryImpact } from "@/core/resolver/impacts";
import { generateUUID } from "@/game/uuid";
import type { StaffMember } from "@/core/staff/staffTypes";

/**
 * Injury severity levels
 */
export type InjurySeverity = "minor" | "moderate" | "major" | "career-ending";

/**
 * Roll for potential injury during a race
 * Factors in horse genetics, current energy, surface, and staff bonuses
 */
export function rollForInjury(
  rng: Rng,
  horse: Horse,
  day: number,
  hiredStaff: StaffMember[] = []
): InjuryImpact | null {
  // Get vet bonus
  const vet = hiredStaff.find(s => s.role === 'veterinarian' && s.stableId === (horse.stableId || ""));
  const vetBonus = vet ? vet.bonusValue : 0;

  // Base injury chance (0.1%)
  let baseChance = 0.001;

  // Factor in energy (low energy increases risk)
  if (horse.energy < 30) baseChance *= 3;
  else if (horse.energy < 50) baseChance *= 1.5;

  // Factor in genetics
  const bleederRisk = horse.genotype?.health?.bleeder || 0;
  const ocdRisk = horse.ocdRisk || 0;
  baseChance += (bleederRisk + ocdRisk) * 0.01;

  // Reduce by vet bonus
  baseChance *= (1 - vetBonus);

  if (rng.next() < baseChance) {
    // Injury occurred!
    const roll = rng.next();
    let severity: InjurySeverity = "minor";
    let recoveryDays = rng.int(7, 14);
    let type = "Soft tissue strain";

    if (roll > 0.98) {
      severity = "career-ending";
      recoveryDays = 999;
      type = "Fractured sesamoid";
    } else if (roll > 0.9) {
      severity = "major";
      recoveryDays = rng.int(60, 120);
      type = "Bowed tendon";
    } else if (roll > 0.7) {
      severity = "moderate";
      recoveryDays = rng.int(21, 45);
      type = "Splint bone inflammation";
    }

    return {
      id: generateUUID(),
      intentId: "", // Generated during resolution
      day,
      phase: "raceResolution",
      logLevel: "always",
      type: "injury",
      horseId: horse.id,
      severity,
      injuryType: type,
      recoveryDays,
      reason: `Injury sustained during race: ${type} (${severity})`,
    };
  }

  return null;
}
