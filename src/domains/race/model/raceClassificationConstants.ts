export const ENTRY_MAIDEN = 100;
export const ENTRY_MAIDEN_SPECIAL_WEIGHT = 150;
export const ENTRY_MAIDEN_CLAIMING = 100;
export const ENTRY_MAIDEN_OPTIONAL_CLAIMING = 120;
export const ENTRY_MAIDEN_STAKES = 500;
export const ENTRY_ALLOWANCE = 300;
export const ENTRY_OPTIONAL_CLAIMING = 350;
export const ENTRY_STARTER_ALLOWANCE = 250;
export const ENTRY_STARTER_HANDICAP = 200;
export const ENTRY_STAKES = 800;
export const ENTRY_CLAIMING = 150;
export const ENTRY_HANDICAP = 400;
export const ENTRY_LISTED = 1500;
export const ENTRY_GROUP = 2000;

export const PURSE_MAIDEN = 2000;
export const PURSE_MAIDEN_SPECIAL_WEIGHT = 3000;
export const PURSE_MAIDEN_CLAIMING = 2000;
export const PURSE_MAIDEN_OPTIONAL_CLAIMING = 2500;
export const PURSE_MAIDEN_STAKES = 10000;
export const PURSE_ALLOWANCE = 6000;
export const PURSE_OPTIONAL_CLAIMING = 7000;
export const PURSE_STARTER_ALLOWANCE = 5000;
export const PURSE_STARTER_HANDICAP = 4500;
export const PURSE_STAKES = 18000;
export const PURSE_CLAIMING = 3000;
export const PURSE_HANDICAP = 8000;
export const PURSE_LISTED = 40000;
export const PURSE_GROUP = 50000;

export const MINSTAT_MAIDEN_SPECIAL_WEIGHT = 40;
export const MINSTAT_MAIDEN_OPTIONAL_CLAIMING = 35;
export const MINSTAT_MAIDEN_STAKES = 45;
export const MINSTAT_ALLOWANCE = 50;
export const MINSTAT_OPTIONAL_CLAIMING = 52;
export const MINSTAT_STARTER_ALLOWANCE = 48;
export const MINSTAT_STARTER_HANDICAP = 45;
export const MINSTAT_STAKES = 65;
export const MINSTAT_CLAIMING = 40;
export const MINSTAT_HANDICAP = 55;
export const MINSTAT_LISTED = 72;
export const MINSTAT_GROUP = 78;

export const RACE_CLASS_MAIDEN_PROB = 0.25;
export const RACE_CLASS_ALLOWANCE_PROB = 0.45;
export const RACE_CLASS_HANDICAP_PROB = 0.65;
export const RACE_CLASS_STARTER_ALLOWANCE_PROB = 0.75;
export const RACE_CLASS_STARTER_HANDICAP_PROB = 0.85;
export const RACE_CLASS_MAIDEN_STAKES_PROB = 0.95;

export const GRADE_G1_MIN_STAT = 78;
export const GRADE_G2_MIN_STAT = 70;
export const GRADE_G3_MIN_STAT = 62;

export const NA_CLAIMING_RACE_PERCENTAGE = 0.7;

export const DEFAULT_FIELD_SIZE = 14;

export const RACE_GRADES = ["G1", "G2", "G3"] as const;

export const MINIMUM_RACE_ENTRIES = 2;

// ============================================================================
// MAIDEN GUARANTEE
// ============================================================================

/** Start day for ensureMaidenRaces during game initialization */
export const MAIDEN_GUARANTEE_START_DAY = 2;

/** End day for ensureMaidenRaces during game initialization */
export const MAIDEN_GUARANTEE_END_DAY = 7;

// ============================================================================
// 2YO RACE GUARANTEE
// ============================================================================

/** Age restriction for 2yo-only races */
export const TWOYO_AGE = 2;

/** Distance band boundaries (in meters) for 2yo race coverage */
export const TWOYO_DISTANCE_BANDS = {
  sprint: { min: 1000, max: 1399 },
  mile: { min: 1400, max: 1799 },
  route: { min: 1800, max: 2200 },
} as const;

