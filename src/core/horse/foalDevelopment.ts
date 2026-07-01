/**
 * core/horse/foalDevelopment.ts — Foal-to-racehorse development arc.
 *
 * Defines the FoalDevelopmentArc value object stored on Horse. The arc gates
 * newly-born foals through two time-based milestones (Breaking In and Early
 * Workouts) that each present the player with three meaningful stat-shaping
 * choices. Milestones are triggered by `foalDevelopmentPhase` on the day
 * `birthDay + <offset>` and resolved via the `resolveFoalMilestone` store action.
 */

import { FOAL_BREAKING_IN_DAY, FOAL_EARLY_WORKOUTS_DAY } from "@/constants";
import type { HorseStats } from "./types";

export type FoalMilestoneKey = "breaking_in" | "early_workouts";
export type MilestoneStatus = "pending" | "resolved" | "expired";

export type MilestoneStatDelta = Partial<
  Pick<HorseStats, "speed" | "stamina" | "acceleration" | "consistency">
>;

export interface MilestoneChoice {
  key: string;
  label: string;
  description: string;
  delta: MilestoneStatDelta;
}

export interface FoalMilestone {
  key: FoalMilestoneKey;
  label: string;
  /** Absolute game day the milestone becomes available. */
  triggerDay: number;
  status: MilestoneStatus;
  choices: MilestoneChoice[];
  resolvedChoiceKey?: string;
  resolvedOnDay?: number;
}

export interface FoalDevelopmentArc {
  milestones: FoalMilestone[];
}

/**
 * Build the default two-milestone arc for a freshly-born foal.
 * @param birthDay The game day the foal was born.
 */
export function createDefaultFoalDevelopmentArc(birthDay: number): FoalDevelopmentArc {
  return {
    milestones: [
      {
        key: "breaking_in",
        label: "Breaking In",
        triggerDay: birthDay + FOAL_BREAKING_IN_DAY,
        status: "pending",
        choices: [
          {
            key: "bold_approach",
            label: "Bold Approach",
            description: "Push the foal hard in early sessions. Builds speed and acceleration.",
            delta: { speed: 2, acceleration: 2, stamina: -1 },
          },
          {
            key: "patient_method",
            label: "Patient Method",
            description: "Slow, trust-building sessions. Builds consistency and stamina.",
            delta: { consistency: 2, stamina: 2, speed: -1 },
          },
          {
            key: "natural_progression",
            label: "Natural Progression",
            description: "Let the foal set the pace. Balanced development across all stats.",
            delta: { speed: 1, stamina: 1, acceleration: 1 },
          },
        ],
      },
      {
        key: "early_workouts",
        label: "Early Workouts",
        triggerDay: birthDay + FOAL_EARLY_WORKOUTS_DAY,
        status: "pending",
        choices: [
          {
            key: "sprint_focus",
            label: "Sprint Focus",
            description: "Short, explosive work sets. Emphasizes early speed.",
            delta: { speed: 3, stamina: -1 },
          },
          {
            key: "distance_conditioning",
            label: "Distance Conditioning",
            description: "Long slow distance work. Builds the aerobic base.",
            delta: { stamina: 3, speed: -1 },
          },
          {
            key: "gate_familiarization",
            label: "Gate Familiarization",
            description: "Focus on the starting gate and reactive acceleration.",
            delta: { acceleration: 3, consistency: 1 },
          },
        ],
      },
    ],
  };
}
