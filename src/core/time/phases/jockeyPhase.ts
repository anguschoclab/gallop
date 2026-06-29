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
import { createRng, hashStr } from "@/core/common/rng";
import { generateJockey } from "@/core/jockey/generator";
import {
  selectBestJockey,
  shouldRetainJockey,
  createJockeyAIState,
  recordJockeyAssignment,
} from "@/core/ai/jockeyAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { JOCKEY_CONTRACT_DAYS, JOCKEY_RETAINER_DAYS, PHASE_ORDER_JOCKEY_PHASE } from "@/constants";
import { generateUUID } from "@/core/uuid";
import type { AnyImpact } from "@/core/resolver/impacts/index";

/**
 * Phase: Jockey Management
 * Handles contract expirations, NPC hiring, and pool refreshment.
 * Adds Imperial Expansion "Poaching" logic for apprentices and low-loyalty jockeys.
 */
export const jockeyPhase = {
  name: "jockey",
  order: PHASE_ORDER_JOCKEY_PHASE, // After upkeep, before NPC cycle
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const dailyRng = (context as any).dailyRng || createRng(hashStr(`jockey_phase_${newDay}`));

    let jockeys = (state.jockeys ?? []).map((j) => ({ ...j }));
    let npcStables = state.npcStables;
    let npcAIManager = state.npcAIManager;
    const logs = [...context.logs];
    const impacts: AnyImpact[] = [];

    // 1. Handle Contract Expirations & Imperial Field Initialization
    jockeys = jockeys.map((j) => {
      // Defensive initialization for Imperial Expansion fields (clone-on-write)
      if (
        !j.affinityMap ||
        j.stableAffinity === undefined ||
        j.isApprentice === undefined ||
        j.loyalty === undefined
      ) {
        j = {
          ...j,
          affinityMap: j.affinityMap ?? {},
          stableAffinity: j.stableAffinity ?? 0,
          isApprentice: j.isApprentice ?? false,
          loyalty: j.loyalty ?? 100,
        };
      }

      if (j.contractUntil && j.contractUntil < newDay) {
        if (j.stableId) {
          const stable = npcStables.find((s) => s.id === j.stableId);
          if (!stable) {
            // Player jockey contract expired
            logs.push({
              day: newDay,
              text: `Jockey contract expired: ${j.name} is now a free agent.`,
            });
          } else if (npcAIManager) {
            // NPC jockey contract expired - use AI to determine if should retain
            npcAIManager = {
              ...npcAIManager,
              stableStates: { ...npcAIManager.stableStates },
            };
            const stableAI = getOrCreateStableAIState(npcAIManager, stable, newDay);
            const jockeyAI = stableAI.jockeyAI || (stableAI.jockeyAI = createJockeyAIState(stable));

            if (!shouldRetainJockey(jockeyAI, j, stable, newDay)) {
              logs.push({
                day: newDay,
                text: `${stable.name} declined to renew contract for ${j.name}.`,
              });
              npcAIManager.stableStates[stable.id] = stableAI;
              return { ...j, stableId: undefined, contractUntil: undefined, stableAffinity: 0 };
            } else {
              // Renew contract
              npcAIManager.stableStates[stable.id] = stableAI;
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
    const stableCashUpdates = new Map<string, number>();
    npcStables = npcStables.map((stable) => {
      const hasRetained = jockeys.some((j) => j.stableId === stable.id);

      // A. Standard Hiring (if without jockey)
      if (!hasRetained && dailyRng.next() < 0.1) {
        const freeAgents = jockeys.filter((j) => !j.stableId);
        if (freeAgents.length > 0) {
          let chosen = null;
          if (npcAIManager) {
            npcAIManager = {
              ...npcAIManager,
              stableStates: { ...npcAIManager.stableStates },
            };
            const stableAI = getOrCreateStableAIState(npcAIManager, stable, newDay);
            const jockeyAI = stableAI.jockeyAI || (stableAI.jockeyAI = createJockeyAIState(stable));
            chosen = selectBestJockey(jockeyAI, {} as any, freeAgents, stable);
            npcAIManager.stableStates[stable.id] = stableAI;
          }

          if (chosen) {
            const signOnBonus = chosen.ridingFee * 20;
            const currentCash = stableCashUpdates.get(stable.id) ?? stable.cash;
            if (currentCash >= signOnBonus) {
              stableCashUpdates.set(stable.id, currentCash - signOnBonus);
              jockeys = jockeys.map((j) =>
                j.id === chosen.id
                  ? {
                      ...j,
                      stableId: stable.id,
                      contractUntil: newDay + JOCKEY_CONTRACT_DAYS,
                      stableAffinity: 30,
                    }
                  : j,
              );
              impacts.push({
                id: generateUUID(dailyRng),
                intentId: "",
                day: newDay,
                phase: "jockey",
                logLevel: "conditional",
                type: "cash_change",
                entityId: stable.id,
                amount: -signOnBonus,
                reason: `Sign-on bonus for jockey ${chosen.name}`,
              });
              impacts.push({
                id: generateUUID(dailyRng),
                intentId: "",
                day: newDay,
                phase: "jockey",
                logLevel: "conditional",
                type: "jockey_contract",
                jockeyId: chosen.id,
                stableId: stable.id,
                contractUntil: newDay + JOCKEY_CONTRACT_DAYS,
                reason: `NPC stable ${stable.name} hired jockey ${chosen.name}`,
              } as AnyImpact);
            }
          }
        }
      }

      // B. Imperial Poaching (Attempt to steal star apprentices or low-loyalty player jockeys)
      if (stable.tier === "elite" && dailyRng.next() < 0.05) {
        // Elite stables poach 5% of the time
        const playerJockeys = jockeys.filter(
          (j) => j.stableId === "player" || j.stableId === "player_academy",
        );
        const poachable = playerJockeys.filter((j) => {
          // Target star apprentices or jockeys with low loyalty
          return (j.isApprentice && j.fame > 40) || j.loyalty < 70;
        });

        if (poachable.length > 0) {
          const target = dailyRng.pick(poachable);
          // Loyalty check: Fame vs Player Reputation vs Loyalty
          const playerRep = state.reputation?.score || 50;
          const poachSuccessChance = (target.fame - playerRep) / 100 + (1 - target.loyalty / 100);

          if (dailyRng.next() < poachSuccessChance) {
            // Poaching success!
            logs.push({
              day: newDay,
              text: `POACHED: ${stable.name} has signed your star jockey ${target.name} to a life-changing contract!`,
            });
            jockeys = jockeys.map((j) =>
              j.id === target.id
                ? {
                    ...j,
                    stableId: stable.id,
                    contractUntil: newDay + JOCKEY_RETAINER_DAYS,
                    stableAffinity: 50,
                    loyalty: 100,
                  }
                : j,
            );
            impacts.push({
              id: generateUUID(dailyRng),
              intentId: "",
              day: newDay,
              phase: "jockey",
              logLevel: "conditional",
              type: "jockey_contract",
              jockeyId: target.id,
              stableId: stable.id,
              contractUntil: newDay + JOCKEY_RETAINER_DAYS,
              loyalty: 100,
              reason: `Elite stable ${stable.name} poached jockey ${target.name}`,
            } as AnyImpact);
          } else if (dailyRng.next() < 0.2) {
            // Poaching attempt failed but loyalty dropped
            logs.push({
              day: newDay,
              text: `Rumors: ${stable.name} made a secret offer to ${target.name}. Your jockey remains for now, but seems unsettled.`,
            });
            jockeys = jockeys.map((j) =>
              j.id === target.id ? { ...j, loyalty: Math.max(0, j.loyalty - 15) } : j,
            );
          }
        }
      }

      return stable;
    });

    // Apply accumulated cash updates to a fresh stables array.
    if (stableCashUpdates.size > 0) {
      npcStables = npcStables.map((stable) => {
        const updatedCash = stableCashUpdates.get(stable.id);
        return updatedCash === undefined ? stable : { ...stable, cash: updatedCash };
      });
    }

    // 3. Pool Refreshment
    // Ensure at least 20 free agents
    const freeAgents = jockeys.filter((j) => !j.stableId);
    if (freeAgents.length < 20) {
      const needed = 20 - freeAgents.length;
      const newJockeys = [];
      for (let i = 0; i < needed; i++) {
        const r = dailyRng.next();
        const tier = r < 0.15 ? "elite" : r < 0.6 ? "mid" : "budget";
        newJockeys.push(generateJockey({ tier, rng: dailyRng }));
      }
      jockeys = [...jockeys, ...newJockeys];
    }

    return {
      ...context,
      state: {
        ...state,
        jockeys,
        npcStables,
        npcAIManager,
      },
      logs,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
