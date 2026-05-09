/**
 * personalityModifiers.ts - Personality-based modifiers
 *
 * This file provides personality-based modifiers for race entry decisions,
 * adjusting base suitability scores based on personality traits.
 *
 * Dependencies: @/game/types (Horse, Race, Stable, StablePersonality), ./stableConfig (PERSONALITY_CONFIG)
 * Related files: ../ai/raceEntryAI.ts (uses modifiers), stableConfig.ts (provides config)
 */

import type { Horse, Race, Stable, StablePersonality } from "@/game/types";
import { PERSONALITY_CONFIG } from "./stableConfig";

/**
 * Apply personality-based modifiers to race entry decisions
 * These modifiers adjust the base suitability score based on personality traits
 */
export function applyPersonalityModifiers(
  baseScore: number,
  horse: Horse,
  race: Race,
  stable: Stable,
): number {
  const personality = PERSONALITY_CONFIG[stable.personality];
  let score = baseScore;

  // Risk tolerance modifier for class gap
  if (race.minStat) {
    const overall = horse.stats.speed + horse.stats.stamina + horse.stats.acceleration;
    const gap = overall - race.minStat;

    // Risk-takers are more willing to enter underqualified or overqualified horses
    if (gap < -5) {
      score *= 1 + personality.riskTolerance * 0.2; // Bonus for taking risk on underqualified
    } else if (gap > 15) {
      score *= 1 - personality.riskTolerance * 0.1; // Penalty for overqualified (wasted effort)
    }
  }

  // Youth preference modifier
  if (horse.age <= 3 && personality.youthPreference > 0.7) {
    score *= 1.2; // Developers get bonus for young horses
  } else if (horse.age >= 5 && personality.youthPreference < 0.3) {
    score *= 1.15; // Win-now stables get bonus for proven horses
  }

  // Graded race affinity
  if (race.graded?.grade) {
    const gradeBonus = personality.gradedRaceBonus / 20;
    score *= 1 + gradeBonus * 0.15;
  }

  // Genetic insight modifier for unproven horses
  if (horse.raceHistory.length < 3 && personality.geneticInsightMod > 0.8) {
    score *= 1.1; // High genetic insight stables give bonus to unproven horses with good DNA
  }

  return score;
}

/**
 * Get form tolerance threshold based on personality
 * Aggressive stables tolerate worse form than conservative stables
 */
export function getFormTolerance(personality: StablePersonality): number {
  const config = PERSONALITY_CONFIG[personality];
  return -3 + config.riskTolerance * 2; // Range: -3 to -1
}

/**
 * Get race entry frequency modifier based on personality
 * Affects how many races a stable enters overall
 */
export function getEntryFrequencyModifier(personality: StablePersonality): number {
  const config = PERSONALITY_CONFIG[personality];
  return config.raceEntryMod; // Range: 0.7 to 1.5
}

/**
 * Get claiming race preference based on personality
 * Traders love claiming races, others avoid them
 */
export function getClaimingPreference(personality: StablePersonality): number {
  if (personality === "trader") return 1.3;
  if (personality === "conservative") return 0.7;
  if (personality === "prestige") return 0.5;
  return 1.0;
}

/**
 * Get purse sensitivity based on personality
 * How much purse size affects entry decisions
 */
export function getPurseSensitivity(personality: StablePersonality): number {
  const config = PERSONALITY_CONFIG[personality];
  return config.purseThresholdMod; // Range: 0.6 to 1.3
}
