/**
 * breedingConstants.ts - Centralized breeding, genetic, and stud constants
 */

export const MARE_RECOVERY_DAYS = 60;
export const MIN_BREEDING_AGE = 3;
export const MAX_DAM_AGE = 20;
export const AGE_BREEDING_MAX = 21;

export const BREEDING_FEE = 2000;
export const LIVE_FOAL_GUARANTEE_FEE = 1000;
export const GESTATION_DAYS = 30;

// Genetic & Breeding Weights/Thresholds
export const GENETIC_TRAIT_WEIGHT = 0.25;
export const GENETIC_COMPATIBILITY_EXCELLENT_THRESHOLD = 0.8;
export const GENETIC_COMPATIBILITY_GOOD_THRESHOLD = 0.6;
export const GENETIC_COMPATIBILITY_MODERATE_THRESHOLD = 0.4;
export const DEFAULT_GENETIC_DIVERSITY = 0.5;
export const DEFAULT_TRAIT_SCORE = 0.5;

// Inbreeding calculation factors
export const INBREEDING_DIVERSITY_HIGH = 0.8;
export const INBREEDING_DIVERSITY_MODERATE = 0.6;
export const INBREEDING_DIVERSITY_LOW = 0.4;
export const INBREEDING_DIVERSITY_VERY_LOW = 0.2;
export const INBREEDING_EXPECTED_MAX_ANCESTORS = 30;
export const INBREEDING_SCORE_BONUS = 0.2;

// Stud fees and sizes
export const STUD_FEE_MID = 12000;
export const STUD_BOOK_SIZE_MID = 120;
export const STUD_FEE_ROUNDING = 100;
export const STUD_FEE_MIN = 500;

// Blue hen scoring multipliers
export const BLUE_HEN_STAKES_WINNER_MULTIPLIER = 15;
export const BLUE_HEN_STAKES_WINNER_CAP = 60;
export const BLUE_HEN_G1_WINNER_MULTIPLIER = 20;

// Foaling complications and risks
export const FOALING_AGE_RISK_THRESHOLD = 10;
export const FOALING_AGE_RISK_MULTIPLIER = 0.02;
export const FOALING_BASE_COMPLICATION_RATE = 0.01;
export const LETHAL_RECESSIVE_CHANCE = 0.25;
export const TWIN_REDUCTION_CHANCE = 0.005;
