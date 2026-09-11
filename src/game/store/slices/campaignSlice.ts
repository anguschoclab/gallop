/**
 * store/slices/campaignSlice.ts - Campaign state slice
 *
 * This file provides campaign planning and management state, including campaign
 * creation, slot management, flag dismissal, campaign deletion, auto-campaign
 * generation, and Triple Crown history tracking.
 *
 * Dependencies: @/game/types (HorseCampaign, TripleCrownProgress), @/core/resolver/intents (AnyIntent), @/game/uuid (generateUUID), ../types (StoreSet, StoreGet)
 * Related files: store/index.ts (uses this slice), @/game/campaignPlanner.ts (campaign planning logic),
 *               src/core/campaign/campaignActions.ts (extracted helpers)
 */

/**
 * Campaign Slice
 * Campaign planning and management state
 */

import type { HorseCampaign } from "@/game/types";
import type { CampaignGoalType, CampaignRaceSlot } from "@/core/calendar/campaignTypes";
import type { AnyIntent } from "@/core/resolver/intents";
import {
  buildCampaignIntent,
  upsertCampaign,
  buildAutoCampaignSlots,
  buildAutoCampaign,
  updateCampaignSlotInList,
  dismissCampaignFlagInList,
  removeCampaignFromList,
  toggleAutoManagedInList,
  setCampaignTargetRaceInList,
  addCampaignSlotInList,
  removeCampaignSlotInList,
} from "@/core/campaign/campaignActions";

import type { StoreSet, StoreGet } from "../types";

export type CampaignSlice = {
  campaigns?: HorseCampaign[];
  setCampaign: (campaign: HorseCampaign) => void;
  updateCampaignSlot: (
    horseId: string,
    slotIndex: number,
    patch: Partial<HorseCampaign["slots"][number]>,
  ) => void;
  dismissCampaignFlag: (horseId: string, flagIndex: number) => void;
  deleteCampaign: (horseId: string) => void;
  generateAutoCampaign: (
    horseId: string,
    goalType: CampaignGoalType,
    targetRaceKey?: string,
  ) => void;
  toggleAutoManaged: (horseId: string, autoManaged: boolean) => void;
  setCampaignTargetRace: (horseId: string, targetRaceKey?: string) => void;
  addCampaignSlot: (horseId: string, slot: CampaignRaceSlot) => void;
  removeCampaignSlot: (horseId: string, slotIndex: number) => void;
  setCampaigns: (campaigns: HorseCampaign[]) => void;
};

/**
 * Create the campaign state slice with campaign planning and management actions.
 *
 * Provides campaign creation, slot management, flag dismissal, campaign deletion,
 * auto-campaign generation, and Triple Crown history tracking. Uses intent-based
 * state updates for campaign actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Campaign slice with state and actions
 */
