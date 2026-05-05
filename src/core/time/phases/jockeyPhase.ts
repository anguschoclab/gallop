import type { PipelineContext } from "../pipeline";
import { createRng, hashStr } from "@/game/rng";
import { generateJockey } from "@/game/jockeyGen";
import {
  selectBestJockey,
  shouldRetainJockey,
  createJockeyAIState,
  recordJockeyAssignment,
} from "@/core/ai/jockeyAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";

/**
 * Phase: Jockey Management
 * Handles contract expirations, NPC hiring, and pool refreshment
 */
export const jockeyPhase = {
  name: "jockey",
  order: 45, // After upkeep, before NPC cycle
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, dailyRng } = context;
    let jockeys = state.jockeys ?? [];
    let { npcStables, log, npcAIManager } = state;

    // 1. Handle Contract Expirations
    jockeys = jockeys.map((j) => {
      if (j.contractUntil && j.contractUntil < newDay) {
        if (j.stableId) {
          const stable = npcStables.find((s) => s.id === j.stableId);
          if (!stable) {
            // Player jockey contract expired
            log.push({
              day: newDay,
              text: `Jockey contract expired: ${j.name} is now a free agent.`,
            });
          } else if (npcAIManager) {
            // NPC jockey contract expired - use AI to decide on retention
            const aiState = getOrCreateStableAIState(npcAIManager, stable, newDay);
            if (!aiState.jockeyAI) {
              aiState.jockeyAI = createJockeyAIState(stable);
            }
            const shouldRetain = shouldRetainJockey(aiState.jockeyAI, j, stable, newDay);
            if (shouldRetain) {
              // Re-hire the jockey
              const signOnBonus = j.ridingFee * 20;
              if (stable.cash >= signOnBonus) {
                stable.cash -= signOnBonus;
                return { ...j, stableId: stable.id, contractUntil: newDay + 90 };
              }
            }
          }
        }
        return { ...j, stableId: undefined, contractUntil: undefined };
      }
      return j;
    });

    // 2. NPC Hiring (Retainers)
    // Stables without a jockey might try to hire one
    npcStables = npcStables.map((stable) => {
      const hasRetained = jockeys.some((j) => j.stableId === stable.id);
      if (!hasRetained && dailyRng.next() < 0.1) {
        // 10% chance per day to look for a jockey
        // Find best available jockeys
        const freeAgents = jockeys.filter((j) => !j.stableId);
        if (freeAgents.length > 0) {
          let chosen: typeof freeAgents[0] | null = null;

          // Use AI-driven selection if AI manager is available
          if (npcAIManager) {
            const aiState = getOrCreateStableAIState(npcAIManager, stable, newDay);
            if (!aiState.jockeyAI) {
              aiState.jockeyAI = createJockeyAIState(stable);
            }
            // For AI selection, we need a representative horse from the stable
            // Use the highest-rated horse as a proxy for the stable's needs
            const stableHorses = state.horses.filter((h) => h.stableId === stable.id);
            if (stableHorses.length > 0) {
              const representativeHorse = stableHorses[0];
              const bestJockey = selectBestJockey(aiState.jockeyAI, representativeHorse, freeAgents, stable);
              if (bestJockey) {
                chosen = bestJockey;
              }
            }
          }

          // Fall back to original logic if AI not available
          if (!chosen) {
            let candidates = freeAgents;
            if (stable.tier === "elite") {
              candidates = freeAgents.filter((j) => j.fame > 70);
            } else if (stable.tier === "mid") {
              candidates = freeAgents.filter((j) => j.fame > 40 && j.fame <= 75);
            }

            if (candidates.length === 0) candidates = freeAgents; // Fallback
            chosen = dailyRng.pick(candidates);
          }

          if (chosen) {
            // Hiring logic: deduct sign-on bonus from stable
            const signOnBonus = chosen.ridingFee * 20; // 20 races worth of retainer
            if (stable.cash >= signOnBonus) {
              stable.cash -= signOnBonus;
              // Update jockey in our local jockeys array
              jockeys = jockeys.map((j) =>
                j.id === chosen.id ? { ...j, stableId: stable.id, contractUntil: newDay + 90 } : j,
              );

              // Record jockey assignment for AI learning
              if (npcAIManager) {
                const aiState = getOrCreateStableAIState(npcAIManager, stable, newDay);
                if (aiState.jockeyAI) {
                  const stableHorses = state.horses.filter((h) => h.stableId === stable.id);
                  const representativeHorse = stableHorses[0];
                  recordJockeyAssignment(
                    aiState.jockeyAI,
                    chosen,
                    representativeHorse,
                    "hiring", // Use a placeholder raceId for hiring events
                    stable,
                    signOnBonus,
                    newDay,
                  );
                }
              }
            }
          }
        }
      }
      return stable;
    });

    // 3. Pool Refreshment
    // Ensure at least 20 free agents
    const freeAgents = jockeys.filter((j) => !j.stableId);
    if (freeAgents.length < 20) {
      const needed = 20 - freeAgents.length;
      for (let i = 0; i < needed; i++) {
        const r = dailyRng.next();
        const tier = r < 0.15 ? "elite" : r < 0.6 ? "mid" : "budget";
        jockeys.push(generateJockey({ tier, rng: dailyRng }));
      }
    }

    return {
      ...context,
      state: {
        ...state,
        jockeys,
        npcStables,
        log,
        npcAIManager,
      },
    };
  },
};
