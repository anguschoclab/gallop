// Core resolver logic for the impact resolver system
// Handles intent collection, validation, and impact application using Immer

import { produce } from "immer";
import type { GameState } from "@/game/types";
import type { AnyIntent } from "./intents";
import type { AnyImpact } from "./impacts";
import { isHorseEligibleForClaimingPrice } from "@/game/claiming";
import { generateUUID } from "@/game/uuid";
import { ALL_HANDLERS } from "./handlers";

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
 * Apply a single impact to the state using Immer for immutability
 */
function applyImpact(state: GameState, impact: AnyImpact): GameState {
  return produce(state, (draft) => {
    let handled = false;
    for (const handler of ALL_HANDLERS) {
      if (handler.canHandle(impact.type)) {
        handler.handle(draft, impact);
        handled = true;
        break;
      }
    }

    if (!handled) {
      // Unknown impact type - log warning
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.warn(`Unknown impact type: ${(impact as any).type}`);
    }
  });
}

/**
 * Apply all impacts to the state in order
 */
export function applyImpacts(context: ResolverContext): ResolverContext {
  const impactLog: ImpactLogEntry[] = [];
  
  const newState = produce(context.state, (draft) => {
    // PRE-INDEX: Create maps for O(1) lookups during impact resolution
    // Note: We use the DRAFT as source, but once a horse is modified, 
    // the proxy stays the same in the map, so it's safe.
    const horseMap = new Map<string, WritableDraft<Horse>>();
    for (const h of draft.horses) {
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
    for (const r of draft.races) {
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
          handler.handle(draft, impact, { horseMap, stableMap, campaignMap, raceMap, jockeyMap, auctionMap, facilityMap, staffMap });
          handled = true;
          break;
        }
      }







      if (!handled) {
        console.warn(`Unknown impact type: ${(impact as any).type}`);
      }

      // Log impact based on logLevel
      if (impact.logLevel !== "never") {
        impactLog.push({
          impactId: impact.id,
          intentId: impact.intentId,
          day: impact.day,
          phase: impact.phase,
          type: impact.type,
          entityId:
            (impact as any).entityId ||
            (impact as any).horseId ||
            (impact as any).raceId ||
            "unknown",
          details:
            (impact as any).reason ||
            impact.type,
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
 * Validate an intent before resolution
 * Returns { valid: boolean, reason?: string }
 */
export function validateIntent(
  intent: AnyIntent,
  state: GameState,
  cache?: {
    horseMap?: Map<string, Horse>;
    raceMap?: Map<string, Race>;
    stableMap?: Map<string, Stable>;
  },
): { valid: boolean; reason?: string } {
  // Basic validation based on intent type
  switch (intent.type) {
    case "training": {
      const horse = cache?.horseMap?.get(intent.horseId) || state.horses.find((h) => h.id === intent.horseId);
      if (!horse) return { valid: false, reason: "Horse not found" };
      if (horse.consignedSaleId)
        return { valid: false, reason: "Horse is consigned to an auction" };
      if (horse.energy < 20) return { valid: false, reason: "Insufficient energy" };
      break;
    }

    case "race_entry": {
      const horse = cache?.horseMap?.get(intent.horseId) || state.horses.find((h) => h.id === intent.horseId);
      const race = cache?.raceMap?.get(intent.raceId) || state.races.find((r) => r.id === intent.raceId);
      if (!horse) return { valid: false, reason: "Horse not found" };
      if (horse.consignedSaleId)
        return { valid: false, reason: "Horse is consigned to an auction" };
      if (!race) return { valid: false, reason: "Race not found" };
      if (race.resolved) return { valid: false, reason: "Race already resolved" };
      if (horse.energy < 40) return { valid: false, reason: "Insufficient energy" };
      break;
    }

    case "breeding": {
      const sire = cache?.horseMap?.get(intent.sireId) || state.horses.find((h) => h.id === intent.sireId);
      const dam = cache?.horseMap?.get(intent.damId) || state.horses.find((h) => h.id === intent.damId);
      if (!sire) return { valid: false, reason: "Sire not found" };
      if (!dam) return { valid: false, reason: "Dam not found" };
      if (sire.gender !== "horse" && sire.gender !== "gelding")
        return { valid: false, reason: "Invalid sire gender" };
      if (dam.gender !== "mare") return { valid: false, reason: "Invalid dam gender" };
      if (state.cash < 2000) return { valid: false, reason: "Insufficient funds for breeding" };
      break;
    }

    case "purchase": {
      const horse = state.market.find((h) => h.id === intent.horseId);
      if (!horse) return { valid: false, reason: "Horse not in market" };
      if (state.cash < intent.price) return { valid: false, reason: "Insufficient funds" };
      break;
    }

    case "claiming": {
      const race = cache?.raceMap?.get(intent.raceId) || state.races.find((r) => r.id === intent.raceId);
      const horse = cache?.horseMap?.get(intent.horseId) || state.horses.find((h) => h.id === intent.horseId);
      if (!race) return { valid: false, reason: "Race not found" };
      if (!horse) return { valid: false, reason: "Horse not found" };
      if (horse.consignedSaleId)
        return { valid: false, reason: "Horse is consigned to an auction" };
      if (!race.claimingPrice) return { valid: false, reason: "Race is not a claiming race" };
      if (!race.entries.some((e) => e.horseId === intent.horseId)) {
        return { valid: false, reason: "Horse is not entered in this race" };
      }
      if (horse.stableId === intent.claimantStableId) {
        return { valid: false, reason: "Cannot claim own horse" };
      }

      // Check claimant has sufficient funds
      if (intent.claimantStableId) {
        const stable = cache?.stableMap?.get(intent.claimantStableId) || state.npcStables.find((s) => s.id === intent.claimantStableId);
        if (!stable || stable.cash < race.claimingPrice) {
          return { valid: false, reason: "Insufficient funds" };
        }
      } else {
        if (state.cash < race.claimingPrice) {
          return { valid: false, reason: "Insufficient funds" };
        }
      }

      // Check horse eligibility for claiming price
      if (!isHorseEligibleForClaimingPrice(horse, race.claimingPrice, state.horses)) {
        return { valid: false, reason: "Horse is not eligible for this claiming price" };
      }

      break;
    }

    case "withdraw_from_claiming": {
      const race = cache?.raceMap?.get(intent.raceId) || state.races.find((r) => r.id === intent.raceId);
      const horse = cache?.horseMap?.get(intent.horseId) || state.horses.find((h) => h.id === intent.horseId);
      if (!race) return { valid: false, reason: "Race not found" };
      if (!horse) return { valid: false, reason: "Horse not found" };
      if (race.resolved) return { valid: false, reason: "Race already resolved" };
      if (!race.claimingPrice) return { valid: false, reason: "Race is not a claiming race" };
      if (race.raceClass !== "OptionalClaiming" && race.raceClass !== "MaidenOptionalClaiming") {
        return { valid: false, reason: "Withdrawal only allowed in optional claiming races" };
      }
      const entry = race.entries.find((e) => e.horseId === intent.horseId);
      if (!entry) return { valid: false, reason: "Horse not entered in this race" };
      if (entry.withdrawnFromClaiming) {
        return { valid: false, reason: "Horse already withdrawn from claiming" };
      }
      break;
    }


    default:
      // Pass through for other intent types
      break;
  }

  return { valid: true };
}

/**
 * Sort intents by priority (higher priority first)
 * Player intents have priority 100, NPC intents have priority 50, System intents have priority 10
 */
export function sortIntents(intents: AnyIntent[]): AnyIntent[] {
  return [...intents].sort((a, b) => b.priority - a.priority);
}

/**
 * Resolve conflicts between intents
 * Currently uses priority-based resolution with logging
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