export function createCampaignSlice(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): CampaignSlice {
  return {
    campaigns: [],

    setCampaign: (campaign: HorseCampaign) => {
      const s = get();
      enqueueIntent(
        buildCampaignIntent({ horseId: campaign.horseId, day: s.day }, "campaign_creation", {
          horseId: campaign.horseId,
          goalType: campaign.goalType as
            | "chase_g1"
            | "chase_g2"
            | "chase_g3"
            | "chase_major_race"
            | "maximize_earnings"
            | "develop_maiden"
            | "free_run",
          targetRaceKey: campaign.targetRaceKey,
          slots: campaign.slots,
          autoManaged: campaign.autoManaged,
        }),
      );
      set({ campaigns: upsertCampaign(s.campaigns, campaign) });
    },

    updateCampaignSlot: (
      horseId: string,
      slotIndex: number,
      patch: Partial<HorseCampaign["slots"][number]>,
    ) => {
      const s = get();
      enqueueIntent(
        buildCampaignIntent({ horseId, day: s.day }, "campaign_slot", {
          horseId,
          slotIndex,
          slot: patch,
        }),
      );
      set({ campaigns: updateCampaignSlotInList(s.campaigns, horseId, slotIndex, patch) });
    },

    dismissCampaignFlag: (horseId: string, flagIndex: number) => {
      const s = get();
      const campaign = s.campaigns?.find((c: HorseCampaign) => c.horseId === horseId);
      if (!campaign) return;
      enqueueIntent(
        buildCampaignIntent({ horseId, day: s.day }, "campaign_flag_dismissal", {
          horseId,
          flagIndex,
        }),
      );
      set({ campaigns: dismissCampaignFlagInList(s.campaigns, horseId, flagIndex) });
    },

    deleteCampaign: (horseId: string) => {
      const s = get();
      enqueueIntent(buildCampaignIntent({ horseId, day: s.day }, "campaign_deletion", { horseId }));
      set({ campaigns: removeCampaignFromList(s.campaigns, horseId) });
    },

    generateAutoCampaign: (horseId: string, goalType: CampaignGoalType, targetRaceKey?: string) => {
      const s = get();
      const horse = s.horses?.[horseId];
      const initialSlots = buildAutoCampaignSlots({
        horse,
        goalType,
        targetRaceKey,
        races: s.races ? Object.values(s.races) : [],
        currentDay: s.day,
      });

      enqueueIntent(
        buildCampaignIntent({ horseId, day: s.day }, "campaign_creation", {
          horseId,
          goalType: goalType as
            | "chase_g1"
            | "chase_g2"
            | "chase_g3"
            | "chase_major_race"
            | "maximize_earnings"
            | "develop_maiden"
            | "free_run",
          targetRaceKey,
          slots: initialSlots,
          autoManaged: true,
        }),
      );

      const newCampaign = buildAutoCampaign({
        horseId,
        goalType,
        targetRaceKey,
        slots: initialSlots,
        currentDay: s.day,
      });
      set({ campaigns: upsertCampaign(s.campaigns, newCampaign) });
    },

    toggleAutoManaged: (horseId: string, autoManaged: boolean) => {
      const s = get();
      enqueueIntent(
        buildCampaignIntent({ horseId, day: s.day }, "auto_manage_toggle", {
          horseId,
          autoManaged,
        }),
      );
      set({ campaigns: toggleAutoManagedInList(s.campaigns, horseId, autoManaged) });
    },

    setCampaignTargetRace: (horseId: string, targetRaceKey?: string) => {
      const s = get();
      const campaign = s.campaigns?.find((c) => c.horseId === horseId);
      if (!campaign) return;
      enqueueIntent(
        buildCampaignIntent({ horseId, day: s.day }, "campaign_creation", {
          horseId,
          goalType: campaign.goalType,
          targetRaceKey,
          slots: campaign.slots,
          autoManaged: campaign.autoManaged,
        }),
      );
      set({ campaigns: setCampaignTargetRaceInList(s.campaigns, horseId, targetRaceKey) });
    },

    addCampaignSlot: (horseId: string, slot: CampaignRaceSlot) => {
      const s = get();
      const campaign = s.campaigns?.find((c) => c.horseId === horseId);
      const newIndex = campaign ? campaign.slots.length : 0;
      enqueueIntent(
        buildCampaignIntent({ horseId, day: s.day }, "campaign_slot", {
          horseId,
          slotIndex: newIndex,
          slot,
        }),
      );
      set({ campaigns: addCampaignSlotInList(s.campaigns, horseId, slot) });
    },

    removeCampaignSlot: (horseId: string, slotIndex: number) => {
      const s = get();
      const campaign = s.campaigns?.find((c) => c.horseId === horseId);
      if (!campaign) return;
      set({ campaigns: removeCampaignSlotInList(s.campaigns, horseId, slotIndex) });
    },

    setCampaigns: (campaigns) => {
      set({ campaigns });
    },
  };
}
