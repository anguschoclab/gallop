// Scheduler Phase
// Runs campaign planner and auto-entry runner for all auto-managed campaigns.
// Order 85 — after races are generated (60) but before state serialization (100).

import type { PipelineContext } from "../pipeline";
import type { HorseCampaign } from "@/game/types";
import { buildCampaignSlots, generateCampaignFlags, updateCampaignAptitudes } from "@/game/campaignPlanner";
import { runAutoEntries, reconcileSlotStatuses } from "@/game/autoEntryRunner";

export const schedulerPhase = {
  name: "scheduler",
  order: 85,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    if (!state.campaigns || state.campaigns.length === 0) {
      return context;
    }

    const ownedHorseIds = new Set(state.horses.filter(h => h.owned).map(h => h.id));

    let updatedCampaigns: HorseCampaign[] = state.campaigns.map(campaign => {
      const horse = state.horses.find(h => h.id === campaign.horseId);
      if (!horse || !ownedHorseIds.has(horse.id)) return campaign;

      // Reconcile slot statuses from resolved races
      const reconciledSlots = reconcileSlotStatuses(campaign, state.races);
      let updated: HorseCampaign = { ...campaign, slots: reconciledSlots };

      // Update aptitudes from newly resolved races (races resolved on this day)
      for (const slot of reconciledSlots) {
        if (slot.status !== "completed" || !slot.raceId) continue;
        const wasJustCompleted = campaign.slots.find(s => s.raceId === slot.raceId)?.status === "entered";
        if (!wasJustCompleted) continue;

        const race = state.races.find(r => r.id === slot.raceId);
        if (!race) continue;
        const surf = (race.graded?.surface ?? race.surface) as "Turf" | "Dirt" | "Synthetic" | undefined;
        if (surf) {
          updated = {
            ...updated,
            confirmedAptitudes: updateCampaignAptitudes(updated.confirmedAptitudes, surf, race.distance),
          };
        }
      }

      // Review interval: rebuild slots every 7 days for auto-managed campaigns
      if (updated.autoManaged && newDay - updated.lastReviewedDay >= 7) {
        const newSlots = buildCampaignSlots({
          horse,
          campaign: updated,
          races: state.races,
          currentDay: newDay,
        });
        const newFlags = generateCampaignFlags(horse, updated, newDay);
        updated = {
          ...updated,
          slots: newSlots,
          flags: newFlags,
          lastReviewedDay: newDay,
        };
      }

      return updated;
    });

    // Auto-entry: process each campaign, collecting cash deltas
    // We simulate entry cost changes by tracking what enterRace would deduct.
    // The actual enterRace action in store.ts handles cash deduction when called
    // interactively; here we just record the intent and let the store action handle it
    // on the next user interaction cycle. For truly headless auto-entry, we build
    // a lightweight runner that mutates state directly.
    const entryLogs: { day: number; text: string }[] = [];
    let cashDelta = 0;
    let mutatedRaces = [...state.races];

    for (let i = 0; i < updatedCampaigns.length; i++) {
      const campaign = updatedCampaigns[i];
      if (!campaign.autoManaged) continue;
      const horse = state.horses.find(h => h.id === campaign.horseId);
      if (!horse) continue;

      const result = runAutoEntries({
        horse,
        campaign,
        races: mutatedRaces,
        currentDay: newDay,
        cash: state.cash + cashDelta,
        enterRaceFn: (raceId, horseId) => {
          const race = mutatedRaces.find(r => r.id === raceId);
          if (!race) return { ok: false, reason: "Race not found" };
          if (race.entries.some(e => e.horseId === horseId)) return { ok: false, reason: "Already entered" };
          race.entries.push({ horseId, owned: true, npc: false });
          cashDelta -= race.entryFee;
          entryLogs.push({ day: newDay, text: `Auto-entered ${horse.name} in ${race.name}.` });
          return { ok: true };
        },
      });

      updatedCampaigns[i] = { ...campaign, slots: result.updatedSlots };
    }

    const updatedLogs = [...entryLogs, ...context.logs];

    return {
      ...context,
      logs: updatedLogs,
      state: {
        ...state,
        campaigns: updatedCampaigns,
        cash: state.cash + cashDelta,
        races: mutatedRaces,
      },
    };
  },
};
