/**
 * runnerConditionThresholds.ts — Centralized thresholds for in-running condition
 * derivation and mood scoring.
 *
 * All numeric thresholds used by `deriveRunnerConditions` and `deriveRunnerMood`
 * in `src/core/race/runnerConditions.ts` are defined here so they can be tuned
 * in one place without hunting through logic branches.
 */

// ── Flying ──────────────────────────────────────────────────────────────────

/** Field ratio at which a runner is considered "flying" (≥ this value). */
export const FLYING_FIELD_RATIO = 1.06;

/** Fade ratio above which a runner is still "on the bridle" (> this value). */
export const FLYING_FADE_RATIO = 0.97;

/** Maximum velocity rank (1 = fastest) for a runner to be tagged "Flying".
 *  Ensures the badge is rare — only the fastest runner(s) in the field can
 *  earn it, not everyone above a fixed speed. */
export const FLYING_MAX_VELOCITY_RANK = 2;

// ── Battling ────────────────────────────────────────────────────────────────

/** Maximum gap (metres) to nearest rival for battling condition. */
export const BATTLING_MAX_GAP = 1.8;

/** Minimum race progress for battling condition. */
export const BATTLING_MIN_PROGRESS = 0.45;

/** Maximum velocity difference between rivals for battling condition. */
export const BATTLING_MAX_VELOCITY_DIFF = 0.45;

/** Minimum field ratio for battling condition. */
export const BATTLING_MIN_FIELD_RATIO = 0.98;

// ── Boxed In ────────────────────────────────────────────────────────────────

/** Minimum metres ahead for a rival to block the runner. */
export const BLOCKED_MIN_AHEAD = 0.3;

/** Maximum metres ahead for a rival to block the runner. */
export const BLOCKED_MAX_AHEAD = 3.2;

/** Maximum lane difference for a rival to be considered blocking. */
export const BLOCKED_MAX_LANE_DIFF = 1;

/** Minimum race progress for boxed-in condition. */
export const BOXED_MIN_PROGRESS = 0.3;

/** Maximum race progress for boxed-in condition. */
export const BOXED_MAX_PROGRESS = 0.95;

// ── Distressed / In Trouble ─────────────────────────────────────────────────

/** Fade ratio below which a runner is in severe difficulty (< this value). */
export const DISTRESSED_FADE_RATIO = 0.8;

/** Field ratio below which a runner is struggling, combined with progress check. */
export const DISTRESSED_FIELD_RATIO = 0.88;

/** Minimum race progress for distressed-by-field-ratio condition. */
export const DISTRESSED_MIN_PROGRESS = 0.5;

// ── Flagging ────────────────────────────────────────────────────────────────

/** Fade ratio below which a runner is flagging (< this value). */
export const FLAGGING_FADE_RATIO = 0.92;

/** Field ratio below which a runner is flagging (< this value). */
export const FLAGGING_FIELD_RATIO = 0.99;

/** Minimum race progress for flagging condition. */
export const FLAGGING_MIN_PROGRESS = 0.35;

// ── Grinding ────────────────────────────────────────────────────────────────

/** Minimum race progress for grinding condition. */
export const GRINDING_MIN_PROGRESS = 0.7;

/** Minimum field ratio for grinding condition. */
export const GRINDING_MIN_FIELD_RATIO = 0.99;

/** Fade ratio below which a runner is grinding (< this value). */
export const GRINDING_FADE_RATIO = 1.02;

/** Maximum lengths behind leader for grinding condition. */
export const GRINDING_MAX_LENGTHS_BEHIND = 6;

// ── Settled ─────────────────────────────────────────────────────────────────

/** Minimum race progress for settled condition. */
export const SETTLED_MIN_PROGRESS = 0.1;

/** Maximum race progress for settled condition. */
export const SETTLED_MAX_PROGRESS = 0.6;

/** Maximum deviation of field ratio from 1.0 for settled condition. */
export const SETTLED_FIELD_RATIO_TOLERANCE = 0.04;

// ── Mood scoring ────────────────────────────────────────────────────────────

/** Base mood score before adjustments. */
export const MOOD_BASE_SCORE = 60;

/** Score bonus for front-runner handy on the pace. */
export const MOOD_HANDY_BONUS = 18;

/** Score penalty for front-runner stranded off the lead. */
export const MOOD_STRANDED_PENALTY = 20;

/** Score bonus for closer dropped out and covered up. */
export const MOOD_COVERED_BONUS = 14;

/** Score penalty for closer making running too soon. */
export const MOOD_TOO_SOON_PENALTY = 18;

/** Score bonus for midfield tracking the pace. */
export const MOOD_MIDFIELD_BONUS = 12;

