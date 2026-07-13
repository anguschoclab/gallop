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
import type { AnyImpact, ReputationImpact } from "../impacts";
import type { ImpactHandler } from "./types";
import type {
  HorseCreationImpact,
  HorseDeletionImpact,
  HallOfFameInductionImpact,
  SeasonHistoryImpact,
} from "../impacts/horseImpacts";
import type {
  CampaignSlotImpact,
  CampaignFlagImpact,
  CampaignFlagDismissalImpact,
  CampaignCreationImpact,
  CampaignDeletionImpact,
  AutoManageToggleImpact,
} from "../impacts/campaignImpacts";
import type {
  LogImpact,
  NewsImpact,
  TrackRecordImpact,
  NameReservationImpact,
  TrainerStatsImpact,
} from "../impacts/miscImpacts";
import type {
  PaceSampleImpact,
  InsurancePurchaseImpact,
  InsuranceCancelImpact,
  InsurancePayoutImpact,
  StewardsInquiryImpact,
  StewardsResolutionImpact,
} from "../impacts/raceImpacts";
import type { TransactionImpact } from "../impacts/financialImpacts";
import { distanceBucket } from "@/core/race/beyer";
import { getReputationTier, createReputationEvent, type ReputationSource } from "@/core/reputation";
import { createTransaction } from "@/core/transactions";
import { addReservedName } from "@/core/horse/naming/reservedNames";

