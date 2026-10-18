/**
 * Tutorial system types for the guided first-session coach.
 *
 * The tutorial is a 5-beat sequence delivered through the NextActionBanner rail.
 * Progress is derived from real game state (not a click counter), so the guide
 * self-corrects if the player wanders.
 */

export interface TutorialState {
  /** Whether the tutorial is currently active */
  tutorialActive: boolean;
  /** Current beat index (0-based) — derived from completedBeats but cached for UI */
  currentBeat: number;
  /** Beats the player has completed */
  completedBeats: number[];
  /** Whether the player skipped the tutorial */
  skipped: boolean;
  /** Whether the Beyer explainer has been acknowledged (beat 3) */
  beyerExplainerAcknowledged: boolean;
}

export const TOTAL_TUTORIAL_BEATS = 5;

export function createDefaultTutorialState(): TutorialState {
  return {
    tutorialActive: true,
    currentBeat: 0,
    completedBeats: [],
    skipped: false,
    beyerExplainerAcknowledged: false,
  };
}
