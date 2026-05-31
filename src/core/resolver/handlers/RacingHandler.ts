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
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";

type ImpactHandlerFunction = (
  draft: WritableDraft<GameState>,
  impact: AnyImpact,
  lookupMaps?: {
    horseMap: Map<string, WritableDraft<any>>;
    stableMap: Map<string, WritableDraft<any>>;
    campaignMap: Map<string, WritableDraft<any>>;
    raceMap: Map<string, WritableDraft<any>>;
    jockeyMap: Map<string, WritableDraft<any>>;
  },
) => void;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  race_entry: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { raceId, horseId, jockeyId, weight, tactics, bumpEntryHorseId } = impactAny;
    const race = lookupMaps?.raceMap.get(raceId) || draft.races.find((r) => r.id === raceId);
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
    if (race && horse) {
      // Evict the bumped entry and refund its stable before adding the challenger
      if (bumpEntryHorseId) {
        const bumpIdx = race.entries.findIndex((e: any) => e.horseId === bumpEntryHorseId);
        if (bumpIdx !== -1) {
          const bumped = race.entries[bumpIdx];
          if (bumped.stableId) {
            const bumpedStable = draft.npcStables.find((s: any) => s.id === bumped.stableId);
            if (bumpedStable) {
              bumpedStable.cash = bumpedStable.cash + race.entryFee;
            }
          }
          race.entries.splice(bumpIdx, 1);
        }
      }
      race.entries.push({
        horseId,
        owned: !horse.stableId,
        stableId: horse.stableId,
        npc: !!horse.stableId,
        jockeyId,
        weight,
        tactics,
      });
    }
  },

  race_withdrawal: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { raceId, horseId } = impactAny;
    const race = lookupMaps?.raceMap.get(raceId) || draft.races.find((r) => r.id === raceId);
    if (race) {
      const index = race.entries.findIndex((e: any) => e.horseId === horseId);
      if (index !== -1) {
        race.entries.splice(index, 1);
      }
    }
  },

  race_result: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { raceId, results, snapshots } = impactAny;
    const race = lookupMaps?.raceMap.get(raceId) || draft.races.find((r) => r.id === raceId);
    if (race) {
      race.result = results;
      race.resolved = true;
      race.snapshots = snapshots;
    }
  },

  jockey_contract: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { jockeyId, stableId, contractUntil, stableAffinity, isApprentice, loyalty } = impactAny;
    const jockey =
      lookupMaps?.jockeyMap.get(jockeyId) || draft.jockeys?.find((j) => j.id === jockeyId);
    if (jockey) {
      jockey.stableId = stableId;
      jockey.contractUntil = contractUntil;
      if (stableAffinity !== undefined) jockey.stableAffinity = stableAffinity;
      if (isApprentice !== undefined) jockey.isApprentice = isApprentice;
      if (loyalty !== undefined) jockey.loyalty = loyalty;
    }
  },

  jockey_assignment: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { raceId, horseId, jockeyId } = impactAny;
    const race = lookupMaps?.raceMap.get(raceId) || draft.races.find((r) => r.id === raceId);
    if (race) {
      const entry = race.entries.find((e: any) => e.horseId === horseId);
      if (entry) {
        entry.jockeyId = jockeyId;
      }
    }
  },

  jockey_silk: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { jockeyId, silk } = impactAny;
    const jockey =
      lookupMaps?.jockeyMap.get(jockeyId) || draft.jockeys?.find((j) => j.id === jockeyId);
    if (jockey) {
      jockey.silk = silk;
    }
  },

  jockey_stats: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { jockeyId, careerStarts, careerWins, fame } = impactAny;
    const jockey =
      lookupMaps?.jockeyMap.get(jockeyId) || draft.jockeys?.find((j) => j.id === jockeyId);
    if (jockey) {
      jockey.careerStarts = careerStarts;
      jockey.careerWins = careerWins;
      jockey.fame = fame;
    }
  },

  race_history: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId, raceHistoryEntry } = impactAny;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
    if (horse) {
      horse.raceHistory.push(raceHistoryEntry);

      // Update courseVisits if trackId available
      const race =
        lookupMaps?.raceMap.get(raceHistoryEntry.raceId) ||
        draft.races.find((r) => r.id === raceHistoryEntry.raceId);
      if (race) {
        const trackId = race.trackId || race.graded?.trackId;
        if (trackId && raceHistoryEntry.courseVisitCount !== undefined) {
          if (!horse.courseVisits) horse.courseVisits = {};
          horse.courseVisits[trackId] = raceHistoryEntry.courseVisitCount + 1;
        }

        // Surface preference drift: racing on a surface nudges that aptitude up,
        // and the other surfaces drift slightly down. Bigger boost on strong finishes.
        const surface = (race.surface || raceHistoryEntry.surface) as
          | "Turf"
          | "Dirt"
          | "Synthetic"
          | undefined;
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
    const impactAny = impact as any;
    const { horseId, toStableId } = impactAny;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
    if (horse) {
      horse.stableId = toStableId;
      horse.owned = !toStableId;
    }
  },

  triple_crown_progress: (draft, impact) => {
    const impactAny = impact as any;
    const { horseId, triplecrownKey, year, legs, won } = impactAny;
    if (!draft.triplecrownHistory) draft.triplecrownHistory = [];
    const existing = draft.triplecrownHistory.find(
      (t) => t.horseId === horseId && t.triplecrownKey === triplecrownKey && t.year === year,
    );
    if (existing) {
      existing.legs = legs;
      existing.won = won;
    } else {
      draft.triplecrownHistory.push({ horseId, triplecrownKey, year, legs, won });
    }
  },

  tactics: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { raceId, horseId, tactics } = impactAny;
    const race = lookupMaps?.raceMap.get(raceId) || draft.races.find((r) => r.id === raceId);
    if (race) {
      const entry = race.entries.find((e: any) => e.horseId === horseId);
      if (entry) {
        entry.tactics = tactics;
      }
    }
  },

  jockey_affinity_gain: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { jockeyId, horseId, xp } = impactAny;
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
    return [
      "race_entry",
      "race_withdrawal",
      "race_result",
      "jockey_contract",
      "jockey_assignment",
      "jockey_silk",
      "jockey_stats",
      "race_history",
      "claiming",
      "triple_crown_progress",
      "tactics",
      "jockey_affinity_gain",
    ].includes(type);
  }

  handle(
    draft: WritableDraft<GameState>,
    impact: AnyImpact,
    lookupMaps?: {
      horseMap: Map<string, WritableDraft<any>>;
      stableMap: Map<string, WritableDraft<any>>;
      campaignMap: Map<string, WritableDraft<any>>;
      raceMap: Map<string, WritableDraft<any>>;
      jockeyMap: Map<string, WritableDraft<any>>;
    },
  ): void {
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
