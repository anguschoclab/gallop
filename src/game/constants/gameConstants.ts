/**
 * gameConstants.ts - Centralized game constants
 *
 * This file provides a single source of truth for all game balance constants
 * including prize splits, upkeep costs, training costs, starting cash, and calendar constants.
 *
 * Dependencies: None (self-contained constants)
 * Related files: Used throughout the game for balance calculations
 */

/**
 * Centralized game constants
 * Single source of truth for all game balance constants
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
 * Jockey fee percentage of winnings
 */
export const JOCKEY_FEE_PERCENTAGE = 0.1;

/**
 * Base jockey riding fee when not specified
 */
export const BASE_JOCKEY_RIDING_FEE = 100;

/**
 * Consignment commission percentage for auctions
 */
export const CONSIGNMENT_COMMISSION = 0.06;

/**
 * Daily upkeep cost per horse
 */
export const UPKEEP_PER_HORSE = 50;

/**
 * Cost per training session
 */
export const TRAINING_COST = 75;

/**
 * Starting cash for new games (default, can be overridden by backstory)
 */
export const STARTING_CASH = 5000;

/**
 * Base breeding fee
 */
export const BREEDING_FEE = 2000;

// ============================================================================
// GENETIC & BREEDING
// ============================================================================

/**
 * Weight for each genetic trait in compatibility scoring
 */
export const GENETIC_TRAIT_WEIGHT = 0.25;

/**
 * Genetic compatibility score thresholds
 */
export const GENETIC_COMPATIBILITY_EXCELLENT_THRESHOLD = 0.8;
export const GENETIC_COMPATIBILITY_GOOD_THRESHOLD = 0.6;
export const GENETIC_COMPATIBILITY_MODERATE_THRESHOLD = 0.4;

/**
 * Default genetic diversity value when not specified
 */
export const DEFAULT_GENETIC_DIVERSITY = 0.5;

/**
 * Default trait score when not specified
 */
export const DEFAULT_TRAIT_SCORE = 0.5;

/**
 * Inbreeding diversity ratio thresholds
 */
export const INBREEDING_DIVERSITY_HIGH = 0.8;
export const INBREEDING_DIVERSITY_MODERATE = 0.6;
export const INBREEDING_DIVERSITY_LOW = 0.4;

/**
 * Expected maximum number of ancestors for inbreeding calculation
 */
export const INBREEDING_EXPECTED_MAX_ANCESTORS = 30;

/**
 * Bonus added to inbreeding score when diversity is high
 */
export const INBREEDING_SCORE_BONUS = 0.2;

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
export const AGE_BREEDING_MAX = 21;

/**
 * Peak age range for horses
 */
export const PEAK_AGE_MIN = 3;
export const PEAK_AGE_MAX = 7;

// ============================================================================
// JOCKEY
// ============================================================================

/**
 * Jockey salary ranges by tier
 */
export const JOCKEY_SALARY_ELITE_MIN = 75;
export const JOCKEY_SALARY_ELITE_MAX = 98;
export const JOCKEY_SALARY_MID_MIN = 55;
export const JOCKEY_SALARY_MID_MAX = 80;
export const JOCKEY_SALARY_BUDGET_MIN = 35;
export const JOCKEY_SALARY_BUDGET_MAX = 60;

/**
 * Jockey age range for generation
 */
export const JOCKEY_AGE_MIN = 18;
export const JOCKEY_AGE_MAX = 53;

/**
 * Jockey contract duration in days
 */
export const JOCKEY_CONTRACT_DAYS = 90;

/**
 * Jockey retainer contract duration in days
 */
export const JOCKEY_RETAINER_DAYS = 180;

/**
 * Jockey bonus multipliers by contract type
 */
export const JOCKEY_RETAINER_BONUS_MULTIPLIER = 100;
export const JOCKEY_PER_RACE_BONUS_MULTIPLIER = 30;

/**
 * Jockey fame thresholds for reputation tiers
 */
export const JOCKEY_FAME_TALKED_ABOUT = 35;
export const JOCKEY_FAME_WORKMANLIKE = 45;
export const JOCKEY_FAME_HOUSEHOLD_NAME = 60;

// ============================================================================
// STUD & BREEDING
// ============================================================================

/**
 * Mid-tier stud fee and book size
 */
export const STUD_FEE_MID = 12000;
export const STUD_BOOK_SIZE_MID = 120;

/**
 * Stud fee rounding value
 */
export const STUD_FEE_ROUNDING = 100;

/**
 * Minimum stud fee
 */
export const STUD_FEE_MIN = 500;

/**
 * Blue hen score calculation multipliers
 */
export const BLUE_HEN_STAKES_WINNER_MULTIPLIER = 15;
export const BLUE_HEN_STAKES_WINNER_CAP = 60;
export const BLUE_HEN_G1_WINNER_MULTIPLIER = 20;

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
 * Additional fee for live foal guarantee
 */
export const LIVE_FOAL_GUARANTEE_FEE = 1000;

/**
 * Gestation period in days
 */
export const GESTATION_DAYS = 30;

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
// PHASE ORDER
// ============================================================================

/**
 * Phase order constants for game simulation pipeline
 */
export const PHASE_ORDER_INTENT_COLLECTION = 5;
export const PHASE_ORDER_PRIVATE_SALE_EXPIRY = 3;
export const PHASE_ORDER_INTENT_VALIDATION = 10;
export const PHASE_ORDER_MANAGEMENT_RESOLUTION = 10;
export const PHASE_ORDER_RACE_ENTRY_RESOLUTION = 15;
export const PHASE_ORDER_CONSIGNMENT_RESOLUTION = 16;
export const PHASE_ORDER_UPKEEP = 20;
export const PHASE_ORDER_BREEDING_RESOLUTION = 25;
export const PHASE_ORDER_PURCHASE_RESOLUTION = 35;
export const PHASE_ORDER_BREEDING_SEASON = 35;
export const PHASE_ORDER_NPC_BREEDING = 38;
export const PHASE_ORDER_AGING = 30;
export const PHASE_ORDER_ENERGY = 40;
export const PHASE_ORDER_TRAINING_RESOLUTION = 45;
export const PHASE_ORDER_JOCKEY_PHASE = 45;
export const PHASE_ORDER_INDUSTRY_METRICS = 45;
export const PHASE_ORDER_MARKET = 50;
export const PHASE_ORDER_RACES = 60;
export const PHASE_ORDER_NPC_CLAIMING = 62;
export const PHASE_ORDER_CLAIMING_WITHDRAWAL = 67;
export const PHASE_ORDER_BEYER_RECALIBRATION = 65;
export const PHASE_ORDER_RACE_RESOLUTION = 70;
export const PHASE_ORDER_PREGNANCY = 70;
export const PHASE_ORDER_LEADERBOARD = 72;
export const PHASE_ORDER_CLAIM_RESOLUTION = 75;
export const PHASE_ORDER_NPC_CYCLE = 80;
export const PHASE_ORDER_SCHEDULER = 85;
export const PHASE_ORDER_AUCTIONS = 90;
export const PHASE_ORDER_AWARDS = 95;
export const PHASE_ORDER_STATE_UPDATE = 100;
export const PHASE_ORDER_STALLION_RETIREMENT = 145;
export const PHASE_ORDER_PASTURE_RETIREMENT = 150;
export const PHASE_ORDER_HALL_OF_FAME = 155;
export const PHASE_ORDER_HORSE_DEATH = 160;
export const PHASE_ORDER_ARCHIVING = 190;
export const PHASE_ORDER_IMPACT_APPLICATION = 200;

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
