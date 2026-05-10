/**
 * store/slices/campaignSlice.ts - Campaign state slice
 *
 * This file provides campaign planning and management state, including campaign
 * creation, slot management, flag dismissal, campaign deletion, auto-campaign
 * generation, and Triple Crown history tracking.
 *
 * Dependencies: @/game/types (HorseCampaign, TripleCrownProgress), @/core/resolver/intents (AnyIntent), @/game/uuid (generateUUID), ../types (StoreSet, StoreGet)
 * Related files: store/index.ts (uses this slice), @/game/campaignPlanner.ts (campaign planning logic)
 */

/**
 * Campaign Slice
 * Campaign planning and management state
 */

import type { HorseCampaign, TripleCrownProgress } from "@/game/types";
import type { AnyIntent } from "@/core/resolver/intents";
import { generateUUID } from "@/game/uuid";

import type { StoreSet, StoreGet } from "../types";

export type CampaignSlice = {
  campaigns?: HorseCampaign[];
  triplecrownHistory?: TripleCrownProgress[];
  setCampaign: (campaign: HorseCampaign) => void;
  updateCampaignSlot: (
    horseId: string,
    slotIndex: number,
    patch: Partial<HorseCampaign["slots"][number]>,
  ) => void;
  dismissCampaignFlag: (horseId: string, flagIndex: number) => void;
  deleteCampaign: (horseId: string) => void;
  generateAutoCampaign: (horseId: string, goalType: string, targetRaceKey?: string) => void;
  setCampaigns: (campaigns: HorseCampaign[]) => void;
  setTriplecrownHistory: (history: TripleCrownProgress[]) => void;
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
  set: any,
  get: StoreGet,
  enqueueIntent: (intent: any) => void,
): CampaignSlice {
  return {
    campaigns: [],
    triplecrownHistory: [],

    setCampaign: (campaign: HorseCampaign) => {
      const s = get();
      enqueueIntent({
        id: generateUUID(),
        entityId: campaign.horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "campaign_creation",
        horseId: campaign.horseId,
        goalType: campaign.goalType as
          | "chase_g1"
          | "chase_g2"
          | "chase_g3"
          | "maximize_earnings"
          | "develop_maiden"
          | "free_run",
        targetRaceKey: campaign.targetRaceKey,
      });
    },

    updateCampaignSlot: (
      horseId: string,
      slotIndex: number,
      patch: Partial<HorseCampaign["slots"][number]>,
    ) => {
      const s = get();
      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "campaign_slot",
        horseId,
        slotIndex,
        slot: patch,
      });
    },

    dismissCampaignFlag: (horseId: string, flagIndex: number) => {
      const s = get();
      const campaign = s.campaigns?.find((c: HorseCampaign) => c.horseId === horseId);
      if (!campaign) return;

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "campaign_flag_dismissal",
        horseId,
        flagIndex,
      });
    },

    deleteCampaign: (horseId: string) => {
      const s = get();
      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "campaign_deletion",
        horseId,
      });
    },

    generateAutoCampaign: (horseId: string, goalType: any, targetRaceKey?: string) => {
      const s = get();
      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "campaign_creation",
        horseId,
        goalType: goalType as
          | "chase_g1"
          | "chase_g2"
          | "chase_g3"
          | "maximize_earnings"
          | "develop_maiden"
          | "free_run",
        targetRaceKey,
      });
    },

    setCampaigns: (campaigns) => {
      set({ campaigns });
    },

    setTriplecrownHistory: (history) => {
      set({ triplecrownHistory: history });
    },
  };
}
