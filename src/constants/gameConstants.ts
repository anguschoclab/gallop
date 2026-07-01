/**
 * gameConstants.ts - Centralized core game constants
 *
 * This file provides a single source of truth for core game balance constants
 * including prize splits, upkeep costs, starting cash, and calendar constants.
 */

// ============================================================================
// PRIZE MONEY & ECONOMICS
// ============================================================================

/**
 * Prize money distribution for race finishers
 * Index 0 = 1st place (60%), 1 = 2nd place (25%), 2 = 3rd place (10%), 3 = 4th place (5%)
 */
export const PRIZE_SPLIT = [0.6, 0.25, 0.1, 0.05];

/**
 * Prize money distribution for graded races (more to winner)
 * Index 0 = 1st place (70%), 1 = 2nd place (20%), 2 = 3rd place (7.5%), 3 = 4th place (2.5%)
 */
export const GRADED_PRIZE_SPLIT = [0.7, 0.2, 0.075, 0.025];

/**
 * Consignment commission percentage for auctions
 */
export const CONSIGNMENT_COMMISSION = 0.06;

/**
 * Daily upkeep cost per horse
 */
export const UPKEEP_PER_HORSE = 50;

/**
 * Starting cash for new games (default, can be overridden by backstory)
 */
export const STARTING_CASH = 5000;

// ============================================================================
// FACILITY & UPGRADE
// ============================================================================

/**
 * Base cost for facility upgrades
 */
export const FACILITY_UPGRADE_BASE_COST = 5000;

/**
 * Multiplier for each rank level in facility upgrade costs
 */
export const FACILITY_UPGRADE_MULTIPLIER = 1.5;

// ============================================================================
// OUTPOSTS & SPECIALIZATION (Imperial Expansion)
// ============================================================================

/**
 * Base slot capacity for newly constructed outposts
 */
export const OUTPOST_BASE_SLOTS = 12;

/**
 * Transport fatigue increase when shipping horses between outposts
 */
export const TRANSPORT_FATIGUE_SPIKE = 40;

/**
 * Number of days required for transport fatigue to decay fully
 */
export const ACCLIMATIZATION_PERIOD = 7;

// ============================================================================
// RACING & SIMULATION
// ============================================================================

/**
 * Time difference threshold (in seconds) for photo finish determination
 */
export const PHOTO_FINISH_THRESHOLD_SECONDS = 0.05;

/**
 * Fixed time step for race simulation
 */
export const SIMULATION_FIXED_DT = 0.05;

/**
 * Maximum simulation steps per frame
 */
export const SIMULATION_MAX_STEPS_PER_FRAME = 64;

/**
 * Beyer speed figure range
 */
export const BEYER_MIN = 30;
export const BEYER_MAX = 125;

/**
 * Base Beyer figure for calculations
 */
export const BEYER_BASE = 80;

/**
 * Scale divisor factor for translation from par delta to Beyer points
 */
export const BEYER_FORMULA_SCALE = 500;

/**
 * Pattern jump thresholds (Beyer improvement markers)
 */
export const PATTERN_JUMP_AVG_THRESHOLD = 15;
export const PATTERN_JUMP_BEST_THRESHOLD = 10;
export const PATTERN_JUMP_MIN_HISTORY = 2;

/**
 * Stamina drain formula divisors
 */
export const STAMINA_DRAIN_DISTANCE_DIVISOR = 100;
export const STAMINA_DRAIN_BEYER_DIVISOR = 20;

/**
 * Maximum stamina drain from a race
 */
export const STAMINA_DRAIN_MAX = 30;

/**
 * Energy impact from racing
 */
export const RACE_ENERGY_IMPACT = -25;

/**
 * Cornering aptitude modifiers based on horse size
 */
export const CORNERING_APTITUDE_SIZE_LARGE_THRESHOLD = 8;
export const CORNERING_APTITUDE_LARGE_PENALTY = 0.15;
export const CORNERING_APTITUDE_SIZE_SMALL_THRESHOLD = 4;
export const CORNERING_APTITUDE_SMALL_BONUS = 0.1;

// ============================================================================
// FAME & REPUTATION
// ============================================================================

/**
 * Fame gain values for race results
 */
export const FAME_GAIN_G1_WIN = 20;
export const FAME_GAIN_G2_WIN = 15;
export const FAME_GAIN_G3_WIN = 10;
export const FAME_GAIN_OTHER_WIN = 5;
export const FAME_GAIN_G1_TOP3 = 10;
export const FAME_GAIN_G2_TOP3 = 8;
export const FAME_GAIN_G3_TOP3 = 5;
export const FAME_GAIN_OTHER_TOP3 = 2;
export const FAME_GAIN_TOP5 = 1;

/**
 * Fame bonus thresholds for purse sizes
 */
