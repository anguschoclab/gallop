/**
 * raceBroadcastConstants.ts — Magic numbers for the race broadcast UI layer.
 *
 * Extracted from useRaceUIState.ts and useLiveRaceSimulation.ts to eliminate
 * hardcoded values.
 */

/** Interval (ms) at which the commentary drain loop checks the message queue. */
export const COMMENTARY_DRAIN_INTERVAL_MS = 100;

/** Minimum gap (ms) between consecutive commentary messages (pacing gate). */
export const COMMENTARY_PACING_MS = 1500;

/** Maximum number of commentary lines retained in the visible feed. */
export const COMMENTARY_SLICE_CAP = 50;

/** Time (ms) before the subject-horse highlight clears after a message. */
export const SUBJECT_HIGHLIGHT_CLEAR_MS = 3000;

/** Time (ms) after which a live widget is considered stale and shows a warning. */
export const STALE_DATA_THRESHOLD_MS = 5000;

/** Time (ms) after which a live widget transitions from green "fresh" to yellow "warning". */
export const FRESHNESS_WARNING_THRESHOLD_MS = 3000;

/** Fractional positions at which split times are recorded. */
export const SPLIT_FRACTIONS = [0.25, 0.5, 0.75, 1.0] as const;

// --- Leaderboard UI constants ---

/** Minimum value on the Beyer filter slider. */
export const BEYER_SLIDER_MIN = 0;

/** Maximum value on the Beyer filter slider. */
export const BEYER_SLIDER_MAX = 120;

/** Step size for the Beyer filter slider. */
export const BEYER_SLIDER_STEP = 5;

/** Decimal places shown for finish times in the leaderboard. */
export const FINISH_TIME_DECIMALS = 1;

/** Inline hint text shown when horses are level and tie-breaking is active. */
export const TIE_BREAK_HINT_TEXT = "⚡ Horses level — order held by tie-break";

// --- RNG isolation constants ---

/** XOR mask applied to the race-id hash to derive a distinct seed for the
 *  NarrativeGenerator RNG, so commentary rng.next() calls don't advance the
 *  simulation RNG. */
export const NARRATIVE_RNG_XOR_MASK = 0x6e61;

// --- Track layout constants ---

/** Height of each lane in the track view (px). */
export const TRACK_LANE_HEIGHT = 48;

/** Extra padding added to track height beyond the lanes (px). */
export const TRACK_HEIGHT_PADDING = 20;

/** Top offset for the first lane in the track view (px). */
export const TRACK_TOP_OFFSET = 10;

/** Ratio of race distance to viewport width (zoom factor). */
export const TRACK_VIEWPORT_DISTANCE_RATIO = 0.6;

/** Tile width of the repeating track background (px). */
export const TRACK_BG_TILE_WIDTH = 512;

/** Interval (metres) between distance markers on the track. */
export const TRACK_DISTANCE_MARKER_INTERVAL = 200;

/** Screen percentage below which a marker/runner is off-screen left. */
export const TRACK_OFFSCREEN_PCT_MIN = -10;

/** Screen percentage above which a marker/runner is off-screen right. */
export const TRACK_OFFSCREEN_PCT_MAX = 110;

/** Distance from the finish line (metres) within which the finish line is active. */
export const FINISH_LINE_PROXIMITY = 100;

/** Duration (ms) of the horse finish-pop animation. */
export const HORSE_FINISH_POP_MS = 500;

// --- Velocity badge thresholds (field-relative) ---

/** Velocity ratio (runner / field mean) at or above which the badge turns success-green. */
export const VELOCITY_BADGE_FAST_RATIO = 1.06;

/** Velocity ratio (runner / field mean) at or above which the badge turns warning-amber. */
export const VELOCITY_BADGE_OK_RATIO = 0.97;

/** CSS colour for the fast velocity badge. */
export const VELOCITY_BADGE_FAST_COLOR = "var(--color-success, #22c55e)";

/** CSS colour for the mid-pack velocity badge. */
export const VELOCITY_BADGE_OK_COLOR = "var(--color-warning, #f59e0b)";

/** CSS colour for the slow velocity badge. */
export const VELOCITY_BADGE_SLOW_COLOR = "oklch(0.65 0.2 25)";

// --- Fading / kicking indicator thresholds ---

/** Race progress fraction above which a runner can be considered fading. */
export const FADING_PROGRESS_THRESHOLD = 0.7;

/** Velocity ratio (runner / topSpeed) below which a runner is fading. */
export const FADING_VELOCITY_RATIO = 0.75;

/** Race progress fraction above which a late-kicking closer badge appears. */
export const KICKING_PROGRESS_THRESHOLD = 0.85;

/** Distance (metres) from the leader within which the LEADING badge shows. */
export const LEADING_PROXIMITY_METRES = 2;
