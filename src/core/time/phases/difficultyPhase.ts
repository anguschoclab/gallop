/**
 * phases/difficultyPhase.ts - Adaptive difficulty modulation phase
 *
 * Tracks player win rate from resolved races and adjusts NPC competence
 * multiplier on a 30-day cycle. When the player wins too much, NPC competence
 * increases (up to 1.3x). When the player loses too much, it decreases (down to 0.7x).
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/constants (PHASE_ORDER_DIFFICULTY), @/core/ai/npcCycleAI (DifficultyState, NpcAIManager), @/core/horse/ownership (isPlayerOwned)
 * Related files: ./index.ts (registers phase), ./raceResolution.ts (produces results)
 */

import { PHASE_ORDER_DIFFICULTY, DIFFICULTY_ADJUSTMENT_PERIOD } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import { isPlayerOwned } from "@/core/horse/ownership";
import type { DifficultyState, NpcAIManager } from "@/core/ai/npcCycleAI";

const MIN_MULTIPLIER = 0.7;
const MAX_MULTIPLIER = 1.3;
const HIGH_WIN_RATE = 0.35;
const LOW_WIN_RATE = 0.15;
const SMOOTH_FACTOR = 0.3;

function createDefaultDifficulty(day: number): DifficultyState {
  return {
    playerWinRate: 0,
    npcCompetenceMultiplier: 1.0,
    lastAdjustmentDay: day,
    playerWins: 0,
    playerEntries: 0,
  };
}

export const difficultyPhase: PipelinePhase = {
  name: "difficulty",
  order: PHASE_ORDER_DIFFICULTY,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, horseMap } = context;

    let manager = state.npcAIManager as NpcAIManager | undefined;
    let dm: DifficultyState = manager?.difficultyModulator ?? createDefaultDifficulty(newDay);
    const oldMultiplier = dm.npcCompetenceMultiplier;

    // Count player wins and entries from resolved races on this day
    let newWins = dm.playerWins ?? 0;
    let newEntries = dm.playerEntries ?? 0;

    for (const race of Object.values(state.races)) {
      if (!race.resolved || !race.result) continue;
      if (race.day !== newDay) continue;

      for (const entry of race.entries) {
        const horse = horseMap.get(entry.horseId as string);
        if (!horse || !isPlayerOwned(horse)) continue;

        newEntries++;
        const result = race.result.find((r) => r.horseId === entry.horseId);
        if (result && result.position === 1) {
          newWins++;
        }
      }
    }

    // Check if it's time for a difficulty adjustment
    const daysSinceAdjustment = newDay - dm.lastAdjustmentDay;
    if (daysSinceAdjustment >= DIFFICULTY_ADJUSTMENT_PERIOD) {
      const winRate = newEntries > 0 ? newWins / newEntries : 0;
      // Target-based adjustment: pick target based on win rate band, then move toward it
      let target: number;
      if (winRate > HIGH_WIN_RATE) {
        target = MAX_MULTIPLIER;
      } else if (winRate < LOW_WIN_RATE) {
        target = MIN_MULTIPLIER;
      } else {
        target = 1.0;
      }
      let newMultiplier =
        dm.npcCompetenceMultiplier + (target - dm.npcCompetenceMultiplier) * SMOOTH_FACTOR;
      newMultiplier = Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, newMultiplier));

      dm = {
        playerWinRate: winRate,
        npcCompetenceMultiplier: newMultiplier,
        lastAdjustmentDay: newDay,
        playerWins: 0,
        playerEntries: 0,
      };
    } else {
      dm = {
        ...dm,
        playerWins: newWins,
        playerEntries: newEntries,
      };
    }

    // Update the manager with the new difficulty state
    manager = {
      ...(manager ?? { stableStates: {}, globalDay: newDay, regionalKings: {} }),
      difficultyModulator: dm,
      previousDifficultyMultiplier: oldMultiplier,
    };

    return {
      ...context,
      state: {
        ...state,
        npcAIManager: manager,
      },
    };
  },
};
