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

import { PHASE_ORDER_SCHEDULER } from "@/platform/time/pipelineConstants";
import { makePlayerOwned } from "@/domains/horse/simulation/ownership";
import type { PipelineContext } from "@/platform/time/pipeline";
import type { HorseCampaign } from "@/platform/game/types";
import {
  buildCampaignSlots,
  generateCampaignFlags,
  updateCampaignAptitudes,
} from "@/domains/campaign/simulation/planner";
import { runAutoEntries, reconcileSlotStatuses } from "@/domains/campaign/simulation/autoEntry";
import type { AnyImpact, RaceEntryImpact } from "@/platform/resolver/impacts";
import type { InboxImpact } from "@/platform/resolver/impacts/inboxImpacts";
import { generateUUID } from "@/shared/uuid/uuid";
import { calculateAutoRegisterEntries } from "@/domains/campaign/simulation/autoRegister";
import { autoAdjustGoals, goalProgress } from "@/domains/stable/simulation/stableGoals";
import { autoCreateJournalEntry } from "@/domains/tactics/simulation/strategyJournal";

/**
 * Raises met stable-campaign goals before auto-entry scores races.
 * @param context
 */
function runGoalAutoAdjust(context: PipelineContext): PipelineContext {
  const { state, newDay } = context;
  const goals = state.stableGoals;
  if (!goals?.autoAdjust) return context;
  const progress = goalProgress(goals, Object.values(state.horses), state.cash);
  const res = autoAdjustGoals(goals, progress, newDay);
  if (res.adjustments.length === 0) return context;
  return {
    ...context,
    state: { ...state, stableGoals: res.goals },
    logs: [
      ...res.adjustments.map((a) => ({ day: newDay, text: `Stable Campaign: ${a.text}` })),
      ...context.logs,
    ],
  };
}

export const schedulerPhase = {
  name: "scheduler",
  order: PHASE_ORDER_SCHEDULER,
  execute: (context: PipelineContext): PipelineContext =>
    runDailyAutoEntry(runGoalAutoAdjust(runCampaignScheduler(context))),
};

/**
 * Daily auto-entry for the player stable (opt-in via gameplay settings).
 * Horses on an auto-managed campaign are left to the campaign planner.
 * @param context
 */
function runDailyAutoEntry(context: PipelineContext): PipelineContext {
  const { state, newDay } = context;
  if (!state.userSettings?.gameplay?.autoEnterRaces) return context;

  const campaignHorseIds = new Set(
    (state.campaigns ?? []).filter((c) => c.autoManaged).map((c) => c.horseId),
  );
  const pendingSpend = context.impacts.reduce(
    (sum, imp) =>
      imp.type === "race_entry" ? sum + ((imp as RaceEntryImpact).entryFee ?? 0) : sum,
    0,
  );
  const pendingHorseIds = new Set(
    context.impacts
      .filter((imp) => imp.type === "race_entry")
      .map((imp) => (imp as RaceEntryImpact).horseId),
  );
  const horses = Object.values(state.horses).filter(
    (h) => !campaignHorseIds.has(h.id) && !pendingHorseIds.has(h.id),
  );
  const result = calculateAutoRegisterEntries(
    horses,
    Object.values(state.races),
    state.jockeys ?? [],
    state.cash - pendingSpend,
    newDay,
    7,
    5000,
    state.stableGoals,
  );
  if (result.entries.length === 0) return context;

  const impacts: AnyImpact[] = result.entries.map(
    (entry) =>
      ({
        id: generateUUID(),
        intentId: "",
        day: newDay,
        phase: "scheduler",
        logLevel: "always",
        type: "race_entry",
        raceId: entry.raceId,
        horseId: entry.horseId,
        entryFee: entry.entryFee,
        reason: `Daily auto-entry for ${entry.horseName}`,
      }) as RaceEntryImpact,
  );
  const logs = result.entries.map((e) => ({
    day: newDay,
    text: e.goalClass
      ? `Auto-entered ${e.horseName} in ${e.raceName} (Day ${e.raceDay}) — next ${e.goalClass} campaign goal race.`
      : `Auto-entered ${e.horseName} in ${e.raceName} (Day ${e.raceDay}).`,
  }));
  let strategyJournal = state.strategyJournal;
  for (const e of result.entries) {
    strategyJournal = autoCreateJournalEntry(strategyJournal, {
      horseId: e.horseId,
      horseName: e.horseName,
      raceId: e.raceId,
      raceName: e.raceName,
      raceDay: e.raceDay,
      createdDay: newDay,
    });
  }
  return {
    ...context,
    logs: [...logs, ...context.logs],
    impacts: [...context.impacts, ...impacts],
    state: { ...state, strategyJournal },
  };
}

const campaignSchedulerImpl = {
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
    let strategyJournal = state.strategyJournal;
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
          strategyJournal = autoCreateJournalEntry(strategyJournal, {
            horseId,
            horseName: horse.name,
            raceId,
            raceName: race.name,
            raceDay: race.day,
            createdDay: newDay,
          });
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

      const updatedFlags = [...(Array.isArray(campaign.flags) ? campaign.flags : [])];
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
        strategyJournal,
      },
    };
  },
};

function runCampaignScheduler(context: PipelineContext): PipelineContext {
  return campaignSchedulerImpl.execute(context);
}
