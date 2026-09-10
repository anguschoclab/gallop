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

import type { HorseCampaign } from "@/game/types";
import type { CampaignGoalType, CampaignRaceSlot } from "@/core/calendar/campaignTypes";
import type { AnyIntent } from "@/core/resolver/intents";
import { generateUUID } from "@/core/uuid";
import { buildCampaignSlots } from "@/core/campaign/planner";

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
          | "chase_major_race"
          | "maximize_earnings"
          | "develop_maiden"
          | "free_run",
        targetRaceKey: campaign.targetRaceKey,
        slots: campaign.slots,
        autoManaged: campaign.autoManaged,
      });
      if (s.campaigns) {
        const existingIdx = s.campaigns.findIndex((c) => c.horseId === campaign.horseId);
        if (existingIdx !== -1) {
          const updated = [...s.campaigns];
          updated[existingIdx] = campaign;
          set({ campaigns: updated });
        } else {
          set({ campaigns: [...s.campaigns, campaign] });
        }
      }
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
      if (s.campaigns) {
        const campaign = s.campaigns.find((c) => c.horseId === horseId);
        if (campaign && campaign.slots[slotIndex]) {
          const updatedSlots = [...campaign.slots];
          updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], ...patch };
          set({
            campaigns: s.campaigns.map((c) =>
              c.horseId === horseId ? { ...c, slots: updatedSlots } : c,
            ),
          });
        }
      }
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
      set({
        campaigns: (s.campaigns ?? []).map((c) =>
          c.horseId === horseId ? { ...c, flags: c.flags.filter((_, i) => i !== flagIndex) } : c,
        ),
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
      if (s.campaigns) {
        set({
          campaigns: s.campaigns.filter((c) => c.horseId !== horseId),
        });
      }
    },

    generateAutoCampaign: (horseId: string, goalType: CampaignGoalType, targetRaceKey?: string) => {
      const s = get();
      const horse = s.horses?.[horseId];
      let initialSlots: CampaignRaceSlot[] = [];
      if (horse && s.races) {
        const dummyCampaign: HorseCampaign = {
          horseId,
          goalType,
          targetRaceKey,
          slots: [],
          flags: [],
          autoManaged: true,
          confirmedAptitudes: {
            surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
            distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
          },
          createdDay: s.day,
          lastReviewedDay: s.day,
        };
        initialSlots = buildCampaignSlots({
          horse,
          campaign: dummyCampaign,
          races: Object.values(s.races),
          currentDay: s.day,
        });
      }

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
          | "chase_major_race"
          | "maximize_earnings"
          | "develop_maiden"
          | "free_run",
        targetRaceKey,
        slots: initialSlots,
        autoManaged: true,
      });

      if (s.campaigns) {
        const existingIdx = s.campaigns.findIndex((c) => c.horseId === horseId);
        const newCampaign: HorseCampaign = {
          horseId,
          goalType,
          targetRaceKey,
          slots: initialSlots,
          flags: [],
          autoManaged: true,
          confirmedAptitudes: {
            surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
            distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
          },
          createdDay: s.day,
          lastReviewedDay: s.day,
        };
        if (existingIdx !== -1) {
          const updated = [...s.campaigns];
          updated[existingIdx] = newCampaign;
          set({ campaigns: updated });
        } else {
          set({ campaigns: [...s.campaigns, newCampaign] });
        }
      }
    },

    toggleAutoManaged: (horseId: string, autoManaged: boolean) => {
      const s = get();
      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "auto_manage_toggle",
        horseId,
        autoManaged,
      });
      if (s.campaigns) {
        set({
          campaigns: s.campaigns.map((c) => (c.horseId === horseId ? { ...c, autoManaged } : c)),
        });
      }
    },

    setCampaignTargetRace: (horseId: string, targetRaceKey?: string) => {
      const s = get();
      const campaign = s.campaigns?.find((c) => c.horseId === horseId);
      if (!campaign) return;
      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "campaign_creation",
        horseId,
        goalType: campaign.goalType,
        targetRaceKey,
        slots: campaign.slots,
        autoManaged: campaign.autoManaged,
      });
      set({
        campaigns: (s.campaigns ?? []).map((c) =>
          c.horseId === horseId ? { ...c, targetRaceKey } : c,
        ),
      });
    },

    addCampaignSlot: (horseId: string, slot: CampaignRaceSlot) => {
      const s = get();
      const campaign = s.campaigns?.find((c) => c.horseId === horseId);
      const newIndex = campaign ? campaign.slots.length : 0;
      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "campaign_slot",
        horseId,
        slotIndex: newIndex,
        slot,
      });
      if (s.campaigns && campaign) {
        set({
          campaigns: s.campaigns.map((c) =>
            c.horseId === horseId ? { ...c, slots: [...c.slots, slot] } : c,
          ),
        });
      }
    },

    removeCampaignSlot: (horseId: string, slotIndex: number) => {
      const s = get();
      const campaign = s.campaigns?.find((c) => c.horseId === horseId);
      if (!campaign) return;
      const updatedSlots = campaign.slots.filter((_, i) => i !== slotIndex);
      set({
        campaigns: (s.campaigns ?? []).map((c) =>
          c.horseId === horseId ? { ...c, slots: updatedSlots } : c,
        ),
      });
    },

    setCampaigns: (campaigns) => {
      set({ campaigns });
    },
  };
}
