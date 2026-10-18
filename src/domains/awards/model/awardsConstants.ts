/**
 * awardsConstants.ts - Constants for awards-related UI components
 *
 * Centralizes magic numbers and hardcoded strings used in the Awards tab
 * and related components (G1WinnerHistory, etc.).
 */

// ============================================================================
// G1 WINNER HISTORY
// ============================================================================

/** Number of decimal places to display for race finish times */
export const TIME_DECIMAL_PLACES = 2;

/** Tab value for the grouped-by-race view in G1WinnerHistory */
export const G1_HISTORY_TAB_BY_RACE = "by-race";

/** Tab value for the chronological view in G1WinnerHistory */
export const G1_HISTORY_TAB_CHRONOLOGICAL = "chronological";

/** Route path for individual horse pages (used in winner links) */
export const HORSE_PAGE_ROUTE = "/stable/$horseId";

/** Empty-state message when no G1 races have been recorded yet */
export const G1_HISTORY_EMPTY_MESSAGE = "No Grade 1 races completed yet.";

/** Section title for the G1 Race Winners card */
export const G1_HISTORY_TITLE = "G1 Race Winners";

/** Singular label for winner count badge */
export const WINNER_LABEL_SINGULAR = "winner";

/** Plural label for winner count badge */
export const WINNER_LABEL_PLURAL = "winners";

/** Singular label for race count in card subtitle */
export const RACE_LABEL_SINGULAR = "race";

/** Plural label for race count in card subtitle */
export const RACE_LABEL_PLURAL = "races";

/** Prefix for year display (e.g. "Y3" for year 3) */
export const YEAR_LABEL_PREFIX = "Y";

/** Label prefix for the latest winner summary in accordion triggers */
export const LATEST_WINNER_PREFIX = "Latest:";

/** Context label for the card subtitle */
export const G1_HISTORY_SUBTITLE_SUFFIX = "on record";

// ============================================================================
// SHARED AWARD UI CONSTANTS
// ============================================================================

/** Threshold above which a category collapses to a compact ×N display */
export const AWARD_COMPACT_THRESHOLD = 5;

/** Route path for award category history pages */
export const AWARD_CATEGORY_ROUTE = "/awards/$category";

// --- TrophyCompactView ---

/** Maximum number of trophy items shown in compact view before overflow */
export const TROPHY_COMPACT_MAX_DISPLAY = 10;

// --- HorseAwardsPanel ---

/** Size (px) of the VisualTrophy in the HOTY highlight section */
export const HOTY_TROPHY_SIZE = 72;

// --- AwardBadge ---

/** Max width (px) for the category name in inline badge variant */
export const AWARD_BADGE_INLINE_MAX_WIDTH = 120;

// --- AwardCeremony ---

/** Number of confetti particles rendered in the ceremony overlay */
export const AWARD_CEREMONY_CONFETTI_COUNT = 20;

/** Max height (px) for the scrollable award winners list in ceremony dialog */
export const AWARD_CEREMONY_LIST_MAX_HEIGHT = 300;

// --- SeasonStandingsWidget ---

/** Maximum number of recent award entries to show in the standings widget */
export const STANDINGS_RECENT_AWARDS_LIMIT = 3;
