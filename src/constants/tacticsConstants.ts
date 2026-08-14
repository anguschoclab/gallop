/**
 * tacticsConstants.ts - Centralized tactics and jockey instruction constants
 */

// Aggressiveness scale
export const AGGRESSIVENESS_MIN = 0;
export const AGGRESSIVENESS_MAX = 100;
export const AGGRESSIVENESS_STEP = 5;
export const AGGRESSIVENESS_DEFAULT = 50;

// Aggressiveness label thresholds
export const AGGRESSIVENESS_CONSERVATIVE_MAX = 30;
export const AGGRESSIVENESS_MODERATE_MAX = 50;
export const AGGRESSIVENESS_AGGRESSIVE_MAX = 70;

// Style bonus calculation
export const STAT_BASELINE = 50;
export const FRONT_RUNNER_MULTIPLIER = 0.1;
export const CLOSER_MULTIPLIER = 0.1;
export const STALKER_MULTIPLIER = 0.08;
export const TACTICAL_BALANCE_THRESHOLD = 10;
export const TACTICAL_BALANCED_BONUS = 2;
export const STYLE_BONUS_MIN = 0;
export const STYLE_BONUS_MAX = 5;

// UI feedback
export const TACTICS_SAVED_FEEDBACK_MS = 2000;