/** Score bonus for travelling strongly above field average. */
export const MOOD_TRAVELLING_BONUS = 15;

/** Score penalty for flagging (mild fade). */
export const MOOD_FLAGGING_PENALTY = 14;

/** Score penalty for distressed (severe fade). */
export const MOOD_DISTRESSED_PENALTY = 28;

/** Score penalty for boxed-in condition. */
export const MOOD_BOXED_PENALTY = 15;

/** Score penalty for battling condition. */
export const MOOD_BATTLING_PENALTY = 5;

/** Score penalty for ailing condition. */
export const MOOD_AILING_PENALTY = 30;

// Mood — running style thresholds

/** Lengths back at which a front-runner is considered "handy" (≤ this value). */
export const MOOD_HANDY_LENGTHS = 1.5;

/** Lengths back at which a front-runner is considered "stranded" (> this value). */
export const MOOD_STRANDED_LENGTHS = 7;

/** Lengths back at which a closer is comfortable when dropped out (≥ this value). */
export const MOOD_COVERED_LENGTHS = 4;

/** Lengths back at which a closer is too close to the lead (≤ this value). */
export const MOOD_TOO_SOON_LENGTHS = 1;

/** Upper bound of midfield "tracking" zone (< this value). */
export const MOOD_MIDFIELD_MAX_LENGTHS = 6;

/** Progress threshold below which a race is still in the "early" phase. */
export const MOOD_EARLY_PHASE_PROGRESS = 0.6;

// Mood — temperament thresholds

/** Temperament at or above which a horse is "placid" (≥ this value). */
export const MOOD_PLACID_TEMPERAMENT = 70;

/** Temperament below which a horse is "fretful" (< this value). */
export const MOOD_FRETFUL_TEMPERAMENT = 40;

/** Tolerance multiplier for placid temperament. */
export const MOOD_PLACID_TOLERANCE = 0.6;

/** Tolerance multiplier for fretful temperament. */
export const MOOD_FRETFUL_TOLERANCE = 1.3;

/** Default tolerance multiplier when temperament is moderate. */
export const MOOD_DEFAULT_TOLERANCE = 1;

// Mood — face thresholds

/** Mood score at or above which the face is "happy" (≥ this value). */
export const MOOD_HAPPY_THRESHOLD = 66;

/** Mood score at or above which the face is "neutral" (≥ this value). */
export const MOOD_NEUTRAL_THRESHOLD = 42;

// Mood — score bounds

/** Minimum clamped mood score. */
export const MOOD_MIN_SCORE = 0;

/** Maximum clamped mood score. */
export const MOOD_MAX_SCORE = 100;

// Mood — display constants

/** Tooltip delay (ms) for the RunnerMoodFace hover tooltip. */
export const MOOD_TOOLTIP_DELAY_MS = 150;

/** Default pixel size for the RunnerMoodFace icon. */
export const MOOD_FACE_DEFAULT_SIZE = 16;

/** Pixel size for the RunnerMoodFace icon in the ResultOverlay. */
export const MOOD_FACE_RESULT_OVERLAY_SIZE = 14;

/** Maximum number of signals shown in the RunnerMoodFace tooltip (full list in breakdown). */
export const MOOD_TOOLTIP_MAX_SIGNALS = 3;

/** Label for the default signal when no mood signals were generated. */
export const MOOD_DEFAULT_SIGNAL_LABEL = "Going about its business without fuss";

/** Contribution value for the default signal (neutral). */
export const MOOD_DEFAULT_SIGNAL_CONTRIBUTION = 0;

// Mood — SVG face geometry

/** SVG viewBox dimension for the mood face icon. */
export const MOOD_SVG_VIEWBOX = 24;

/** SVG circle radius for the mood face background. */
export const MOOD_SVG_FACE_RADIUS = 12;

/** SVG x-coordinate for the left eye. */
export const MOOD_SVG_LEFT_EYE_X = 8.4;

/** SVG x-coordinate for the right eye. */
export const MOOD_SVG_RIGHT_EYE_X = 15.6;

/** SVG y-coordinate for both eyes. */
export const MOOD_SVG_EYE_Y = 9.4;

/** SVG radius for each eye. */
export const MOOD_SVG_EYE_RADIUS = 1.7;

/** SVG stroke width for mouth paths. */
export const MOOD_SVG_STROKE_WIDTH = 1.8;

/** SVG fill color for eyes and mouth. */
export const MOOD_SVG_INK_COLOR = "#111827";

/** z-index class for the mood tooltip when rendered inside a modal overlay. */
export const MOOD_TOOLTIP_OVERLAY_CLASS = "z-[60]";
