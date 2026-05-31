/**
 * autoEntryRunner.ts - Auto-managed campaign race entry
 *
 * This file provides functionality for automatically entering horses into planned
 * races for auto-managed campaigns when within the slot's day window, if eligibility
 * and budget allow.
 *
 * Dependencies: ./types (Horse, Race, HorseCampaign, CampaignRaceSlot), ./store (ActionResult), @/core/race/eligibility (isHorseEligibleForRace)
 * Related files: campaignPlanner.ts (uses for campaign management), scheduler.ts (uses for auto-entry)
 */

// Auto Entry Runner
// For auto-managed campaigns: automatically enters the horse into planned races
// when within the slot's day window, if eligibility and budget allow.

import type { Horse, Race, HorseCampaign, CampaignRaceSlot } from "./types";
import type { ActionResult } from "@/game/store";
import { isHorseEligibleForRace } from "@/core/race/eligibility";

export type AutoEntryContext = {
  horse: Horse;
  campaign: HorseCampaign;
  races: Race[];
  currentDay: number;
  cash: number;
  enterRaceFn: (raceId: string, horseId: string) => ActionResult;
};

export type AutoEntryResult = {
  entered: { raceId: string; raceName: string; slotIndex: number }[];
  skipped: { slotIndex: number; reason: string }[];
  updatedSlots: HorseCampaign["slots"];
};

/**
 * Scans campaign slots and auto-enters eligible planned races within the day window.
 *
 * Only runs for auto-managed campaigns. Checks eligibility, budget, and race availability.
 *
 * @param ctx - Auto entry context including horse, campaign, races, current day, cash, and enter function
 * @returns Object with entered races, skipped slots with reasons, and updated slots
 */
export function runAutoEntries(ctx: AutoEntryContext): AutoEntryResult {
  const { horse, campaign, races, currentDay, cash, enterRaceFn } = ctx;

  if (!campaign.autoManaged) {
    return { entered: [], skipped: [], updatedSlots: campaign.slots };
  }

  const raceMap = new Map(races.map((r) => [r.id, r]));

  const entered: AutoEntryResult["entered"] = [];
  const skipped: AutoEntryResult["skipped"] = [];
  const updatedSlots = campaign.slots.map((slot, idx) => {
    if (slot.status !== "planned") return slot;

    const windowStart = slot.dayTarget - slot.dayWindow;
    const windowEnd = slot.dayTarget;

    if (currentDay < windowStart || currentDay > windowEnd) return slot;

    // Find the race — prefer matched raceId, fallback to matching by day + constraints
    let race: Race | undefined = slot.raceId ? raceMap.get(slot.raceId) : undefined;

    if (race && race.resolved) race = undefined;

    if (!race) {
      race = races.find(
        (r) =>
          !r.resolved &&
          r.day >= windowStart &&
          r.day <= windowEnd &&
          (!slot.constraintDistance || Math.abs(r.distance - slot.constraintDistance) <= 200) &&
          (!slot.constraintSurface ||
            (r.graded?.surface ?? r.surface) === slot.constraintSurface) &&
          !r.entries.some((e) => e.horseId === horse.id),
      );
    }

    if (!race) {
      skipped.push({ slotIndex: idx, reason: "No matching race found in window" });
      return slot;
    }

    if (race.entries.some((e) => e.horseId === horse.id)) {
      return { ...slot, raceId: race.id, status: "entered" as const };
    }

    if (cash < race.entryFee) {
      skipped.push({ slotIndex: idx, reason: `Insufficient cash (need $${race.entryFee})` });
      return slot;
    }

    const eligible = isHorseEligibleForRace(horse, race, new Set(), currentDay);
    if (!eligible) {
      skipped.push({ slotIndex: idx, reason: "Not eligible for this race" });
      return slot;
    }

    const result = enterRaceFn(race.id, horse.id);
    if (result.ok) {
      entered.push({ raceId: race.id, raceName: race.name, slotIndex: idx });
      return { ...slot, raceId: race.id, status: "entered" as const };
    } else {
      skipped.push({ slotIndex: idx, reason: !result.ok ? result.reason : "Unknown error" });
      return slot;
    }
  });

  return { entered, skipped, updatedSlots };
}

/**
 * Mark completed slots based on resolved races in the horse's race history.
 *
 * Updates slot status to "completed" for entered races that have been resolved.
 *
 * @param campaign - The horse's campaign
 * @param races - All races in the game
 * @returns Updated campaign slots with completed status
 */
export function reconcileSlotStatuses(
  campaign: HorseCampaign,
  races: Race[],
): HorseCampaign["slots"] {
  const raceMap = new Map(races.map((r) => [r.id, r]));
  return campaign.slots.map((slot) => {
    if (slot.status !== "entered") return slot;
    const race = slot.raceId ? raceMap.get(slot.raceId) : undefined;
    if (race?.resolved) {
      return { ...slot, status: "completed" as const };
    }
    return slot;
  });
}
