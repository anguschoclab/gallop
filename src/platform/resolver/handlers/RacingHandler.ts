/**
 * handlers/RacingHandler.ts - Racing impact handler
 *
 * This file handles racing-related impacts including race entry, race withdrawal,
 * race results, jockey contracts, jockey assignments, jockey silks, jockey stats,
 * race history, claiming, triple crown progress, and tactics.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses handler), ../impacts/raceImpacts.ts (provides impact types)
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/platform/game/types";
import type { AnyImpact } from "@/platform/resolver/impacts";
import type {
  ImpactHandler,
  LookupMaps,
  ImpactHandlerFunction,
} from "@/platform/resolver/handlers/types";
import type {
  RaceEntryImpact,
  RaceWithdrawalImpact,
  RaceResultImpact,
  RaceHistoryImpact,
  ClaimingImpact,
  TacticsImpact,
  RaceResultAdjustmentImpact,
} from "@/platform/resolver/impacts/raceImpacts";
import type {
  JockeyContractImpact,
  JockeyReleaseImpact,
  JockeyAssignmentImpact,
  JockeySilkImpact,
  JockeyStatsImpact,
  JockeyAffinityImpact,
} from "@/platform/resolver/impacts/jockeyImpacts";
import type { TripleCrownProgressImpact } from "@/platform/resolver/impacts/campaignImpacts";
import {
  awardTraitXp,
  checkTraitUnlock,
  checkTraitAtrophy,
} from "@/domains/jockey/simulation/traitProgression";
import type { JockeyTrait } from "@/domains/jockey/model/types";
import { isPlayerOwned, makePlayerOwned, makeNpcOwned } from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";
import { createTransaction } from "@/domains/transactions/model/transactionTypes";

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  race_entry: (draft, impact, lookupMaps) => {
    const { raceId, horseId, jockeyId, weight, jockeyInstructions, bumpEntryHorseId, entryFee } =
      impact as RaceEntryImpact;
    const race = lookupMaps?.raceMap.get(raceId) || draft.races[raceId];
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses[horseId];
    if (race && horse) {
      // Evict the bumped entry and refund its stable before adding the challenger.
      // The entry phase may already have evicted it for a same-day race, so
      // fall back to the bumped horse's ownership for the refund.
      if (bumpEntryHorseId) {
        const bumpIdx = race.entries.findIndex((e) => e.horseId === bumpEntryHorseId);
        const bumpedOwnership =
          bumpIdx !== -1
            ? race.entries[bumpIdx].ownership
            : (lookupMaps?.horseMap.get(bumpEntryHorseId) || draft.horses[bumpEntryHorseId])
                ?.ownership;
        if (bumpedOwnership?.type === "npc") {
          const bumpedStableId = bumpedOwnership.stableId;
          const bumpedStable =
            lookupMaps?.stableMap.get(bumpedStableId) ||
            draft.npcStables.find((s) => s.id === bumpedStableId);
          if (bumpedStable) {
            bumpedStable.cash = bumpedStable.cash + race.entryFee;
          }
        }
        if (bumpIdx !== -1) race.entries.splice(bumpIdx, 1);
      }
      // Idempotent: a same-day race already carries this entry (added by the
      // entry phase so the race could run with it) — refresh, don't duplicate.
      const existing = race.entries.find((e) => e.horseId === horseId);
      if (existing) {
        if (jockeyId) existing.jockeyId = jockeyId;
        if (weight !== undefined) existing.weight = weight;
        if (jockeyInstructions) existing.jockeyInstructions = jockeyInstructions;
      } else {
        race.entries.push({
          horseId,
          ownership: horse.ownership,
          jockeyId,
          weight,
          jockeyInstructions,
        });
      }

      // Deduct entry fee from the appropriate owner
      if (entryFee > 0) {
        if (isPlayerOwned(horse)) {
          draft.cash = (draft.cash ?? 0) - entryFee;
          if (!draft.transactions) draft.transactions = [];
          draft.transactions.push(
            createTransaction(
              "expense",
              "entry_fee",
              -entryFee,
              `Entry fee for ${race.name}`,
              impact.day,
              draft.cash,
              { horseId, raceId },
            ),
          );
        } else if (horse.ownership.type === "npc") {
          const stableId = horse.ownership.stableId;
          const stable =
            lookupMaps?.stableMap.get(stableId) || draft.npcStables.find((s) => s.id === stableId);
          if (stable) {
            stable.cash = Math.max(0, stable.cash - entryFee);
          }
        }
      }
    }
  },

  race_withdrawal: (draft, impact, lookupMaps) => {
    const { raceId, horseId, refundAmount } = impact as RaceWithdrawalImpact;
    const race = lookupMaps?.raceMap.get(raceId) || draft.races[raceId];
    if (race) {
      const index = race.entries.findIndex((e) => e.horseId === horseId);
      if (index !== -1) {
        const entry = race.entries[index];
        race.entries.splice(index, 1);

        // Refund entry fee to the appropriate owner
        if (refundAmount > 0) {
          if (entry.ownership.type === "player") {
            draft.cash = (draft.cash ?? 0) + refundAmount;
          } else if (entry.ownership.type === "npc") {
            const stableId = entry.ownership.stableId;
            const stable =
              lookupMaps?.stableMap.get(stableId) ||
              draft.npcStables.find((s) => s.id === stableId);
            if (stable) {
              stable.cash += refundAmount;
            }
          }
        }
      }
    }
  },

  race_result: (draft, impact, lookupMaps) => {
    const { raceId, results, snapshots } = impact as RaceResultImpact;
    const race = lookupMaps?.raceMap.get(raceId) || draft.races[raceId];
    if (race) {
      race.result = results;
      race.resolved = true;
      race.snapshots = snapshots;
    }
  },

  jockey_contract: (draft, impact, lookupMaps) => {
    const { jockeyId, stableId, contractUntil, stableAffinity, isApprentice, loyalty } =
      impact as JockeyContractImpact;
    const jockey =
      lookupMaps?.jockeyMap.get(jockeyId) || draft.jockeys?.find((j) => j.id === jockeyId);
    if (jockey) {
      jockey.stableId = stableId;
      jockey.contractUntil = contractUntil;
      if (stableAffinity !== undefined) jockey.stableAffinity = stableAffinity;
      if (isApprentice !== undefined) jockey.isApprentice = isApprentice;
      if (loyalty !== undefined) jockey.loyalty = loyalty;
      // Ensure apprentice progression is initialized for apprentices
      if (jockey.isApprentice && !jockey.apprenticeProgression) {
        jockey.apprenticeProgression = {
          jockeyId: jockey.id,
          status: "apprentice",
          careerWins: jockey.careerWins,
          apprenticeWins: 0,
          startDate: draft.day,
        };
      }
    }
  },

  jockey_release: (draft, impact, lookupMaps) => {
    const { jockeyId } = impact as JockeyReleaseImpact;
    const jockey =
      lookupMaps?.jockeyMap.get(jockeyId) || draft.jockeys?.find((j) => j.id === jockeyId);
    if (jockey) {
      jockey.stableId = undefined;
      jockey.contractUntil = undefined;
    }
  },

  jockey_assignment: (draft, impact, lookupMaps) => {
    const { raceId, horseId, jockeyId } = impact as JockeyAssignmentImpact;
    const race = lookupMaps?.raceMap.get(raceId) || draft.races[raceId];
    if (race) {
      const entry = race.entries.find((e) => e.horseId === horseId);
      if (entry) {
        entry.jockeyId = jockeyId;
      }
    }
  },

  jockey_silk: (draft, impact, lookupMaps) => {
    const { jockeyId, silk } = impact as JockeySilkImpact;
    const jockey =
      lookupMaps?.jockeyMap.get(jockeyId) || draft.jockeys?.find((j) => j.id === jockeyId);
    if (jockey) {
      jockey.silk = silk;
    }
  },

  jockey_stats: (draft, impact, lookupMaps) => {
    const {
      jockeyId,
      careerStarts,
      careerWins,
      fame,
      stableAffinityDelta,
      apprenticeProgression,
      traitXpAwards,
    } = impact as JockeyStatsImpact;
    const jockey =
      lookupMaps?.jockeyMap.get(jockeyId) || draft.jockeys?.find((j) => j.id === jockeyId);
    if (jockey) {
      jockey.careerStarts = careerStarts;
      jockey.careerWins = careerWins;
      jockey.fame = fame;
      if (stableAffinityDelta) {
        jockey.stableAffinity = Math.min(100, (jockey.stableAffinity ?? 0) + stableAffinityDelta);
      }
      // Update apprentice progression if provided
      if (apprenticeProgression !== undefined) {
        jockey.apprenticeProgression = apprenticeProgression;
        // Graduate apprentice if threshold reached
        if (apprenticeProgression.status !== "apprentice") {
          jockey.isApprentice = false;
        }
      }
      // Process trait XP awards
      if (traitXpAwards) {
        let updated = jockey;
        for (const [traitKey, xp] of Object.entries(traitXpAwards)) {
          updated = awardTraitXp(updated, traitKey as JockeyTrait, xp);
        }
        updated = checkTraitUnlock(updated, impact.day);
        updated = checkTraitAtrophy(updated);
        jockey.traitProgression = updated.traitProgression;
        jockey.traits = updated.traits;
      }
    }
  },

  race_history: (draft, impact, lookupMaps) => {
    const { horseId, raceHistoryEntry } = impact as RaceHistoryImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses[horseId];
    if (horse) {
      horse.raceHistory.push(raceHistoryEntry);

      // Update courseVisits if trackId available
      const race =
        lookupMaps?.raceMap.get(raceHistoryEntry.raceId) || draft.races[raceHistoryEntry.raceId];
      if (race) {
        const trackId = race.trackId || race.graded?.trackId;
        if (trackId && raceHistoryEntry.courseVisitCount !== undefined) {
          if (!horse.courseVisits) horse.courseVisits = {};
          horse.courseVisits[trackId] = raceHistoryEntry.courseVisitCount + 1;
        }

        // Surface preference drift: racing on a surface nudges that aptitude up,
        // and the other surfaces drift slightly down. Bigger boost on strong finishes.
        const surface = (race.surface || raceHistoryEntry.surface) as
          "Turf" | "Dirt" | "Synthetic" | undefined;
        if (surface && horse.surfaceAptitude && horse.surfaceAptitude[surface] !== undefined) {
          const pos = raceHistoryEntry.position ?? 99;
          const performanceBoost = pos === 1 ? 0.012 : pos <= 3 ? 0.008 : pos <= 6 ? 0.005 : 0.003;
          const decay = 0.0015;
          const APT_MAX = 1.1;
          const APT_MIN = 0.75;
          for (const s of ["Turf", "Dirt", "Synthetic"] as const) {
            if (horse.surfaceAptitude[s] === undefined) continue;
            if (s === surface) {
              horse.surfaceAptitude[s] = Math.min(
                APT_MAX,
                horse.surfaceAptitude[s] + performanceBoost,
              );
            } else {
              horse.surfaceAptitude[s] = Math.max(APT_MIN, horse.surfaceAptitude[s] - decay);
            }
          }
        }
      }
    }
  },

  claiming: (draft, impact, lookupMaps) => {
    const { horseId, toStableId } = impact as ClaimingImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses[horseId];
    if (horse) {
      horse.ownership = toStableId ? makeNpcOwned(asNpcStableId(toStableId)) : makePlayerOwned();
    }
  },

  triple_crown_progress: (draft, impact) => {
    const { horseId, triplecrownKey, year, legs, won } = impact as TripleCrownProgressImpact;
    if (!draft.triplecrownHistory) draft.triplecrownHistory = [];
    const tcHistoryMap = new Map<string, NonNullable<typeof draft.triplecrownHistory>[number]>();
    for (const t of draft.triplecrownHistory) {
      tcHistoryMap.set(`${t.horseId}:${t.triplecrownKey}:${t.year}`, t);
    }
    const existing = tcHistoryMap.get(`${horseId}:${triplecrownKey}:${year}`);
    if (existing) {
      existing.legs = legs;
      existing.won = won;
    } else {
      draft.triplecrownHistory.push({ horseId, triplecrownKey, year, legs, won });
    }
  },

  tactics: (draft, impact, lookupMaps) => {
    const { raceId, horseId, jockeyInstructions } = impact as TacticsImpact;
    const race = lookupMaps?.raceMap.get(raceId) || draft.races[raceId];
    if (race) {
      const entry = race.entries.find((e) => e.horseId === horseId);
      if (entry) {
        entry.jockeyInstructions = jockeyInstructions;
      }
    }
  },

  race_result_adjustment: (draft, impact, lookupMaps) => {
    const { raceId, adjustedResults } = impact as RaceResultAdjustmentImpact;
    const race = lookupMaps?.raceMap.get(raceId) || draft.races[raceId];
    if (race && race.result) {
      // Apply adjusted results after stewards DQ
      const resultMap = new Map(race.result.map((r) => [r.horseId, r]));
      for (const adj of adjustedResults) {
        const resultEntry = resultMap.get(adj.horseId);
        if (resultEntry) {
          resultEntry.position = adj.position;
        }
      }
      // Re-sort results by position
      race.result.sort((a, b) => a.position - b.position);
    }
  },

  jockey_affinity_gain: (draft, impact, lookupMaps) => {
    const { jockeyId, horseId, xp } = impact as JockeyAffinityImpact;
    const jockey =
      lookupMaps?.jockeyMap.get(jockeyId) || draft.jockeys?.find((j) => j.id === jockeyId);
    if (jockey) {
      if (!jockey.affinityMap) jockey.affinityMap = {};
      jockey.affinityMap[horseId] = (jockey.affinityMap[horseId] || 0) + xp;
    }
  },
};

export class RacingHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return Object.hasOwn(IMPACT_HANDLERS, type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact, lookupMaps?: LookupMaps): void {
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
