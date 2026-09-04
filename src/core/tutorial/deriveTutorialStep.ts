/**
 * deriveTutorialStep — pure function that decides which tutorial beat is current
 * based on real game state. Self-corrects if the player wanders.
 *
 * Beat progression is driven by `completedBeats` in the TutorialState, not by
 * inspecting game state directly. The UI calls `completeTutorialBeat(beat)` when
 * the player performs the beat's action (visits a horse, enters a race, etc.).
 */

import type { GameState } from "@/game/types";
import type { NextAction } from "@/core/dashboard/nextAction";
import { TOTAL_TUTORIAL_BEATS } from "./tutorialTypes";

export interface TutorialStep {
  beat: number;
  label: string;
  detail: string;
  to: string;
  params?: Record<string, string>;
}

const BEAT_DEFINITIONS: Omit<TutorialStep, "beat">[] = [
  {
    label: "Meet your stable",
    detail: "Open any horse's page to see its stats and condition",
    to: "/horse-gallery",
  },
  {
    label: "Enter your first race",
    detail: "Find a race for one of your horses and enter it",
    to: "/racing",
  },
  {
    label: "Watch it run",
    detail: "On race day, watch the live broadcast",
    to: "/racing",
  },
  {
    label: "Read the result — what a Beyer is",
    detail: "The Beyer speed figure measures how fast your horse ran",
    to: "/racing",
  },
  {
    label: "Advance the day",
    detail: "Move the season forward to reach your next race",
    to: "/",
  },
];

export function deriveTutorialStep(state: Partial<GameState>): TutorialStep | null {
  const tutorial = state.tutorial;
  if (!tutorial) return null;
  if (!tutorial.tutorialActive || tutorial.skipped) return null;
  if (tutorial.completedBeats.length >= TOTAL_TUTORIAL_BEATS) return null;

  const nextBeat = tutorial.completedBeats.length;
  if (nextBeat >= TOTAL_TUTORIAL_BEATS) return null;

  const def = BEAT_DEFINITIONS[nextBeat];
  return { beat: nextBeat, ...def };
}

export function tutorialStepToAction(step: TutorialStep): NextAction {
  return {
    kind: "advance", // Tutorial uses the advance icon; the label differentiates it
    label: step.label,
    detail: step.detail,
    to: step.to,
    params: step.params,
  };
}
