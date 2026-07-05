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

import { PHASE_ORDER_SCHEDULER } from "@/constants";
import type { PipelineContext } from "../pipeline";
import type { HorseCampaign } from "@/game/types";
import {
  buildCampaignSlots,
  generateCampaignFlags,
  updateCampaignAptitudes,
} from "@/core/campaign/planner";
import { runAutoEntries, reconcileSlotStatuses } from "@/core/campaign/autoEntry";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { RaceEntryImpact, CashImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";

export const schedulerPhase = {
  name: "scheduler",
  order: PHASE_ORDER_SCHEDULER,
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
      const slotByRaceId = new Map(campaign.slots.map((s) => [s.raceId, s]));
      for (const slot of reconciledSlots) {
        if (slot.status !== "completed" || !slot.raceId) continue;
        const wasJustCompleted = slotByRaceId.get(slot.raceId)?.status === "entered";
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
    const autoEntryImpacts: AnyImpact[] = [];
    let cashDelta = 0;

    // Maintain a mutable race snapshot so subsequent auto-entry calls see
    // entries already committed by earlier campaigns, without touching state.races.
    const currentRaces = new Map(state.races.map((r) => [r.id, { ...r, entries: [...r.entries] }]));

    for (let i = 0; i < updatedCampaigns.length; i++) {
      const campaign = updatedCampaigns[i];
      if (!campaign.autoManaged) continue;
      const horse = horseMap.get(campaign.horseId);
      if (!horse) continue;

      const result = runAutoEntries({
        horse,
        campaign,
        races: Array.from(currentRaces.values()),
        currentDay: newDay,
        cash: state.cash + cashDelta,
        enterRaceFn: (raceId, horseId) => {
          const race = currentRaces.get(raceId);
          if (!race) return { ok: false, reason: "Race not found" };
          if (race.entries.some((e) => e.horseId === horseId))
            return { ok: false, reason: "Already entered" };
          if (race.entries.length >= race.fieldSize) return { ok: false, reason: "Race full" };

          currentRaces.set(raceId, {
            ...race,
            entries: [...race.entries, { horseId, owned: true, npc: false }],
          });
          cashDelta -= race.entryFee;
          entryLogs.push({ day: newDay, text: `Auto-entered ${horse.name} in ${race.name}.` });
          autoEntryImpacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "scheduler",
            logLevel: "always",
            type: "race_entry",
            raceId,
            horseId,
            entryFee: race.entryFee,
            reason: `Auto-campaign entry for ${horse.name}`,
          } as RaceEntryImpact);
          return { ok: true };
        },
      });

      updatedCampaigns[i] = { ...campaign, slots: result.updatedSlots };
    }

    if (cashDelta < 0) {
      autoEntryImpacts.push({
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "scheduler",
        logLevel: "conditional",
        type: "cash_change",
        entityId: "player",
        amount: cashDelta,
        reason: "Auto-campaign race entry fees",
      } as CashImpact);
    }

    const updatedLogs = [...entryLogs, ...context.logs];

    return {
      ...context,
      logs: updatedLogs,
      impacts: [...context.impacts, ...autoEntryImpacts],
      state: {
        ...state,
        campaigns: updatedCampaigns,
      },
    };
  },
};