export const FAME_BONUS_LARGE_PURSE = 3;
export const FAME_BONUS_MEDIUM_PURSE = 1;
export const LARGE_PURSE_THRESHOLD = 500000;
export const MEDIUM_PURSE_THRESHOLD = 100000;

/**
 * Maximum fame value
 */
export const MAX_FAME = 100;

/**
 * Hall of Fame induction criteria
 */
export const HALL_OF_FAME_MIN_G1_WINS = 3;
export const HALL_OF_FAME_MIN_EARNINGS = 1000000;

/**
 * Fame threshold for Hall of Fame eligibility
 */
export const HALL_OF_FAME_FAME_THRESHOLD = 85;

// ============================================================================
// DISTANCE & MILESTONES
// ============================================================================

/**
 * Distance milestones for narrative events (in meters)
 */
export const MILESTONE_FINAL_400M = 400;
export const MILESTONE_FINAL_200M = 200;
export const MILESTONE_FINAL_100M = 100;
export const MIN_DISTANCE_FOR_FINAL_400 = 800;
export const MIN_DISTANCE_FOR_FINAL_200 = 600;
export const MIN_DISTANCE_FOR_FINAL_100 = 400;
export const TURN_SEGMENT_LENGTH = 1600;
export const GAP_THRESHOLD_LENGTHS = 2.0;

/**
 * Stretch threshold percentage of race distance
 */
export const STRETCH_THRESHOLD_PERCENT = 0.85;

/**
 * Length conversion scale (meters per length) for commentary
 */
export const METERS_PER_LENGTH = 2.4;

// ============================================================================
// ENERGY & RECOVERY
// ============================================================================

/**
 * Energy thresholds for various actions
 */
export const ENERGY_LOW_THRESHOLD = 40;
export const ENERGY_MODERATE_THRESHOLD = 50;
export const ENERGY_HIGH_THRESHOLD = 60;

/**
 * Recovery points thresholds for horse condition
 */
export const RECOVERY_EXHAUSTED_THRESHOLD = 30;
export const RECOVERY_FATIGUED_THRESHOLD = 50;
export const RECOVERY_FRESH_THRESHOLD = 80;
export const RECOVERY_PEAKING_THRESHOLD = 80;

/**
 * Default recovery points for new horses
 */
export const DEFAULT_RECOVERY_POINTS = 100;

/**
 * Maximum recovery points
 */
export const MAX_RECOVERY_POINTS = 100;

/**
 * Bounce risk thresholds
 */
export const BOUNCE_RISK_BEYER_MARGIN = 15;
export const BOUNCE_RISK_DAYS_THRESHOLD = 28;

// ============================================================================
// STAT & ABILITY
// ============================================================================

/**
 * Ability grade thresholds
 */
export const GRADE_S_THRESHOLD = 90;
export const GRADE_A_THRESHOLD = 80;
export const GRADE_B_THRESHOLD = 70;
export const GRADE_C_THRESHOLD = 60;
export const GRADE_D_THRESHOLD = 50;
export const GRADE_E_THRESHOLD = 25;
export const GRADE_EP_THRESHOLD = 55;

/**
 * Potential rating range for generated horses
 */
export const POTENTIAL_MIN = 50;
export const POTENTIAL_MAX = 90;

/**
 * Horse price rounding value
 */
export const HORSE_PRICE_ROUNDING = 50;

/**
 * Age at which horses start to decline in stud value
 */
export const AGE_STUD_DECLINE = 15;

/**
 * Age at which stud value declines severely
 */
export const AGE_STUD_SEVERE_DECLINE = 18;

/**
 * Low fame threshold for retirement/scouting decisions
 */
export const FAME_LOW_THRESHOLD = 20;

// ============================================================================
// RACE CLASSIFICATION
// ============================================================================

/**
 * Entry fee constants by race type
 */
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

/**
 * Purse constants by race type
 */
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

/**
 * Minimum stat requirements by race type
 */
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

// ============================================================================
// STORAGE LIMITS
// ============================================================================

/**
 * Maximum size for hall of fame history
 */
export const HALL_OF_FAME_MAX_SIZE = 200;

/**
 * Maximum size for season records history
 */
export const SEASON_RECORDS_MAX_SIZE = 500;

/**
 * Maximum number of recent races to consider for AI decisions
 */
export const RECENT_RACES_MAX_COUNT = 5;

/**
 * Inactivity threshold in days for retirement consideration
 */
export const INACTIVITY_RETIREMENT_DAYS = 90;

/**
 * Minimum word length for naming homages
 */
export const NAME_MIN_WORD_LENGTH = 2;

/**
 * Maximum parent name length for pedigree patterns
 */
export const PARENT_NAME_MAX_LENGTH = 10;

