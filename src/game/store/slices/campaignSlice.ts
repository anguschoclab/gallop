/**
 * Campaign Slice
 * Campaign planning and management state
 */

import type { HorseCampaign, TripleCrownProgress } from "@/game/types";
import type { AnyIntent } from "@/core/resolver/intents";
import { generateUUID } from "@/game/uuid";

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

export function createCampaignSlice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: any,
  enqueueIntent: (intent: AnyIntent) => void,
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
        campaign,
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
      const flag = campaign.flags[flagIndex];

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "campaign_flag_dismissal",
        horseId,
        flag,
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
        // Helper would be needed here for full auto-gen, for now just enqueuing
        campaign: {
          horseId,
          goalType,
          targetRaceKey,
          slots: [],
          flags: [],
          autoManaged: true,
          lastUpdated: s.day,
        },
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
