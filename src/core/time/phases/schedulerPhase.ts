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
import { makePlayerOwned } from "@/core/horse/ownership";
import type { PipelineContext } from "../pipeline";
import type { HorseCampaign } from "@/game/types";
import {
  buildCampaignSlots,
  generateCampaignFlags,
  updateCampaignAptitudes,
} from "@/core/campaign/planner";
import { runAutoEntries, reconcileSlotStatuses } from "@/core/campaign/autoEntry";
import type { AnyImpact, RaceEntryImpact } from "@/core/resolver/impacts/index";
import type { InboxImpact } from "@/core/resolver/impacts/inboxImpacts";
import { generateUUID } from "@/core/uuid";

export const schedulerPhase = {
  name: "scheduler",
  order: PHASE_ORDER_SCHEDULER,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    if (!state.campaigns || state.campaigns.length === 0) {
      return context;
    }

    const { horseMap, raceMap } = context;

    const updatedCampaigns: HorseCampaign[] = state.campaigns.map((campaign) => {
      const horse = horseMap.get(campaign.horseId);
      if (!horse || horse.ownership?.type !== "player") return campaign;

      // Reconcile slot statuses from resolved races
      const reconciledSlots = reconcileSlotStatuses(campaign, Object.values(state.races));
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
          "Turf" | "Dirt" | "Synthetic" | undefined;
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
          races: Object.values(state.races),
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

    // Collect horse+race pairs already entered via pending impacts from raceEntryResolution.
    // These impacts haven't been applied to state.races yet (impactApplication runs at order 200),
    // so schedulerPhase must check them to avoid double-entering the same horse.
    const pendingEntryKeys = new Set<string>();
    for (const imp of context.impacts) {
      if (imp.type === "race_entry") {
        const re = imp as RaceEntryImpact;
        pendingEntryKeys.add(`${re.raceId}:${re.horseId}`);
      }
    }

    // Maintain a mutable race snapshot so subsequent auto-entry calls see
    // entries already committed by earlier campaigns, without touching state.races.
    const currentRaces = new Map(
      Object.values(state.races).map((r) => [r.id, { ...r, entries: [...r.entries] }]),
    );

    for (let i = 0; i < updatedCampaigns.length; i++) {
      const campaign = updatedCampaigns[i];
      if (!campaign.autoManaged) continue;
      const horse = horseMap.get(campaign.horseId);
      if (!horse || horse.ownership?.type !== "player") continue;

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
          if (pendingEntryKeys.has(`${raceId}:${horseId}`))
            return { ok: false, reason: "Already entered via intent pipeline" };
          if (race.entries.length >= race.fieldSize) return { ok: false, reason: "Race full" };

          currentRaces.set(raceId, {
            ...race,
            entries: [...race.entries, { horseId, ownership: makePlayerOwned() }],
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

      const updatedFlags = [...(campaign.flags ?? [])];
      for (const skipped of result.skipped) {
        if (skipped.reason.toLowerCase().includes("full")) {
          const slot = campaign.slots[skipped.slotIndex];
          const race = slot?.raceId ? currentRaces.get(slot.raceId) : undefined;
          const raceName = race?.name ?? "Scheduled Race";
          autoEntryImpacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "scheduler",
            logLevel: "always",
            type: "inbox_message",
            message: {
              day: newDay,
              category: "race",
              priority: "urgent",
              title: `Bumped: ${horse.name} (Field Full)`,
              body: `${horse.name} was bumped from ${raceName} (Day ${slot?.dayTarget ?? newDay}) because the field reached maximum capacity (${race?.fieldSize ?? 12}/${race?.fieldSize ?? 12}). Review campaign strategy to select an alternative race.`,
              cta: {
                label: "Review Strategy",
                route: "strategy.$horseId",
                params: { horseId: horse.id },
              },
            },
          } as InboxImpact);

          updatedFlags.push({
            day: newDay,
            type: "field_full",
            message: `Bumped from ${raceName} on Day ${slot?.dayTarget ?? newDay} — field full. Alternative race needed.`,
            dismissed: false,
          });

          entryLogs.push({
            day: newDay,
            text: `Bumped ${horse.name} from ${raceName} (field full).`,
          });
        }
      }

      updatedCampaigns[i] = {
        ...campaign,
        slots: result.updatedSlots,
        flags: updatedFlags,
      };
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
