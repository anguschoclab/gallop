export const INITIALIZATION_BUDGET_TIER_THRESHOLD = 0.6;
export const INITIALIZATION_HORSE_COUNT_THRESHOLD = 0.7;

export const AI_RISK_TOLERANCE_CONSERVATIVE = 35;
export const AI_RISK_TOLERANCE_AGGRESSIVE = 65;
export const AI_RISK_TOLERANCE_WIN_NOW = 55;

export const AI_QUALITY_ELITE_THRESHOLD = 75;
export const AI_QUALITY_MID_THRESHOLD = 65;

export const AI_STRATEGIC_HORIZON_DAYS = 90;

export const NPC_HORSE_COUNT_ELITE_MIN = 30;
export const NPC_HORSE_COUNT_ELITE_MAX = 40;
export const NPC_HORSE_COUNT_MID_MIN = 20;
export const NPC_HORSE_COUNT_MID_MAX = 30;
export const NPC_HORSE_COUNT_BUDGET_MIN = 15;
export const NPC_HORSE_COUNT_BUDGET_MAX = 25;

export const DEFAULT_SUBSYSTEM_WEIGHT = 1.0;

export const CONSIGN_UNDERPERFORMER_RATING_THRESHOLD = 40;

export const CONSIGN_UNDERPERFORMER_AGE_THRESHOLD = 5;

export const CONSIGN_RATING_RELAXATION_PER_WEIGHT = 20;

export const CONSIGN_AGE_RELAXATION_PER_WEIGHT = 2;

export const BID_BASE_THRESHOLD = 50;

export const HORSE_RATING_TO_VALUE_MULTIPLIER = 1000;

export const PURCHASE_BASE_THRESHOLD = 50;

export const PURCHASE_CASH_BUFFER_MULTIPLIER = 1.1;

export const FACILITY_UPGRADE_BASE_THRESHOLD = 50;

export const CONSIGNMENT_INTENT_PRIORITY = 40;

export const DIFFICULTY_ADJUSTMENT_PERIOD = 30;

// --- AI Learning Module ---

/** Default success rate when no learning data is available (50%). */
export const DEFAULT_SUCCESS_RATE = 0.5;
/** Minimum data points before learning overrides take effect. */
export const LEARNING_MIN_DATA_POINTS = 5;
/** Number of top sires to surface in breeding AI summaries. */
export const TOP_SIRES_COUNT = 5;

// --- Jockey Style Selection ---

/** Success rate threshold for jockey style learning override (65%). */
export const JOCKEY_STYLE_LEARNING_RATE_THRESHOLD = 0.65;
/** Scale factor for adaptive bonus based on learned success rate. */
export const JOCKEY_ADAPTIVE_BONUS_SCALE = 15;

// --- Personality System ---

/** Initial strategy confidence for a new personality AI state. */
export const DEFAULT_STRATEGY_CONFIDENCE = 0.5;
/** Floor for strategy confidence after adaptation penalties. */
export const STRATEGY_CONFIDENCE_FLOOR = 0.1;
/** Confidence below which a strategy switch is triggered. */
export const STRATEGY_SWITCH_THRESHOLD = 0.3;
/** Confidence reset value after a strategy switch. */
export const STRATEGY_SWITCH_RESET_CONFIDENCE = 0.6;
/** Factor by which conservatism lowers the adaptation threshold. */
export const CONSERVATISM_THRESHOLD_FACTOR = 0.2;
/** Factor by which innovation boosts novelty scores. */
export const INNOVATION_BOOST_FACTOR = 0.5;
/** Competitor success rate above which conservative avoidance kicks in. */
export const COMPETITOR_SUCCESS_HIGH_THRESHOLD = 0.7;
/** Competitor success rate below which innovation competition kicks in. */
export const COMPETITOR_SUCCESS_LOW_THRESHOLD = 0.3;
/** Factor by which conservatism reduces modifier when competitors succeed. */
export const CONSERVATISM_AVOID_FACTOR = 0.3;
/** Factor by which innovation increases modifier when competitors fail. */
export const INNOVATION_COMPETE_FACTOR = 0.2;
