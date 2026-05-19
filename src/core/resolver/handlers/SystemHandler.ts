/**
 * handlers/SystemHandler.ts - System impact handler
 *
 * This file handles system-related impacts including horse creation/deletion, logging,
 * pace sampling, campaign slots/flags, auto-manage toggle, claim resolution,
 * reputation changes, transactions, news items, hall of fame induction, and season history.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), ./types (ImpactHandler), @/core/reputation (getReputationTier, createReputationEvent), @/core/transactions (createTransaction)
 * Related files: ../resolver.ts (uses handler), ../impacts/miscImpacts.ts (provides impact types)
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";
import { getReputationTier, createReputationEvent } from "@/core/reputation";
import { createTransaction } from "@/core/transactions";

type ImpactHandlerFunction = (
  draft: WritableDraft<GameState>,
  impact: AnyImpact,
  lookupMaps?: {
    horseMap: Map<string, WritableDraft<any>>;
    stableMap: Map<string, WritableDraft<any>>;
    campaignMap: Map<string, WritableDraft<any>>;
  },
) => void;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  horse_creation: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horse } = impactAny;
    draft.horses.push(horse);
    if (lookupMaps) lookupMaps.horseMap.set(horse.id, horse);
  },

  horse_deletion: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId } = impactAny;
    const index = draft.horses.findIndex((h) => h.id === horseId);
    if (index !== -1) {
      draft.horses.splice(index, 1);
      if (lookupMaps) lookupMaps.horseMap.delete(horseId);
    }
  },

  log: (draft, impact) => {
    const impactAny = impact as any;
    const { text } = impactAny;
    draft.log = [{ day: impact.day, text }, ...draft.log].slice(0, 500);
  },

  pace_sample: (draft, impact) => {
    const impactAny = impact as any;
    const { distance, time } = impactAny;
    if (!draft.paceSamples) {
      draft.paceSamples = {};
    }
    const bucket = Math.floor(distance / 100);
    if (!draft.paceSamples[bucket]) {
      draft.paceSamples[bucket] = [];
    }
    draft.paceSamples[bucket].push(time);
  },

  campaign_slot: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId, slotIndex, slot } = impactAny;
    const campaignMap =
      lookupMaps?.campaignMap || new Map(draft.campaigns?.map((c) => [c.horseId, c]) || []);
    const campaign = campaignMap.get(horseId);
    if (campaign) {
      campaign.slots[slotIndex] = { ...campaign.slots[slotIndex], ...slot };
    }
  },

  campaign_flag: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId, flag } = impactAny;
    const campaignMap =
      lookupMaps?.campaignMap || new Map(draft.campaigns?.map((c) => [c.horseId, c]) || []);
    const campaign = campaignMap.get(horseId);
    if (campaign) {
      campaign.flags.push(flag);
    }
  },

  campaign_flag_dismissal: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId, flag } = impactAny;
    const campaignMap =
      lookupMaps?.campaignMap || new Map(draft.campaigns?.map((c) => [c.horseId, c]) || []);
    const campaign = campaignMap.get(horseId);
    if (campaign) {
      campaign.flags = campaign.flags.filter(
        (f: any) =>
          f.type !== flag.type || f.day !== flag.day || f.description !== flag.description,
      );
    }
  },

  campaign_creation: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { campaign } = impactAny;
    if (!draft.campaigns) draft.campaigns = [];
    draft.campaigns.push(campaign);
    const campaignMap =
      lookupMaps?.campaignMap || new Map(draft.campaigns?.map((c) => [c.horseId, c]) || []);
    campaignMap.set(campaign.horseId, campaign);
    if (lookupMaps) lookupMaps.campaignMap.set(campaign.horseId, campaign);
  },

  campaign_deletion: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId } = impactAny;
    if (draft.campaigns) {
      const index = draft.campaigns.findIndex((c) => c.horseId === horseId);
      if (index !== -1) {
        draft.campaigns.splice(index, 1);
        const campaignMap =
          lookupMaps?.campaignMap || new Map(draft.campaigns?.map((c) => [c.horseId, c]) || []);
        campaignMap.delete(horseId);
        if (lookupMaps) lookupMaps.campaignMap.delete(horseId);
      }
    }
  },

  auto_manage_toggle: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { horseId, autoManaged } = impactAny;
    const campaignMap =
      lookupMaps?.campaignMap || new Map(draft.campaigns?.map((c) => [c.horseId, c]) || []);
    const campaign = campaignMap.get(horseId);
    if (campaign) {
      campaign.autoManaged = autoManaged;
    }
  },

  reputation_change: (draft, impact) => {
    const impactAny = impact as any;
    const { delta, reason, source, metadata } = impactAny;
    if (draft.reputation) {
      const newEvent = createReputationEvent(source as any, delta, reason, impact.day, metadata);
      draft.reputation.events.push(newEvent);
      draft.reputation.score += delta;
      draft.reputation.tier = getReputationTier(draft.reputation.score);
      if (source === "race_win") {
        draft.reputation.totalWins += 1;
      }
    }
  },

  transaction: (draft, impact) => {
    const impactAny = impact as any;
    const { amount, category, description, metadata } = impactAny;
    if (!draft.transactions) draft.transactions = [];
    const type = amount >= 0 ? "income" : "expense";
    const newTransaction = createTransaction(
      type,
      category as any,
      amount,
      description,
      impact.day,
      draft.cash + amount,
      metadata,
    );
    draft.transactions.push(newTransaction);
  },

  staff: (draft, impact, lookupMaps) => {
    const impactAny = impact as any;
    const { action, stableId, staffId, role } = impactAny;

    if (action === "hire") {
      const staffIndex = draft.staffPool.findIndex((s) => s.id === staffId);
      if (staffIndex !== -1) {
        const staff = draft.staffPool[staffIndex];
        staff.stableId = stableId;
        draft.hiredStaff.push(staff);
        draft.staffPool.splice(staffIndex, 1);

        if (stableId !== "") {
          const stable =
            lookupMaps?.stableMap.get(stableId) || draft.npcStables.find((s) => s.id === stableId);
          if (stable) {
            stable.staff[role] = staffId;
          }
        }
      }
    } else if (action === "fire") {
      const staffIndex = draft.hiredStaff.findIndex((s) => s.id === staffId);
      if (staffIndex !== -1) {
        draft.hiredStaff.splice(staffIndex, 1);

        if (stableId !== "") {
          const stable =
            lookupMaps?.stableMap.get(stableId) || draft.npcStables.find((s) => s.id === stableId);
          if (stable) {
            stable.staff[role] = null;
          }
        }
      }
    }
  },

  news_item: (draft, impact) => {
    const impactAny = impact as any;
    const { newsItem } = impactAny;
    if (!draft.news) draft.news = [];
    draft.news = [newsItem, ...draft.news].slice(0, 500);
  },

  hall_of_fame_induction: (draft, impact) => {
    const impactAny = impact as any;
    const { entry } = impactAny;
    if (!draft.hallOfFame) draft.hallOfFame = [];
    // Prevent duplicates using Set for O(1) lookup
    const existingIds = new Set(draft.hallOfFame.map((e) => e.horseId));
    if (!existingIds.has(entry.horseId)) {
      draft.hallOfFame.push(entry);
    }
  },

  season_history_record: (draft, impact) => {
    const impactAny = impact as any;
    const { record } = impactAny;
    if (!draft.seasonRecords) draft.seasonRecords = [];
    draft.seasonRecords.push(record);
  },

  track_record: (draft, impact) => {
    const impactAny = impact as any;
    const { record } = impactAny;
    if (!draft.trackRecords) draft.trackRecords = {};
    const key = `${record.trackId}_${record.surface}_${record.distance}`;
    draft.trackRecords[key] = record;
  },
};

export class SystemHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return [
      "horse_creation",
      "horse_deletion",
      "log",
      "pace_sample",
      "campaign_slot",
      "campaign_flag",
      "campaign_flag_dismissal",
      "campaign_creation",
      "campaign_deletion",
      "auto_manage_toggle",
      "claimResolution",
      "reputation_change",
      "transaction",
      "news_item",
      "hall_of_fame_induction",
      "season_history_record",
      "track_record",
    ].includes(type);
  }

  handle(
    draft: WritableDraft<GameState>,
    impact: AnyImpact,
    lookupMaps?: {
      horseMap: Map<string, WritableDraft<any>>;
      stableMap: Map<string, WritableDraft<any>>;
      campaignMap: Map<string, WritableDraft<any>>;
    },
  ): void {
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
