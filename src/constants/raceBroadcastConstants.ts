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

/** Fixed delta time (seconds) for the physics simulation loop.
 * Must match DEFAULT_DT from @/core/race/engine/constants to ensure
 * live and background simulations produce identical results. */
export const FIXED_DT = 0.1;

/** Maximum number of simulation steps per animation frame. */
export const MAX_STEPS_PER_FRAME = 64;

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