/**
 * Maximum training history size
 */
export const TRAINING_HISTORY_MAX_SIZE = 10;

/**
 * Maximum scout reports history size
 */
export const SCOUT_REPORTS_MAX_SIZE = 100;

/**
 * Maximum triple crown history size
 */
export const TRIPLE_CROWN_HISTORY_MAX_SIZE = 100;

/**
 * Maximum pace samples per bucket
 */
export const PACE_SAMPLES_MAX_SIZE = 100;

/**
 * Injury proneness thresholds for pricing modifiers
 */
export const INJURY_PRONENESS_LOW_THRESHOLD = 0.04;
export const INJURY_PRONENESS_HIGH_THRESHOLD = 0.08;

// ============================================================================
// AGE
// ============================================================================

/**
 * Age thresholds for various game mechanics
 */
export const AGE_YOUNG_THRESHOLD = 3;
export const AGE_OLD_THRESHOLD = 7;
export const AGE_RETIREMENT_THRESHOLD = 6;

// ============================================================================
// AUCTION
// ============================================================================

/**
 * Auction premium percentages
 */
export const AUCTION_AGGRESSIVE_PREMIUM = 0.3;
export const AUCTION_2YO_TRAINING_PREMIUM = 0.25;
export const AUCTION_CONSERVATIVE_DISCOUNT = 0.25;
export const AUCTION_YEARLING_PREMIUM = 0.4;
export const AUCTION_WEANLING_PREMIUM = 0.2;
export const AUCTION_RACING_AGE_DISCOUNT = 0.3;
export const AUCTION_WEANLING_DISCOUNT = 0.4;
export const AUCTION_BROODMARE_DISCOUNT = 0.6;
export const AUCTION_FILLY_PREMIUM = 0.6;
export const AUCTION_BROODMARE_PREMIUM = 0.5;
export const AUCTION_RACING_AGE_PREMIUM = 0.3;

/**
 * Auction reserve multipliers by strategy
 */
export const AUCTION_RESERVE_SPECIALIST = 0.75;
export const AUCTION_RESERVE_AGGRESSIVE = 0.35;
export const AUCTION_RESERVE_SPECIALIST_LOW = 0.25;
export const AUCTION_RESERVE_BREEDER = 0.35;
export const AUCTION_RESERVE_CONSERVATIVE = 0.55;
export const AUCTION_RESERVE_ELITE = 0.85;

/**
 * Auction bid thresholds
 */
export const AUCTION_AGGRESSIVE_BID_MIN_PERCENT = 0.88;
export const AUCTION_AGGRESSIVE_BID_VARIANCE = 0.07;

/** Default reserve as a fraction of base value when the player consigns. */
export const DEFAULT_PLAYER_RESERVE_RATIO = 0.7;

// ============================================================================
// RACE CLASSIFICATION
// ============================================================================

/**
 * Race class probability thresholds
 */
export const RACE_CLASS_MAIDEN_PROB = 0.25;
export const RACE_CLASS_ALLOWANCE_PROB = 0.45;
export const RACE_CLASS_HANDICAP_PROB = 0.65;
export const RACE_CLASS_STARTER_ALLOWANCE_PROB = 0.75;
export const RACE_CLASS_STARTER_HANDICAP_PROB = 0.85;
export const RACE_CLASS_MAIDEN_STAKES_PROB = 0.95;

/**
 * Minimum stat requirements for graded races
 */
export const GRADE_G1_MIN_STAT = 78;
export const GRADE_G2_MIN_STAT = 70;
export const GRADE_G3_MIN_STAT = 62;

/**
 * Percentage of claiming races in North America
 */
export const NA_CLAIMING_RACE_PERCENTAGE = 0.7;

// ============================================================================
// HEALTH & INJURY
// ============================================================================

/**
 * Injury recovery day range
 */
export const INJURY_RECOVERY_MIN = 60;
export const INJURY_RECOVERY_MAX = 180;

/**
 * Injury severity thresholds
 */
export const INJURY_SEVERITY_CAREER_ENDING_THRESHOLD = 0.98;
export const INJURY_SEVERITY_MAJOR_THRESHOLD = 0.85;
export const INJURY_SEVERITY_MODERATE_THRESHOLD = 0.6;

/**
 * Injury recovery times by severity
 */
export const INJURY_RECOVERY_CAREER_ENDING = 999;
export const INJURY_RECOVERY_MAJOR_MIN = 60;
export const INJURY_RECOVERY_MAJOR_MAX = 180;
export const INJURY_RECOVERY_MODERATE_MIN = 14;
export const INJURY_RECOVERY_MODERATE_MAX = 42;
export const INJURY_RECOVERY_MINOR = 7;

/**
 * Event-based injury multipliers
 */
