/**
 * healthSystem.ts - Health and injury system
 *
 * This file provides functions for rolling for injuries during races, calculating
 * injury severity, and determining recovery times based on horse genetics,
 * energy levels, weather/track conditions, and staff bonuses.
 *
 * Dependencies: @/game/types (Horse), @/game/rng (Rng), @/game/uuid (generateUUID), @/core/resolver/impacts/index (InjuryImpact), @/core/staff/staffTypes (StaffMember)
 * Related files: resolver/impacts/index.ts (provides InjuryImpact type)
 */

import type { Horse } from "@/game/types";
import type { Rng } from "@/game/rng";
import type { InjuryImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { Weather, TrackCondition } from "@/game/types";
import type { SimWeatherPattern } from "@/core/weather/weatherTypes";

/**
 * Injury severity levels.
 */
export type InjurySeverity = "minor" | "moderate" | "major" | "career-ending";

/**
 * Race-day environmental context that can amplify injury risk.
 *
 * Any field is optional — missing fields are treated as neutral.
 */
export interface InjuryWeatherContext {
  /** Legacy race weather enum. */
  weather?: Weather;
  /** Sim-level pattern (more granular — distinguishes rain vs storm). */
  pattern?: SimWeatherPattern;
  /** Track condition (heavy/yielding/soft worsen footing). */
  trackCondition?: TrackCondition;
  /** Daytime temperature in Celsius. <0 freezing, >32 scorching. */
  tempC?: number;
  /** Sustained wind speed in km/h. >40 noticeably raises risk. */
  windKph?: number;
  /** Snow on the surface. Treated as a severe footing hazard. */
  snow?: boolean;
}

/**
 * Compute a multiplier on base injury chance from weather/track conditions.
 *
 * Returns 1.0 when the environment is benign.
 */
export function computeWeatherInjuryMultiplier(ctx: InjuryWeatherContext | undefined): number {
  if (!ctx) return 1;
  let mult = 1;

  // Pattern (storm > rain > shower > overcast)
  switch (ctx.pattern) {
    case "storm":
      mult *= 2.0;
      break;
    case "rain":
      mult *= 1.5;
      break;
    case "shower":
      mult *= 1.2;
      break;
    case "overcast":
      mult *= 1.05;
      break;
  }

  // Legacy weather fallback if pattern not provided
  if (!ctx.pattern && ctx.weather === "rainy") mult *= 1.4;

  // Track condition (footing hazard)
  switch (ctx.trackCondition) {
    case "heavy":
      mult *= 1.6;
      break;
    case "yielding":
      mult *= 1.3;
      break;
    case "soft":
      mult *= 1.2;
      break;
  }

  // Snow on track — severe slip/strain hazard
  if (ctx.snow) mult *= 1.8;

  // Temperature extremes
  if (typeof ctx.tempC === "number") {
    if (ctx.tempC <= 0) mult *= 1.6; // freezing / snow-likely
    else if (ctx.tempC <= 5) mult *= 1.25; // very cold
    else if (ctx.tempC >= 35) mult *= 1.5; // scorching
    else if (ctx.tempC >= 30) mult *= 1.2; // hot
  }

  // Wind
  if (typeof ctx.windKph === "number") {
    if (ctx.windKph >= 60) mult *= 1.4;
    else if (ctx.windKph >= 40) mult *= 1.2;
    else if (ctx.windKph >= 25) mult *= 1.05;
  }

  return mult;
}

/**
 * Roll for potential injury during a race.
 *
 * Factors in horse genetics, current energy, surface, weather, track condition,
 * and staff bonuses to determine if an injury occurs and its severity.
 *
 * @param rng - Random number generator
 * @param horse - The horse to check for injury
 * @param day - Current game day
 * @param hiredStaff - Optional list of hired staff for bonuses
 * @param weatherCtx - Optional weather/track context that amplifies risk
 * @returns Injury impact if injury occurred, null otherwise
 *
 * @example
 * const injury = rollForInjury(rng, horse, currentDay, staff, { pattern: "storm" });
 */
export function rollForInjury(
  rng: Rng,
  horse: Horse,
  day: number,
  hiredStaff: StaffMember[] = [],
  weatherCtx?: InjuryWeatherContext,
): InjuryImpact | null {
  // Get vet bonus
  const vet = hiredStaff.find(
    (s) => s.role === "veterinarian" && s.stableId === (horse.stableId || ""),
  );
  const vetBonus = vet ? vet.bonusValue : 0;

  // Base injury chance (0.1%)
  let baseChance = 0.001;

  // Factor in energy (low energy increases risk)
  if (horse.energy < 30) baseChance *= 3;
  else if (horse.energy < 50) baseChance *= 1.5;

  // Factor in genetics
  const bleederLocus = horse.genotype?.health?.bleeder || [0, 0];
  const bleederRisk = (bleederLocus[0] + bleederLocus[1]) / 2;
  const ocdRisk = horse.ocdRisk || 0;
  baseChance += (bleederRisk + ocdRisk) * 0.01;

  // Weather / track condition multiplier
  const weatherMult = computeWeatherInjuryMultiplier(weatherCtx);
  baseChance *= weatherMult;

  // Reduce by vet bonus
  baseChance *= 1 - vetBonus;

  if (rng.next() < baseChance) {
    // Injury occurred!
    const roll = rng.next();

    // Adverse weather also raises the *severity* odds — catastrophic injuries
    // (race-ending) become a bit easier when conditions are bad. Catastrophic
    // threshold is bumped down baseline (0.98 → 0.96) and shifts further with
    // weather, so a small fraction of injuries that would have been "major"
    // now turn career-ending.
    const severityShift = Math.max(0, (weatherMult - 1) * 0.04);
    const catastrophicThreshold = 0.96 - severityShift;
    const majorThreshold = 0.88 - severityShift * 0.5;
    const moderateThreshold = 0.68 - severityShift * 0.25;

    let severity: InjurySeverity = "minor";
    let recoveryDays = rng.int(7, 14);
    let type = "Soft tissue strain";

    if (roll > catastrophicThreshold) {
      severity = "career-ending";
      recoveryDays = 999;
      type = "Fractured sesamoid";
    } else if (roll > majorThreshold) {
      severity = "major";
      recoveryDays = rng.int(60, 120);
      type = "Bowed tendon";
    } else if (roll > moderateThreshold) {
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
