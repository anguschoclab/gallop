import { clamp } from "@/core/common/math";
import type { Rng } from "@/core/common/types";
import type { Runner, PaceContext } from "./runnerBuilder";
import {
  STAMINA_FADE_START,
  STAMINA_FADE_DURATION,
  DRAFT_STAMINA_PRESERVE,
  PACE_PRESSURE_STAMINA_PENALTY,
  PACE_PRESSER_MITIGATION,
  BLEEDER_RISK_PER_SEC,
  ROANER_RISK_PER_SEC,
  BLEEDER_DISTANCE_THRESHOLD,
  BLEEDER_PROGRESS_THRESHOLD,
  BLEEDER_STAMINA_PENALTY,
  ROANER_SPEED_THRESHOLD,
  ROANER_STAMINA_PENALTY,
  SAVE_TACTICS_PROGRESS_THRESHOLD,
  SAVE_TACTICS_STAMINA_BONUS,
  EARLY_SPEED_PENALTY_THRESHOLD,
  EARLY_SPEED_LANE_THRESHOLD,
  EARLY_SPEED_STAMINA_PENALTY,
} from "@/constants/raceEngineConstants";

export function calculateStaminaMultiplier(
  r: Runner,
  progress: number,
  distance: number,
  pace?: PaceContext,
  rng?: { next: () => number } | Rng,
  dt?: number,
): number {
  let staminaMul = 1;
  if (progress > STAMINA_FADE_START) {
    const linearFade = (progress - STAMINA_FADE_START) / STAMINA_FADE_DURATION;
    const fade = linearFade * linearFade * (3 - 2 * linearFade);
    let effectiveStamina = r.staminaFactor;
    if (r.draftingHorseId) {
      effectiveStamina = effectiveStamina + (1 - effectiveStamina) * DRAFT_STAMINA_PRESERVE;
    }
    if (pace && pace.pacePressure > 0 && r.runningStyle === "E") {
      const isPacePresser = r.jockey?.traits.includes("pace_presser");
      const penalty = isPacePresser
        ? PACE_PRESSURE_STAMINA_PENALTY * PACE_PRESSER_MITIGATION
        : PACE_PRESSURE_STAMINA_PENALTY;
      effectiveStamina = clamp(effectiveStamina - penalty * pace.pacePressure, 0.2, 1);
    }
    const bleederRisk = r.horse.bleederRisk ?? 0;
    if (
      bleederRisk > 0 &&
      distance >= BLEEDER_DISTANCE_THRESHOLD &&
      progress > BLEEDER_PROGRESS_THRESHOLD &&
      rng &&
      dt
    ) {
      const bleederRatePerSec = bleederRisk * BLEEDER_RISK_PER_SEC;
      const pTickBleeder = Math.min(1, 1 - Math.pow(1 - bleederRatePerSec, dt));
      if (rng.next() < pTickBleeder) {
        effectiveStamina = clamp(effectiveStamina - BLEEDER_STAMINA_PENALTY, 0.1, 1);
      }
    }
    const roanerRisk = r.horse.roarerRisk ?? 0;
    if (roanerRisk > 0 && r.velocity > r.topSpeed * ROANER_SPEED_THRESHOLD && rng && dt) {
      const roanerRatePerSec = roanerRisk * ROANER_RISK_PER_SEC;
      const pTickRoaner = Math.min(1, 1 - Math.pow(1 - roanerRatePerSec, dt));
      if (rng.next() < pTickRoaner) {
        effectiveStamina = clamp(effectiveStamina - ROANER_STAMINA_PENALTY, 0.1, 1);
      }
    }

    if (
      r.jockeyInstructions?.ridingStyle === "closer" &&
      r.jockeyInstructions?.moveTiming === "late" &&
      progress < SAVE_TACTICS_PROGRESS_THRESHOLD
    ) {
      effectiveStamina = clamp(effectiveStamina + SAVE_TACTICS_STAMINA_BONUS, 0, 1.1);
    }

    staminaMul = 1 - (1 - effectiveStamina) * fade;
  }

  if (
    r.runningStyle === "E" &&
    progress < EARLY_SPEED_PENALTY_THRESHOLD &&
    r.lane > EARLY_SPEED_LANE_THRESHOLD
  ) {
    staminaMul *= EARLY_SPEED_STAMINA_PENALTY;
  }

  return staminaMul;
}
