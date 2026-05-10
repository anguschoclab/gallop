/**
 * phases/schedulerPhase.ts - Scheduler phase
 *
 * This file provides the scheduler phase that runs campaign planner and
 * auto-entry runner for all auto-managed campaigns.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/types (HorseCampaign), @/game/campaignPlanner (buildCampaignSlots, generateCampaignFlags, updateCampaignAptitudes), @/game/autoEntryRunner (runAutoEntries, reconcileSlotStatuses)
 * Related files: ../pipeline.ts (uses phase)
 */

// Scheduler Phase
// Runs campaign planner and auto-entry runner for all auto-managed campaigns.
// Order 85 — after races are generated (60) but before state serialization (100).

import type { PipelineContext } from "../pipeline";
import type { HorseCampaign } from "@/game/types";
import {
  buildCampaignSlots,
  generateCampaignFlags,
  updateCampaignAptitudes,
} from "@/game/campaignPlanner";
import { runAutoEntries, reconcileSlotStatuses } from "@/game/autoEntryRunner";

export const schedulerPhase = {
  name: "scheduler",
  order: 85,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    if (!state.campaigns || state.campaigns.length === 0) {
      return context;
    }

    const horseMap = new Map(state.horses.map((h) => [h.id, h]));
    const raceMap = new Map(state.races.map((r) => [r.id, r]));

    const updatedCampaigns: HorseCampaign[] = state.campaigns.map((campaign) => {
      const horse = horseMap.get(campaign.horseId);
      if (!horse || !horse.owned) return campaign;

      // Reconcile slot statuses from resolved races
      const reconciledSlots = reconcileSlotStatuses(campaign, state.races);
      let updated: HorseCampaign = { ...campaign, slots: reconciledSlots };

      // Update aptitudes from newly resolved races
      for (const slot of reconciledSlots) {
        if (slot.status !== "completed" || !slot.raceId) continue;
        const wasJustCompleted =
          campaign.slots.find((s) => s.raceId === slot.raceId)?.status === "entered";
        if (!wasJustCompleted) continue;

        const race = raceMap.get(slot.raceId);
        if (!race) continue;
        const surf = (race.graded?.surface ?? race.surface) as
          | "Turf"
          | "Dirt"
          | "Synthetic"
          | undefined;
        if (surf) {
          updated = {
            ...updated,
            confirmedAptitudes: updateCampaignAptitudes(
              updated.confirmedAptitudes,
              surf,
              race.distance,
            ),
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

    const entryLogs: { day: number; text: string }[] = [];
    let cashDelta = 0;
    const mutatedRaces = [...state.races];

    for (let i = 0; i < updatedCampaigns.length; i++) {
      const campaign = updatedCampaigns[i];
      if (!campaign.autoManaged) continue;
      const horse = horseMap.get(campaign.horseId);
      if (!horse) continue;

      const result = runAutoEntries({
        horse,
        campaign,
        races: mutatedRaces,
        currentDay: newDay,
        cash: state.cash + cashDelta,
        enterRaceFn: (raceId, horseId) => {
          const race = mutatedRaces.find((r) => r.id === raceId);
          if (!race) return { ok: false, reason: "Race not found" };
          if (race.entries.some((e) => e.horseId === horseId))
            return { ok: false, reason: "Already entered" };
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
