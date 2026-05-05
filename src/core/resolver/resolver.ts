// Core resolver logic for the impact resolver system
// Handles intent collection, validation, and impact application using Immer

import { produce } from "immer";
import type { GameState } from "@/game/types";
import type { AnyIntent } from "./intents";
import type { AnyImpact } from "./impacts";
import { isHorseEligibleForClaimingPrice } from "@/game/claiming";

// Re-export AnyImpact for use in pipeline
export type { AnyImpact } from "./impacts";

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
    switch (impact.type) {
      case "cash_change": {
        const { entityId, amount, reason } = impact;
        if (entityId) {
          // NPC stable cash change
          const stable = draft.npcStables.find((s) => s.id === entityId);
          if (stable) {
            stable.cash = Math.max(0, stable.cash + amount);
          }
        } else {
          // Player cash change
          draft.cash = Math.max(0, draft.cash + amount);
        }
        break;
      }

      case "horse_stat_change": {
        const { horseId, stat, delta } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.stats[stat] = Math.min(horse.potential, Math.max(0, horse.stats[stat] + delta));
        }
        break;
      }

      case "energy_change": {
        const { horseId, delta } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.energy = Math.min(100, Math.max(0, horse.energy + delta));
        }
        break;
      }

      case "form_change": {
        const { horseId, delta } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.form = Math.min(10, Math.max(-10, horse.form + delta));
        }
        break;
      }

      case "fame_change": {
        const { horseId, delta } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.fame = Math.min(100, Math.max(0, horse.fame + delta));
        }
        break;
      }

      case "horse_creation": {
        const { horse } = impact;
        draft.horses.push(horse);
        break;
      }

      case "horse_deletion": {
        const { horseId } = impact;
        const index = draft.horses.findIndex((h) => h.id === horseId);
        if (index !== -1) {
          draft.horses.splice(index, 1);
        }
        break;
      }

      case "horse_transfer": {
        const { horseId, fromStableId, toStableId } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.stableId = toStableId;
          horse.owned = !toStableId;
        }
        break;
      }

      case "race_entry": {
        const { raceId, horseId, jockeyId, weight } = impact;
        const race = draft.races.find((r) => r.id === raceId);
        if (race) {
          race.entries.push({
            horseId,
            owned: false, // Will be updated by transfer impact
            jockeyId,
            weight,
          });
        }
        break;
      }

      case "race_withdrawal": {
        const { raceId, horseId } = impact;
        const race = draft.races.find((r) => r.id === raceId);
        if (race) {
          const index = race.entries.findIndex((e) => e.horseId === horseId);
          if (index !== -1) {
            race.entries.splice(index, 1);
          }
        }
        break;
      }

      case "race_result": {
        const { raceId, results } = impact;
        const race = draft.races.find((r) => r.id === raceId);
        if (race) {
          race.result = results;
          race.resolved = true;
        }
        break;
      }

      case "pregnancy_creation": {
        const { pregnancy } = impact;
        draft.pregnancies.push(pregnancy);
        break;
      }

      case "pregnancy_update": {
        const { pregnancyId, updates } = impact;
        const index = draft.pregnancies.findIndex((p) => p.id === pregnancyId);
        if (index !== -1) {
          Object.assign(draft.pregnancies[index], updates);
        }
        break;
      }

      case "pregnancy_deletion": {
        const { pregnancyId } = impact;
        const index = draft.pregnancies.findIndex((p) => p.id === pregnancyId);
        if (index !== -1) {
          draft.pregnancies.splice(index, 1);
        }
        break;
      }

      case "stud_career": {
        const { horseId, studCareer } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.stud = studCareer;
        }
        break;
      }

      case "jockey_contract": {
        const { jockeyId, stableId, contractUntil } = impact;
        const jockey = draft.jockeys?.find((j) => j.id === jockeyId);
        if (jockey) {
          jockey.stableId = stableId;
          jockey.contractUntil = contractUntil;
        }
        break;
      }

      case "jockey_assignment": {
        const { raceId, horseId, jockeyId } = impact;
        const race = draft.races.find((r) => r.id === raceId);
        if (race) {
          const entry = race.entries.find((e) => e.horseId === horseId);
          if (entry) {
            entry.jockeyId = jockeyId;
          }
        }
        break;
      }

      case "scout_report": {
        const { report } = impact;
        draft.scoutReports.push(report);
        break;
      }

      case "consignment": {
        const { horseId, saleId, reservePrice } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.consignedSaleId = saleId;
        }
        const auction = draft.auctions?.find((a) => a.id === saleId);
        if (auction) {
          auction.lots.push({
            id: crypto.randomUUID(),
            horseId,
            saleId,
            reservePrice,
            passed: false,
            withdrawn: false,
          });
        }
        break;
      }

      case "consignment_withdrawal": {
        const { horseId, saleId } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.consignedSaleId = undefined;
        }
        const auction = draft.auctions?.find((a) => a.id === saleId);
        if (auction) {
          const index = auction.lots.findIndex((l) => l.horseId === horseId);
          if (index !== -1) {
            auction.lots.splice(index, 1);
          }
        }
        break;
      }

      case "auction_resolution": {
        const { saleId, lotId, hammerPrice, soldToStableId, passed, bidHistory, wasPlayerConsignment } = impact;
        const auction = draft.auctions?.find((a) => a.id === saleId);
        if (auction) {
          const lot = auction.lots.find((l) => l.id === lotId);
          if (lot) {
            lot.hammerPrice = hammerPrice;
            lot.soldToStableId = soldToStableId;
            lot.passed = passed;
            if (bidHistory) lot.bidHistory = bidHistory;
            // Player-consigned lot — clear the horse's consignedSaleId
            // regardless of sold/passed (sold horse leaves player's hands;
            // passed horse goes back to the player free to re-list).
            if (wasPlayerConsignment) {
              const horse = draft.horses.find((h) => h.id === lot.horseId);
              if (horse) horse.consignedSaleId = undefined;
            }
          }
        }
        break;
      }

      case "gelding": {
        const { horseId } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse && (horse.gender === "colt" || horse.gender === "horse")) {
          horse.gender = "gelding";
        }
        break;
      }

      case "rename": {
        const { horseId, newName } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.name = newName;
        }
        break;
      }

      case "campaign_slot": {
        const { horseId, slotIndex, slot } = impact;
        const campaign = draft.campaigns?.find((c) => c.horseId === horseId);
        if (campaign) {
          campaign.slots[slotIndex] = { ...campaign.slots[slotIndex], ...slot };
        }
        break;
      }

      case "campaign_flag": {
        const { horseId, flag } = impact;
        const campaign = draft.campaigns?.find((c) => c.horseId === horseId);
        if (campaign) {
          campaign.flags.push(flag);
        }
        break;
      }

      case "campaign_creation": {
        const { campaign } = impact;
        if (!draft.campaigns) draft.campaigns = [];
        draft.campaigns.push(campaign);
        break;
      }

      case "campaign_deletion": {
        const { horseId } = impact;
        if (draft.campaigns) {
          const index = draft.campaigns.findIndex((c) => c.horseId === horseId);
          if (index !== -1) {
            draft.campaigns.splice(index, 1);
          }
        }
        break;
      }

      case "auto_manage_toggle": {
        const { horseId, autoManaged } = impact;
        const campaign = draft.campaigns?.find((c) => c.horseId === horseId);
        if (campaign) {
          campaign.autoManaged = autoManaged;
        }
        break;
      }

      case "aging": {
        const { horseId, newAge } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.age = newAge;
        }
        break;
      }

      case "race_history": {
        const { horseId, raceHistoryEntry } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.raceHistory.push(raceHistoryEntry);
        }
        break;
      }

      case "claiming": {
        const { horseId, fromStableId, toStableId } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.stableId = toStableId;
          horse.owned = !toStableId;
        }
        break;
      }

      case "blue hen_status": {
        const { horseId, blueHenStatus } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.blueHenStatus = blueHenStatus;
        }
        break;
      }

      case "jockey_stats": {
        const { jockeyId, careerStarts, careerWins, fame } = impact;
        const jockey = draft.jockeys?.find((j) => j.id === jockeyId);
        if (jockey) {
          jockey.careerStarts = careerStarts;
          jockey.careerWins = careerWins;
          jockey.fame = fame;
        }
        break;
      }

      case "log": {
        const { text } = impact;
        draft.log = [{ day: impact.day, text }, ...draft.log].slice(0, 50);
        break;
      }

      case "health_status_change": {
        const { horseId, status, recoveryDay } = impact;
        const horse = draft.horses.find((h) => h.id === horseId);
        if (horse) {
          horse.healthStatus = status;
          horse.healthStatusDay = impact.day;
          // If a recovery day is specified, store it (for future auto-recovery logic)
          if (recoveryDay) {
            // Store the expected recovery day for reference
            // The actual recovery logic is handled by the energy phase
          }
        }
        break;
      }

      case "pace_sample": {
        const { distance, time } = impact;
        if (!draft.paceSamples) {
          draft.paceSamples = {};
        }
        const bucket = Math.floor(distance / 100);
        if (!draft.paceSamples[bucket]) {
          draft.paceSamples[bucket] = [];
        }
        draft.paceSamples[bucket].push(time);
        break;
      }

      default:
        // Unknown impact type - log warning
        console.warn(`Unknown impact type: ${(impact as any).type}`);
    }
  });
}

