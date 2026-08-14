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

export const MAX_BATCH_BREEDING = 20;

// Breeding program status values
export const PROGRAM_STATUS_ACTIVE = "active" as const;
export const PROGRAM_STATUS_CANCELLED = "cancelled" as const;
export const PROGRAM_STATUS_COMPLETED = "completed" as const;

// Breeding program cancellation reasons
export const CANCEL_REASON_USER = "user" as const;
export const CANCEL_REASON_AUTO = "auto" as const;

// Breeding program identity
export const PLAYER_STABLE_ID = "player";

// Breeding program error messages
export const ERR_NO_ACTIVE_PROGRAM = "No active breeding program.";
export const ERR_PROGRAM_ALREADY_ACTIVE = "A breeding program is already active. Cancel it first.";
export const ERR_MARE_ALREADY_ENROLLED = "Mare is already enrolled in this program.";

// Breeding program log messages
export const FALLBACK_STABLE_NAME = "Your stable";

// Breeding program cancellation UI strings
export const CANCEL_DIALOG_TITLE = "Cancel Breeding Program?";
export const CANCEL_DIALOG_DESCRIPTION = (programName: string) =>
  `This will end the ${programName} program and unenroll all mares. This cannot be undone.`;
export const CANCEL_DIALOG_KEEP = "Keep Program";
export const CANCEL_DIALOG_CONFIRM = "Cancel Program";
export const CANCEL_BUTTON_ARIA_LABEL = "Cancel breeding program";

// Breeding program toast messages
export const TOAST_PROGRAM_CANCELLED = "Breeding program cancelled.";
