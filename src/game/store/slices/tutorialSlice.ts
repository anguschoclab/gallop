/**
 * store/slices/tutorialSlice.ts - Tutorial state slice
 *
 * Manages the guided first-session tutorial state. The tutorial is a 5-beat
 * sequence delivered through the NextActionBanner rail. Progress is tracked
 * via completedBeats and derived from real game state.
 */

import type { TutorialState } from "@/core/tutorial/tutorialTypes";
import { createDefaultTutorialState, TOTAL_TUTORIAL_BEATS } from "@/core/tutorial/tutorialTypes";
import type { GameStateCreator } from "../types";

export type TutorialSlice = {
  /** Mark a tutorial beat as completed and advance currentBeat */
  completeTutorialBeat: (beat: number) => void;
  /** Skip the tutorial entirely */
  skipTutorial: () => void;
  /** Acknowledge the Beyer explainer (beat 3 completion) */
  acknowledgeBeyerExplainer: () => void;
  /** Reset tutorial to default state (for "Replay tutorial" setting) */
  resetTutorial: () => void;
};

export const createTutorialSlice: GameStateCreator<TutorialSlice> = (set) => ({
  completeTutorialBeat: (beat) => {
    set((state) => {
      if (!state.tutorial) return {};
      if (state.tutorial.completedBeats.includes(beat)) return {};
      const completedBeats = [...state.tutorial.completedBeats, beat];
      const allDone = completedBeats.length >= TOTAL_TUTORIAL_BEATS;
      return {
        tutorial: {
          ...state.tutorial,
          completedBeats,
          currentBeat: allDone ? TOTAL_TUTORIAL_BEATS : completedBeats.length,
          tutorialActive: !allDone,
        },
      };
    });
  },

  skipTutorial: () => {
    set((state) => {
      if (!state.tutorial) return {};
      return {
        tutorial: {
          ...state.tutorial,
          skipped: true,
          tutorialActive: false,
        },
      };
    });
  },

  acknowledgeBeyerExplainer: () => {
    set((state) => {
      if (!state.tutorial) return {};
      return {
        tutorial: {
          ...state.tutorial,
          beyerExplainerAcknowledged: true,
        },
      };
    });
  },

  resetTutorial: () => {
    set({ tutorial: createDefaultTutorialState() });
  },
});