/**
 * Apply all impacts to the state in order
 */
export function applyImpacts(context: ResolverContext): ResolverContext {
  let state = context.state;
  const impactLog: ImpactLogEntry[] = [];

  for (const impact of context.impacts) {
    state = applyImpact(state, impact);

    // Log impact based on logLevel
    if (impact.logLevel !== "never") {
      impactLog.push({
        impactId: impact.id,
        intentId: impact.intentId,
        day: impact.day,
        phase: impact.phase,
        type: impact.type,
        entityId: (impact as any).entityId || (impact as any).horseId || (impact as any).raceId || "unknown",
        details: (impact as any).reason || impact.type,
        logLevel: impact.logLevel,
      });
    }
  }

  return {
    ...context,
    state,
    impactLog: [...context.impactLog, ...impactLog],
  };
}

/**
 * Validate an intent before resolution
 * Returns { valid: boolean, reason?: string }
 */
export function validateIntent(intent: AnyIntent, state: GameState): { valid: boolean; reason?: string } {
  // Basic validation based on intent type
  switch (intent.type) {
    case "training": {
      const horse = state.horses.find((h) => h.id === intent.horseId);
      if (!horse) return { valid: false, reason: "Horse not found" };
      if (horse.energy < 20) return { valid: false, reason: "Insufficient energy" };
      break;
    }

    case "race_entry": {
      const horse = state.horses.find((h) => h.id === intent.horseId);
      const race = state.races.find((r) => r.id === intent.raceId);
      if (!horse) return { valid: false, reason: "Horse not found" };
      if (!race) return { valid: false, reason: "Race not found" };
      if (race.resolved) return { valid: false, reason: "Race already resolved" };
      if (horse.energy < 40) return { valid: false, reason: "Insufficient energy" };
      break;
    }

    case "breeding": {
      const sire = state.horses.find((h) => h.id === intent.sireId);
      const dam = state.horses.find((h) => h.id === intent.damId);
      if (!sire) return { valid: false, reason: "Sire not found" };
      if (!dam) return { valid: false, reason: "Dam not found" };
      if (sire.gender !== "horse" && sire.gender !== "gelding") return { valid: false, reason: "Invalid sire gender" };
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
      const race = state.races.find((r) => r.id === intent.raceId);
      const horse = state.horses.find((h) => h.id === intent.horseId);
      if (!race) return { valid: false, reason: "Race not found" };
      if (!horse) return { valid: false, reason: "Horse not found" };
      if (!race.claimingPrice) return { valid: false, reason: "Race is not a claiming race" };
      if (!race.entries.some((e) => e.horseId === intent.horseId)) {
        return { valid: false, reason: "Horse is not entered in this race" };
      }
      if (horse.stableId === intent.claimantStableId) {
        return { valid: false, reason: "Cannot claim own horse" };
      }
      
      // Check claimant has sufficient funds
      if (intent.claimantStableId) {
        const stable = state.npcStables.find((s) => s.id === intent.claimantStableId);
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
      const race = state.races.find((r) => r.id === intent.raceId);
      const horse = state.horses.find((h) => h.id === intent.horseId);
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
export function resolveIntentConflicts(intents: AnyIntent[], state: GameState): {
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
