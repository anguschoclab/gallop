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

/** Fixed delta time (seconds) for the physics simulation loop. */
export const FIXED_DT = 0.05;

/** Maximum number of simulation steps per animation frame. */
export const MAX_STEPS_PER_FRAME = 64;

/** Fractional positions at which split times are recorded. */
export const SPLIT_FRACTIONS = [0.25, 0.5, 0.75, 1.0] as const;