type ImpactHandlerFunction = (
  draft: WritableDraft<GameState>,
  impact: AnyImpact,
  lookupMaps?: {
    horseMap: Map<string, WritableDraft<GameState["horses"][number]>>;
    stableMap: Map<string, WritableDraft<GameState["npcStables"][number]>>;
    campaignMap: Map<string, WritableDraft<NonNullable<GameState["campaigns"]>[number]>>;
    raceMap?: Map<string, WritableDraft<any>>;
  },
) => void;

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  horse_creation: (draft, impact, lookupMaps) => {
    const { horse } = impact as HorseCreationImpact;
    draft.horses.push(horse);
    if (lookupMaps) lookupMaps.horseMap.set(horse.id, horse);
  },

  horse_deletion: (draft, impact, lookupMaps) => {
    const { horseId } = impact as HorseDeletionImpact;
    const index = draft.horses.findIndex((h) => h.id === horseId);
    if (index !== -1) {
      draft.horses.splice(index, 1);
      if (lookupMaps) lookupMaps.horseMap.delete(horseId);
    }
  },

  log: (draft, impact) => {
    const { text } = impact as LogImpact;
    draft.log = [{ day: impact.day, text }, ...draft.log].slice(0, 500);
  },

  pace_sample: (draft, impact) => {
    const { distance, time } = impact as PaceSampleImpact;
    if (!draft.paceSamples) {
      draft.paceSamples = {};
    }
    const bucket = distanceBucket(distance);
    if (!draft.paceSamples[bucket]) {
      draft.paceSamples[bucket] = [];
    }
    draft.paceSamples[bucket].push(time);
  },

  campaign_slot: (draft, impact, lookupMaps) => {
    const { horseId, slotIndex, slot } = impact as CampaignSlotImpact;
    const campaignMap =
      lookupMaps?.campaignMap || new Map(draft.campaigns?.map((c) => [c.horseId, c]) || []);
    const campaign = campaignMap.get(horseId);
    if (campaign) {
      campaign.slots[slotIndex] = { ...campaign.slots[slotIndex], ...slot };
    }
  },

  campaign_flag: (draft, impact, lookupMaps) => {
    const { horseId, flag } = impact as CampaignFlagImpact;
    const campaignMap =
      lookupMaps?.campaignMap || new Map(draft.campaigns?.map((c) => [c.horseId, c]) || []);
    const campaign = campaignMap.get(horseId);
    if (campaign) {
      campaign.flags.push(flag);
    }
  },

  campaign_flag_dismissal: (draft, impact, lookupMaps) => {
    const { horseId, flag, flagIndex } = impact as CampaignFlagDismissalImpact;
    const campaignMap =
      lookupMaps?.campaignMap || new Map(draft.campaigns?.map((c) => [c.horseId, c]) || []);
    const campaign = campaignMap.get(horseId);
    if (campaign) {
      if (flagIndex !== undefined) {
        campaign.flags = campaign.flags.filter((_, i) => i !== flagIndex);
      } else if (flag) {
        campaign.flags = campaign.flags.filter(
          (f) => f.type !== flag.type || f.day !== flag.day || f.message !== flag.message,
        );
      }
    }
  },

  campaign_creation: (draft, impact, lookupMaps) => {
    const { horseId, goalType, targetRaceKey } = impact as CampaignCreationImpact;
    if (!draft.campaigns) draft.campaigns = [];
    const newCampaign = {
      horseId,
      goalType,
      targetRaceKey,
      slots: [],
      flags: [],
      autoManaged: false,
      confirmedAptitudes: {
        surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
        distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
      },
      createdDay: impact.day,
      lastReviewedDay: impact.day,
    };
    draft.campaigns.push(newCampaign);
    if (lookupMaps) lookupMaps.campaignMap.set(horseId, newCampaign);
  },

  campaign_deletion: (draft, impact, lookupMaps) => {
    const { horseId } = impact as CampaignDeletionImpact;
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
    const { horseId, autoManaged } = impact as AutoManageToggleImpact;
    const campaignMap =
      lookupMaps?.campaignMap || new Map(draft.campaigns?.map((c) => [c.horseId, c]) || []);
    const campaign = campaignMap.get(horseId);
    if (campaign) {
      campaign.autoManaged = autoManaged;
    }
  },

  reputation_change: (draft, impact) => {
    const repImpact = impact as ReputationImpact;
    const { delta, reason, source, metadata } = repImpact;
    if (draft.reputation) {
      const newEvent = createReputationEvent(source, delta, reason, impact.day, metadata);
      draft.reputation.events.push(newEvent);
      draft.reputation.score += delta;
      draft.reputation.tier = getReputationTier(draft.reputation.score);
      if (source === "race_win") {
        draft.reputation.totalWins += 1;
      }
    }
  },

  transaction: (draft, impact) => {
    const { amount, category, description, horseId, raceId, recurring } =
      impact as TransactionImpact;
    if (!draft.transactions) draft.transactions = [];
    const type = amount >= 0 ? "income" : "expense";
    const newTransaction = createTransaction(
      type,
      category,
      amount,
      description,
      impact.day,
      draft.cash + amount,
      { horseId, raceId, recurring },
    );
    draft.transactions.push(newTransaction);
  },

  news_item: (draft, impact) => {
    const { newsItem } = impact as NewsImpact;
    if (!draft.news) draft.news = [];
    draft.news = [newsItem, ...draft.news].slice(0, 500);
  },

  hall_of_fame_induction: (draft, impact) => {
    const { entry } = impact as HallOfFameInductionImpact;
    if (!draft.hallOfFame) draft.hallOfFame = [];
    // Prevent duplicates using Set for O(1) lookup
    const existingIds = new Set(draft.hallOfFame.map((e) => e.horseId));
    if (!existingIds.has(entry.horseId)) {
      draft.hallOfFame.push(entry);
    }
  },

  season_history_record: (draft, impact) => {
    const { record } = impact as SeasonHistoryImpact;
    if (!draft.seasonRecords) draft.seasonRecords = [];
    draft.seasonRecords.push(record);
  },

  track_record: (draft, impact) => {
    const { record } = impact as TrackRecordImpact;
    if (!draft.trackRecords) draft.trackRecords = {};
    const key = `${record.trackId}_${record.surface}_${record.distance}`;
    draft.trackRecords[key] = record;
  },

  name_reservation: (draft, impact) => {
    const { name, deceasedOnDay } = impact as NameReservationImpact;
    // Add to reserved names list (25-year reservation)
    draft.reservedHorseNames = addReservedName(name, deceasedOnDay, draft.reservedHorseNames || []);
    // Remove from active used names
    const lower = name.toLowerCase();
    draft.usedHorseNames = draft.usedHorseNames.filter((n) => n !== lower);
  },

  trainer_stats: (draft, impact) => {
    const { staffId, raceRecord, fameDelta, specialty } = impact as TrainerStatsImpact;

    // Find the staff member in hiredStaff
    const staffIndex = draft.hiredStaff?.findIndex((s) => s.id === staffId);
    if (staffIndex !== undefined && staffIndex >= 0) {
      const staff = draft.hiredStaff![staffIndex];

      // Initialize race record if not exists
      if (!staff.raceRecord) {
        staff.raceRecord = { wins: 0, places: 0, shows: 0, starts: 0 };
      }

      // Update race record
      staff.raceRecord.wins += raceRecord.wins;
      staff.raceRecord.places += raceRecord.places;
      staff.raceRecord.shows += raceRecord.shows;
      staff.raceRecord.starts += raceRecord.starts;

      // Update fame (cap at 0-100)
      staff.fame = Math.max(0, Math.min(100, (staff.fame || 0) + fameDelta));

      // Track specialty wins if applicable
      if (specialty && raceRecord.wins > 0) {
        if (!staff.specialties) staff.specialties = [];
        if (!staff.specialtyWins) staff.specialtyWins = {};

        // Add specialty if not already present
        if (!staff.specialties.includes(specialty)) {
          staff.specialties.push(specialty);
        }

        // Increment specialty win count
        staff.specialtyWins[specialty] = (staff.specialtyWins[specialty] || 0) + raceRecord.wins;
      }
    }
  },

  insurance_purchase: (draft, impact, lookupMaps) => {
    const { horseId, policy } = impact as InsurancePurchaseImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
    if (horse) {
      horse.insurancePolicy = policy;
    }
  },

  insurance_cancel: (draft, impact, lookupMaps) => {
    const { horseId } = impact as InsuranceCancelImpact;
    const horse = lookupMaps?.horseMap.get(horseId) || draft.horses.find((h) => h.id === horseId);
    if (horse) {
      horse.insurancePolicy = undefined;
    }
  },

  insurance_payout: (draft, impact) => {
    const { amount } = impact as InsurancePayoutImpact;
    draft.cash += amount;
  },

  stewards_inquiry: (draft, impact, lookupMaps) => {
    const { inquiry } = impact as StewardsInquiryImpact;
    if (!draft.stewardsInquiries) draft.stewardsInquiries = [];
    draft.stewardsInquiries.push(inquiry);
    // Also attach to the race
    const race =
      lookupMaps?.raceMap?.get(inquiry.raceId) || draft.races.find((r) => r.id === inquiry.raceId);
    if (race) {
      if (!race.inquiries) race.inquiries = [];
      race.inquiries.push(inquiry);
    }
  },

  stewards_resolution: (draft, impact, lookupMaps) => {
    const { inquiryId, outcome, fineAmount, suspensionDays } = impact as StewardsResolutionImpact;
    const inquiry = draft.stewardsInquiries?.find((i) => i.id === inquiryId);
    if (inquiry) {
      inquiry.status = "resolved";
      inquiry.outcome = outcome;
      inquiry.fineAmount = fineAmount;
      inquiry.suspensionDays = suspensionDays;
      inquiry.resolvedDay = draft.day;

      // Apply jockey suspension if any
      if (suspensionDays && inquiry.accusedJockeyId) {
        const jockey = draft.jockeys?.find((j) => j.id === inquiry.accusedJockeyId);
        if (jockey) {
          jockey.suspendedUntil = draft.day + suspensionDays;
        }
      }
    }
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
      "reputation_change",
      "transaction",
      "news_item",
      "hall_of_fame_induction",
      "season_history_record",
      "track_record",
      "name_reservation",
      "trainer_stats",
      "insurance_purchase",
      "insurance_cancel",
      "insurance_payout",
      "stewards_inquiry",
      "stewards_resolution",
    ].includes(type);
  }

  handle(
    draft: WritableDraft<GameState>,
    impact: AnyImpact,
    lookupMaps?: {
      horseMap: Map<string, WritableDraft<any>>;
      stableMap: Map<string, WritableDraft<any>>;
      campaignMap: Map<string, WritableDraft<any>>;
      raceMap?: Map<string, WritableDraft<any>>;
    },
  ): void {
    const handler = IMPACT_HANDLERS[impact.type];
    if (handler) {
      handler(draft, impact, lookupMaps);
    }
  }
}
