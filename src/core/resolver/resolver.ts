/**
 * resolver.ts - Core resolver logic
 *
 * This file provides core resolver logic for the impact resolver system,
 * handling intent collection, validation, and impact application using Immer.
 *
 * Dependencies: immer (produce), @/game/types (GameState), ./intents (AnyIntent), ./impacts (AnyImpact), ./handlers (ALL_HANDLERS), ./validators (ALL_VALIDATORS, ValidationCache)
 * Related files: intents.ts (provides intent types), handlers/ (handle intents), validators/ (validate intents)
 */

// Core resolver logic for the impact resolver system
// Handles intent collection, validation, and impact application using Immer

import { produce, type WritableDraft } from "immer";
import type { GameState, Horse, Stable } from "@/game/types";
import type { AnyIntent } from "./intents";
import type { AnyImpact } from "./impacts";
import { ALL_HANDLERS } from "./handlers";
import { ALL_VALIDATORS, type ValidationCache } from "./validators";

// Impact log entry for debugging and audit trail
export interface ImpactLogEntry {
  impactId: string;
  intentId: string;
  day: number;
  phase: string;
  type: string;
  entityId: string;
  details: string;
  logLevel: "always" | "conditional" | "never";
}

// Resolver context for processing intents and impacts
export interface ResolverContext {
  state: GameState;
  intents: AnyIntent[];
  impacts: AnyImpact[];
  impactLog: ImpactLogEntry[];
  day: number;
}

/**
 * Applies a collection of impacts to the state in sequential order.
 * Processes all impacts within the resolver context and creates pre-indexed maps for efficient entity lookups during resolution.
 *
 * @param {ResolverContext} context - The context containing current state and impacts to apply.
 * @returns {ResolverContext} The updated resolver context with the new state and extended impact log.
 */
export function applyImpacts(context: ResolverContext): ResolverContext {
  const impactLog: ImpactLogEntry[] = [];

  const newState = produce(context.state, (draft) => {
    // PRE-INDEX: Create maps for O(1) lookups during impact resolution
    // Note: We use the DRAFT as source, but once a horse is modified,
    // the proxy stays the same in the map, so it's safe.
    const horseMap = new Map<string, WritableDraft<Horse>>();
    for (const h of Object.values(draft.horses)) {
      horseMap.set(h.id, h);
    }

    const stableMap = new Map<string, WritableDraft<Stable>>();
    for (const s of draft.npcStables) {
      stableMap.set(s.id, s);
    }

    const campaignMap = new Map<string, WritableDraft<any>>();
    if (draft.campaigns) {
      for (const c of draft.campaigns) {
        campaignMap.set(c.horseId, c);
      }
    }

    const raceMap = new Map<string, WritableDraft<any>>();
    for (const r of Object.values(draft.races)) {
      raceMap.set(r.id, r);
    }

    const jockeyMap = new Map<string, WritableDraft<any>>();
    if (draft.jockeys) {
      for (const j of draft.jockeys) {
        jockeyMap.set(j.id, j);
      }
    }

    const auctionMap = new Map<string, WritableDraft<any>>();
    if (draft.auctions) {
      for (const a of draft.auctions) {
        auctionMap.set(a.id, a);
      }
    }

    const facilityMap = new Map<string, WritableDraft<any>>();
    if (draft.facilities) {
      for (const f of Object.values(draft.facilities)) {
        if (f) facilityMap.set(f.type, f);
      }
    }

    const staffMap = new Map<string, WritableDraft<any>>();
    if (draft.hiredStaff) {
      for (const s of draft.hiredStaff) {
        staffMap.set(s.id, s);
      }
    }

    for (const impact of context.impacts) {
      let handled = false;

      for (const handler of ALL_HANDLERS) {
        if (handler.canHandle(impact.type)) {
          handler.handle(draft, impact, {
            horseMap,
            stableMap,
            campaignMap,
            raceMap,
            jockeyMap,
            auctionMap,
            facilityMap,
            staffMap,
          });
          handled = true;
          break;
        }
      }

      if (!handled) {
        console.warn(`Unknown impact type: ${impact.type}`);
      }

      // Log impact based on logLevel
      if (impact.logLevel !== "never") {
        impactLog.push({
          impactId: impact.id,
          intentId: impact.intentId,
          day: impact.day,
          phase: impact.phase,
          type: impact.type,
          entityId: impact.entityId || impact.horseId || impact.raceId || "unknown",
          details: impact.reason || impact.type,
          logLevel: impact.logLevel,
        });
      }
    }
  });

  return {
    ...context,
    state: newState as GameState,
    impactLog: [...context.impactLog, ...impactLog],
  };
}

/**
 * Validates a game intent before it is processed by the resolver.
 * Searches for a registered validator capable of handling the specific intent type.
 *
 * @param {AnyIntent} intent - The intent to validate.
 * @param {GameState} state - The current game state.
 * @param {ValidationCache} [cache] - Optional cache to store and reuse validation results for performance.
 * @returns {Object} Validation result containing a `valid` boolean and an optional `reason` for failure.
 */
export function validateIntent(
  intent: AnyIntent,
  state: GameState,
  cache?: ValidationCache,
): { valid: boolean; reason?: string } {
  // Find appropriate validator from registry
  for (const validator of ALL_VALIDATORS) {
    if (validator.canValidate(intent.type)) {
      return validator.validate(intent, state, cache);
    }
  }

  // Default to valid if no specific validator found
  return { valid: true };
}

/**
 * Sorts an array of intents by their numerical priority field in descending order.
 *
 * @param {AnyIntent[]} intents - The array of intents to sort.
 * @returns {AnyIntent[]} A new array containing the sorted intents.
 */
export function sortIntents(intents: AnyIntent[]): AnyIntent[] {
  return [...intents].sort((a, b) => b.priority - a.priority);
}

/**
 * Resolves potential conflicts between multiple intents targeting the same entity and type.
 * Groups intents and retains only the one with the highest priority for each group, logging the others as conflicts.
 *
 * @param {AnyIntent[]} intents - The collection of intents to resolve.
 * @param {GameState} state - The current game state.
 * @returns {Object} An object containing the list of `resolved` intents and an array of `conflicts`.
 */
export function resolveIntentConflicts(
  intents: AnyIntent[],
  state: GameState,
): {
  resolved: AnyIntent[];
  conflicts: { intent: AnyIntent; reason: string }[];
} {
  const resolved: AnyIntent[] = [];
  const conflicts: { intent: AnyIntent; reason: string }[] = [];

  // Group intents by entity
  const byEntity = new Map<string, AnyIntent[]>();
  for (const intent of intents) {
    const key = `${intent.type}:${intent.entityId}`;
    if (!byEntity.has(key)) {
      byEntity.set(key, []);
    }
    byEntity.get(key)!.push(intent);
  }

  // For each entity, keep only the highest-priority intent
  for (const [key, entityIntents] of byEntity) {
    const sorted = sortIntents(entityIntents);
    const winner = sorted[0];
    resolved.push(winner);

    // Log conflicts
    for (let i = 1; i < sorted.length; i++) {
      conflicts.push({
        intent: sorted[i],
        reason: `Lower priority than ${winner.source} intent for ${key}`,
      });
    }
  }

  return { resolved, conflicts };
}
