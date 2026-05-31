/**
 * jockeyConstants.ts - Centralized jockey and affinity constants
 */

export const JOCKEY_FEE_PERCENTAGE = 0.1;
export const BASE_JOCKEY_RIDING_FEE = 100;

// Jockey salary ranges by tier
export const JOCKEY_SALARY_ELITE_MIN = 75;
export const JOCKEY_SALARY_ELITE_MAX = 98;
export const JOCKEY_SALARY_MID_MIN = 55;
export const JOCKEY_SALARY_MID_MAX = 80;
export const JOCKEY_SALARY_BUDGET_MIN = 35;
export const JOCKEY_SALARY_BUDGET_MAX = 60;

// Jockey age range for generation
export const JOCKEY_AGE_MIN = 18;
export const JOCKEY_AGE_MAX = 53;

// Jockey contract durations
export const JOCKEY_CONTRACT_DAYS = 90;
export const JOCKEY_RETAINER_DAYS = 180;

// Jockey bonus multipliers
export const JOCKEY_RETAINER_BONUS_MULTIPLIER = 100;
export const JOCKEY_PER_RACE_BONUS_MULTIPLIER = 30;

// Jockey fame thresholds
export const JOCKEY_FAME_TALKED_ABOUT = 35;
export const JOCKEY_FAME_WORKMANLIKE = 45;
export const JOCKEY_FAME_HOUSEHOLD_NAME = 60;

// Jockey-Horse relationship affinity levels ("The Hand")
export const AFFINITY_LEVEL_FAMILIAR = 50;
export const AFFINITY_LEVEL_TRUSTED = 150;
export const AFFINITY_LEVEL_BONDED = 400;
export const AFFINITY_LEVEL_SOULMATES = 1000;

// Affinity XP gains
export const AFFINITY_XP_PER_RACE = 20;
export const AFFINITY_XP_PER_WORKOUT = 10;
export const AFFINITY_XP_PER_WIN_BONUS = 10;
export const AFFINITY_XP_POOR_RACE_PENALTY = -10; // Penalty for finishing outside top 10

// Affinity bonus values
export const AFFINITY_BONUS_FAMILIAR = 0.02;
export const AFFINITY_BONUS_TRUSTED = 0.05;
export const AFFINITY_BONUS_BONDED = 0.1;
export const AFFINITY_BONUS_SOULMATES = 0.15;
