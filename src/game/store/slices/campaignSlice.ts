/**
 * Campaign Slice
 * Campaign planning and management state
 */

import type { HorseCampaign, TripleCrownProgress } from "@/game/types";

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
): CampaignSlice {
  return {
    campaigns: [],
    triplecrownHistory: [],

    setCampaign: (campaign: HorseCampaign) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        campaigns: state.campaigns?.map((c: HorseCampaign) =>
          c.horseId === campaign.horseId ? campaign : c,
        ) || [campaign],
      }));
    },

    updateCampaignSlot: (
      horseId: string,
      slotIndex: number,
      patch: Partial<HorseCampaign["slots"][number]>,
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        campaigns: state.campaigns?.map((c: HorseCampaign) =>
          c.horseId === horseId
            ? {
                ...c,
                slots: c.slots.map((s, i) => (i === slotIndex ? { ...s, ...patch } : s)),
              }
            : c,
        ),
      }));
    },

    dismissCampaignFlag: (horseId: string, flagIndex: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        campaigns: state.campaigns?.map((c: HorseCampaign) =>
          c.horseId === horseId
            ? {
                ...c,
                flags: c.flags.filter((_, i) => i !== flagIndex),
              }
            : c,
        ),
      }));
    },

    deleteCampaign: (horseId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        campaigns: state.campaigns?.filter((c: HorseCampaign) => c.horseId !== horseId),
      }));
    },

    generateAutoCampaign: (horseId: string, goalType: string, targetRaceKey?: string) => {
      // Full implementation would be in a helper
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        campaigns: state.campaigns || [],
      }));
    },

    setCampaigns: (campaigns) => {
      set({ campaigns });
    },

    setTriplecrownHistory: (history) => {
      set({ triplecrownHistory: history });
    },
  };
}