export const EVENT_INJURY_MULTIPLIER_RACE = 2.0;
export const EVENT_INJURY_MULTIPLIER_TRAINING = 1.2;
export const FATIGUE_INJURY_THRESHOLD = 50;
export const FATIGUE_INJURY_DIVISOR = 100;
export const ENERGY_INJURY_MULTIPLIER = 1.5;

/**
 * Injury severity threshold
 */
export const INJURY_SEVERITY_THRESHOLD = 0.85;

// ============================================================================
// STORAGE & HISTORY
// ============================================================================

/**
 * Race history limit options
 */
export const RACE_HISTORY_LIMIT_LOW = 10;
export const RACE_HISTORY_LIMIT_MID = 20;
export const RACE_HISTORY_LIMIT_HIGH = 50;

/**
 * Retention days for ungraded race history
 */
export const RACE_HISTORY_UNGRADED_RETENTION_DAYS = 30;

/**
 * Retention days for auction data
 */
export const AUCTION_RETENTION_DAYS = 30;

// ============================================================================
// CALENDAR
// ============================================================================

/**
 * Game calendar constants
 */
export const DAYS_PER_YEAR = 365;
export const DAYS_PER_MONTH = 30;
export const DAYS_PER_WEEK = 7;

/**
 * Number of days in a season (for recalibration intervals)
 */
export const SEASON_DAYS = 30;

/**
 * Cumulative days per month for calendar calculations
 */
export const CUMULATIVE_DAYS_PER_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

// ============================================================================
// SETTINGS
// ============================================================================

/**
 * Auto-simulation day options
 */
export const AUTOSIM_DAYS_OPTIONS = [7, 14, 30, 90];

// ============================================================================
// SIMULATION
// ============================================================================

/**
 * Maximum number of Beyer samples per bucket for par calculation
 */
export const MAX_SAMPLES_PER_BUCKET = 60;

// ============================================================================
// RACE WEIGHT
// ============================================================================

/**
 * Base race weight in pounds for major races
 */
export const BASE_RACE_WEIGHT_LBS = 126;

// ============================================================================
// AI & DECISION THRESHOLDS
// ============================================================================

/**
 * Initialization thresholds for NPC stable setup
 */
export const INITIALIZATION_BUDGET_TIER_THRESHOLD = 0.6;
export const INITIALIZATION_HORSE_COUNT_THRESHOLD = 0.7;

/**
 * AI risk tolerance values by personality type
 */
export const AI_RISK_TOLERANCE_CONSERVATIVE = 35;
export const AI_RISK_TOLERANCE_AGGRESSIVE = 65;
export const AI_RISK_TOLERANCE_WIN_NOW = 55;

/**
 * AI quality thresholds for decision making
 */
export const AI_QUALITY_ELITE_THRESHOLD = 75;
export const AI_QUALITY_MID_THRESHOLD = 65;

/**
 * AI strategic horizon in days
 */
export const AI_STRATEGIC_HORIZON_DAYS = 90;

/**
 * NPC horse generation target counts by stable tier
 */
export const NPC_HORSE_COUNT_ELITE_MIN = 30;
export const NPC_HORSE_COUNT_ELITE_MAX = 40;
export const NPC_HORSE_COUNT_MID_MIN = 20;
export const NPC_HORSE_COUNT_MID_MAX = 30;
export const NPC_HORSE_COUNT_BUDGET_MIN = 15;
export const NPC_HORSE_COUNT_BUDGET_MAX = 25;

// ============================================================================
// ENTRY SCORING & RACING THRESHOLDS
// ============================================================================

/**
 * Entry limits per stable per race
 */
export const MAX_HORSES_PER_STABLE_PER_RACE = 2;

/**
 * Energy threshold for entering races
 */
export const MIN_ENERGY_TO_ENTER = 50;

/**
 * Rating margin a challenger must exceed the weakest entry by to bump it
 */
export const BUMP_RATING_MARGIN = 3;

/**
 * Form consideration - prefer positive form
 */
export const MIN_FORM_TO_ENTER = -3;

/**
 * Distance preference - horses prefer races within this range of their "best" distance
 */
export const PREFERRED_DISTANCE_RANGE = 300; // ±300m from ideal

/**
 * Race invitation system constants
 */
export const DISTANCE_INVITE_THRESHOLD = 400; // meters — max distance from horse's aptitude for at-large invites
export const DEFAULT_INVITE_DAYS_AHEAD = 30; // days before race day to send invites
export const INVITE_AT_LARGE_MULTIPLIER = 2; // max total invites = fieldSize * multiplier

/**
 * Foal development arc milestone offsets (days after birthDay).
 */
export const FOAL_BREAKING_IN_DAY = 18;
export const FOAL_EARLY_WORKOUTS_DAY = 24;
