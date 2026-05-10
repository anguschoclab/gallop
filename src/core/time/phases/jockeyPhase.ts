/**
 * phases/jockeyPhase.ts - Jockey management phase
 *
 * This file provides the jockey management phase that handles contract expirations,
 * NPC hiring, pool refreshment, and Imperial Expansion relationship mechanics (Poaching).
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/rng (createRng, hashStr), @/game/jockeyGen (generateJockey), @/core/ai/jockeyAI (selectBestJockey, shouldRetainJockey, createJockeyAIState, recordJockeyAssignment), @/core/ai/npcCycleAI (getOrCreateStableAIState)
 * Related files: ../pipeline.ts (uses phase)
 */

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
 * Handles contract expirations, NPC hiring, and pool refreshment.
 * Adds Imperial Expansion "Poaching" logic for apprentices and low-loyalty jockeys.
 */
export const jockeyPhase = {
  name: "jockey",
  order: 45, // After upkeep, before NPC cycle
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const dailyRng = (context as any).dailyRng || createRng(hashStr(`jockey_phase_${newDay}`));

    let jockeys = state.jockeys ?? [];
    let npcStables = state.npcStables;
    const log = state.log;
    const npcAIManager = state.npcAIManager;

    // 1. Handle Contract Expirations & Imperial Field Initialization
    jockeys = jockeys.map((j) => {
      // Defensive initialization for Imperial Expansion fields
      if (!j.affinityMap) j.affinityMap = {};
      if (j.stableAffinity === undefined) j.stableAffinity = 0;
      if (j.isApprentice === undefined) j.isApprentice = false;
      if (j.loyalty === undefined) j.loyalty = 100;

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
            // NPC jockey contract expired - use AI to determine if should retain
            const stableAI = getOrCreateStableAIState(npcAIManager, stable, newDay);
            const jockeyAI = stableAI.jockeyAI || (stableAI.jockeyAI = createJockeyAIState(stable));

            if (!shouldRetainJockey(jockeyAI, j, stable, newDay)) {
              log.push({
                day: newDay,
                text: `${stable.name} declined to renew contract for ${j.name}.`,
              });
              return { ...j, stableId: undefined, contractUntil: undefined, stableAffinity: 0 };
            } else {
              // Renew contract
              return { ...j, contractUntil: newDay + 90 };
            }
          }
        }
        return { ...j, stableId: undefined, contractUntil: undefined, stableAffinity: 0 };
      }
      return j;
    });

    // 2. NPC Hiring & POACHING (Imperial Expansion)
    // Stables might try to hire or poach jockeys
    npcStables = npcStables.map((stable) => {
      const hasRetained = jockeys.some((j) => j.stableId === stable.id);
      
      // A. Standard Hiring (if without jockey)
      if (!hasRetained && dailyRng.next() < 0.1) {
        const freeAgents = jockeys.filter((j) => !j.stableId);
        if (freeAgents.length > 0) {
          let chosen = null;
          if (npcAIManager) {
            const stableAI = getOrCreateStableAIState(npcAIManager, stable, newDay);
            const jockeyAI = stableAI.jockeyAI || (stableAI.jockeyAI = createJockeyAIState(stable));
            chosen = selectBestJockey(jockeyAI, {} as any, freeAgents, stable);
          }

          if (chosen) {
            const signOnBonus = chosen.ridingFee * 20;
            if (stable.cash >= signOnBonus) {
              stable.cash -= signOnBonus;
              jockeys = jockeys.map((j) =>
                j.id === chosen.id ? { ...j, stableId: stable.id, contractUntil: newDay + 90, stableAffinity: 30 } : j,
              );
            }
          }
        }
      }

      // B. Imperial Poaching (Attempt to steal star apprentices or low-loyalty player jockeys)
      if (stable.tier === "elite" && dailyRng.next() < 0.05) { // Elite stables poach 5% of the time
        const playerJockeys = jockeys.filter(j => j.stableId === "player" || j.stableId === "player_academy");
        const poachable = playerJockeys.filter(j => {
            // Target star apprentices or jockeys with low loyalty
            return (j.isApprentice && j.fame > 40) || (j.loyalty < 70);
        });

        if (poachable.length > 0) {
            const target = dailyRng.pick(poachable);
            // Loyalty check: Fame vs Player Reputation vs Loyalty
            const playerRep = state.reputation?.total || 50;
            const poachSuccessChance = (target.fame - playerRep) / 100 + (1 - target.loyalty / 100);
            
            if (dailyRng.next() < poachSuccessChance) {
                // Poaching success!
                log.push({
                    day: newDay,
                    text: `POACHED: ${stable.name} has signed your star jockey ${target.name} to a life-changing contract!`,
                });
                jockeys = jockeys.map(j => 
                    j.id === target.id ? { ...j, stableId: stable.id, contractUntil: newDay + 180, stableAffinity: 50, loyalty: 100 } : j
                );
            } else if (dailyRng.next() < 0.2) {
                // Poaching attempt failed but loyalty dropped
                log.push({
                    day: newDay,
                    text: `Rumors: ${stable.name} made a secret offer to ${target.name}. Your jockey remains for now, but seems unsettled.`,
                });
                jockeys = jockeys.map(j => 
                    j.id === target.id ? { ...j, loyalty: Math.max(0, j.loyalty - 15) } : j
                );
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