/** Number of days ahead to check/generate 2yo race coverage (matches upcoming race window) */
export const TWOYO_GUARANTEE_LOOKAHEAD_DAYS = 7;

/** Default field size for generated 2yo races */
export const TWOYO_RACE_FIELD_SIZE_MIN = 6;
export const TWOYO_RACE_FIELD_SIZE_MAX = 8;

/** Min stat for 2yo MaidenSpecialWeight races (lower than standard MSW) */
export const TWOYO_MSW_MIN_STAT = 30;

/** Entry fee for generated 2yo races */
export const TWOYO_RACE_ENTRY_FEE = 150;

/** Purse for generated 2yo races */
export const TWOYO_RACE_PURSE = 3000;

// ============================================================================
// GRADED RACE ENTRY FEES
// ============================================================================

export const GRADED_ENTRY_FEE_G1 = 2500;
export const GRADED_ENTRY_FEE_G2 = 1500;
export const GRADED_ENTRY_FEE_G3 = 1000;

export const DEFAULT_GRADED_FIELD_SIZE = 12;

// ============================================================================
// RACE CLASS PROBABILITY THRESHOLDS (cumulative)
// ============================================================================

export const RACE_CLASS_MAIDEN_CLAIMING_PROB = 0.3;
export const RACE_CLASS_CLAIMING_PROB = 0.5;
export const RACE_CLASS_STAKES_PROB = 0.6;
export const RACE_CLASS_OPTIONAL_CLAIMING_PROB = 0.7;
export const RACE_CLASS_MAIDEN_SPECIAL_WEIGHT_PROB = 0.8;
export const RACE_CLASS_MAIDEN_OPTIONAL_CLAIMING_PROB = 0.9;
export const RACE_CLASS_LISTED_PROB = 0.98;

// ============================================================================
// RACE FIELD SIZE RANGES
// ============================================================================

export const RACE_FIELD_SIZE_MIN = 6;
export const RACE_FIELD_SIZE_MAX = 8;

export const MAIDEN_FIELD_SIZE_MIN = 6;
export const MAIDEN_FIELD_SIZE_MAX = 8;

export const NA_FIELD_SIZE_MIN = 6;
export const NA_FIELD_SIZE_MAX = 10;

export const EUROPE_FIELD_SIZE_MIN = 8;
export const EUROPE_FIELD_SIZE_MAX = 14;

export const AUSTRALIA_FIELD_SIZE_MIN = 10;
export const AUSTRALIA_FIELD_SIZE_MAX = 16;

export const ASIA_FIELD_SIZE_MIN = 10;
export const ASIA_FIELD_SIZE_MAX = 16;

export const SA_FIELD_SIZE_MIN = 8;
export const SA_FIELD_SIZE_MAX = 12;

// ============================================================================
// MAIDEN GUARANTEE
// ============================================================================

export const MAIDEN_GUARANTEE_DAY_OF_YEAR_LIMIT = 60;

// ============================================================================
// REGIONAL PURSE & DISTANCE MULTIPLIERS
// ============================================================================

export const EUROPE_PURSE_MULTIPLIER = 1.2;
export const EUROPE_MIN_DISTANCE = 1600;

export const AUSTRALIA_PURSE_MULTIPLIER = 1.1;
export const AUSTRALIA_SPRINT_PROBABILITY = 0.6;
export const AUSTRALIA_SPRINT_DIST_MIN = 1000;
export const AUSTRALIA_SPRINT_DIST_MAX = 1400;

export const ASIA_ENTRY_FEE_MULTIPLIER = 1.5;
export const ASIA_PURSE_MULTIPLIER = 2.0;
export const ASIA_MINSTAT_BONUS = 10;

// ============================================================================
// CLAIMING PURSE CALCULATION
// ============================================================================

export const CLAIMING_PURSE_MULTIPLIER = 2;
export const OPTIONAL_CLAIMING_PURSE_MULTIPLIER = 2.5;
export const CLAIMING_PURSE_BONUS_MAX = 5000;

export const SA_CLAIMING_PURSE_MULTIPLIER = 1.5;
export const SA_CLAIMING_PURSE_BONUS_MAX = 2000;
