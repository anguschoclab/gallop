/**
 * campaignActions.ts - Pure helpers for campaign slice intent building and state updates.
 *
 * Extracted from campaignSlice.ts so the slice becomes a thin coordinator.
 * Each helper is pure (no store access) and handles one responsibility.
 *
 * Dependencies: @/game/types, @/core/resolver/intents, @/core/uuid,
 *              @/core/calendar/campaignTypes, @/core/campaign/planner
 * Related files: src/game/store/slices/campaignSlice.ts (coordinator)
 */

import type { HorseCampaign } from "@/game/types";
import type { CampaignGoalType, CampaignRaceSlot } from "@/core/calendar/campaignTypes";
import type { AnyIntent } from "@/core/resolver/intents";
import { generateUUID } from "@/core/uuid";
import { buildCampaignSlots } from "@/core/campaign/planner";
import type { Horse } from "@/game/types";
import type { Race } from "@/game/types";

/** Common envelope fields for all campaign intents. */
interface CampaignIntentEnvelope {
  horseId: string;
  day: number;
}

/**
 * Build a campaign intent with the common envelope fields pre-filled.
 * Pure: creates an intent object without touching the store.
 *
 * @param envelope - Common fields (horseId, day).
 * @param type - The campaign intent type.
 * @param payload - Type-specific intent fields.
 * @returns A complete AnyIntent ready for enqueueing.
 */
export function buildCampaignIntent<T extends Record<string, unknown>>(
  envelope: CampaignIntentEnvelope,
  type: string,
  payload: T,
): AnyIntent {
  return {
    id: generateUUID(),
    entityId: envelope.horseId,
    source: "player",
    day: envelope.day,
    priority: 100,
    type,
    ...payload,
  } as unknown as AnyIntent;
}

/**
 * Upsert a campaign into a campaigns array by horseId.
 * Pure: returns a new array, does not mutate the input.
 *
 * @param campaigns - Current campaigns array (may be undefined).
 * @param campaign - The campaign to insert or replace.
 * @returns New campaigns array with the campaign upserted.
 */
export function upsertCampaign(
  campaigns: HorseCampaign[] | undefined,
  campaign: HorseCampaign,
): HorseCampaign[] {
  if (!campaigns) return [campaign];
  const idx = campaigns.findIndex((c) => c.horseId === campaign.horseId);
  if (idx === -1) return [...campaigns, campaign];
  const updated = [...campaigns];
  updated[idx] = campaign;
  return updated;
}

/**
 * Build the initial campaign slots for an auto-generated campaign.
 * Pure: delegates to buildCampaignSlots with a dummy campaign.
 *
 * @param horse - The horse to generate slots for.
 * @param goalType - The campaign goal type.
 * @param targetRaceKey - Optional target race key.
 * @param races - All available races.
 * @param currentDay - Current game day.
 * @param args
 * @param args.horse
 * @param args.goalType
 * @param args.targetRaceKey
 * @param args.races
 * @param args.currentDay
 * @returns Array of campaign race slots (empty if horse or races missing).
 */
export function buildAutoCampaignSlots(args: {
  horse: Horse | undefined;
  goalType: CampaignGoalType;
  targetRaceKey?: string;
  races: Race[];
  currentDay: number;
}): CampaignRaceSlot[] {
  const { horse, goalType, targetRaceKey, races, currentDay } = args;
  if (!horse) return [];
  const dummyCampaign: HorseCampaign = {
    horseId: horse.id,
    goalType,
    targetRaceKey,
    slots: [],
    flags: [],
    autoManaged: true,
    confirmedAptitudes: {
      surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
      distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
    },
    createdDay: currentDay,
    lastReviewedDay: currentDay,
  };
  return buildCampaignSlots({
    horse,
    campaign: dummyCampaign,
    races,
    currentDay,
  });
}

/**
 * Build a new HorseCampaign object for auto-generation.
 * Pure: constructs the campaign object from parameters.
 *
 * @param horseId - The horse ID for the campaign.
 * @param goalType - The campaign goal type.
 * @param targetRaceKey - Optional target race key.
 * @param slots - Initial campaign slots.
 * @param currentDay - Current game day.
 * @param args
 * @param args.horseId
 * @param args.goalType
 * @param args.targetRaceKey
 * @param args.slots
 * @param args.currentDay
 * @returns A complete HorseCampaign object.
 */
export function buildAutoCampaign(args: {
  horseId: string;
  goalType: CampaignGoalType;
  targetRaceKey?: string;
  slots: CampaignRaceSlot[];
  currentDay: number;
}): HorseCampaign {
  return {
    horseId: args.horseId,
    goalType: args.goalType,
    targetRaceKey: args.targetRaceKey,
    slots: args.slots,
    flags: [],
    autoManaged: true,
    confirmedAptitudes: {
      surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
      distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
    },
    createdDay: args.currentDay,
    lastReviewedDay: args.currentDay,
  };
}

/**
 * Update a single campaign slot by horseId and slotIndex.
 * Pure: returns a new campaigns array, does not mutate the input.
 * @param campaigns - Current campaigns array.
 * @param horseId - The horse ID whose campaign to update.
 * @param slotIndex - The slot index to update.
 * @param patch - Partial patch to apply to the slot.
 */
export function updateCampaignSlotInList(
  campaigns: HorseCampaign[] | undefined,
  horseId: string,
  slotIndex: number,
  patch: Partial<HorseCampaign["slots"][number]>,
): HorseCampaign[] | undefined {
  if (!campaigns) return campaigns;
  const campaign = campaigns.find((c) => c.horseId === horseId);
  if (!campaign || !campaign.slots[slotIndex]) return campaigns;
  const updatedSlots = [...campaign.slots];
  updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], ...patch };
  return campaigns.map((c) => (c.horseId === horseId ? { ...c, slots: updatedSlots } : c));
}

/**
 * Remove a flag from a campaign by horseId and flagIndex.
 * Pure: returns a new campaigns array, does not mutate the input.
 * @param campaigns - Current campaigns array.
 * @param horseId - The horse ID whose campaign to update.
 * @param flagIndex - The flag index to remove.
 */
export function dismissCampaignFlagInList(
  campaigns: HorseCampaign[] | undefined,
  horseId: string,
  flagIndex: number,
): HorseCampaign[] | undefined {
  if (!campaigns) return campaigns;
  return campaigns.map((c) =>
    c.horseId === horseId ? { ...c, flags: c.flags.filter((_, i) => i !== flagIndex) } : c,
  );
}

/**
 * Remove a campaign from the list by horseId.
 * Pure: returns a new campaigns array, does not mutate the input.
 * @param campaigns - Current campaigns array.
 * @param horseId - The horse ID whose campaign to remove.
 */
export function removeCampaignFromList(
  campaigns: HorseCampaign[] | undefined,
  horseId: string,
): HorseCampaign[] | undefined {
  if (!campaigns) return campaigns;
  return campaigns.filter((c) => c.horseId !== horseId);
}

/**
 * Toggle the autoManaged flag on a campaign by horseId.
 * Pure: returns a new campaigns array, does not mutate the input.
 * @param campaigns - Current campaigns array.
 * @param horseId - The horse ID whose campaign to update.
 * @param autoManaged - The new autoManaged value.
 */
export function toggleAutoManagedInList(
  campaigns: HorseCampaign[] | undefined,
  horseId: string,
  autoManaged: boolean,
): HorseCampaign[] | undefined {
  if (!campaigns) return campaigns;
  return campaigns.map((c) => (c.horseId === horseId ? { ...c, autoManaged } : c));
}

/**
 * Set the target race key on a campaign by horseId.
 * Pure: returns a new campaigns array, does not mutate the input.
 * @param campaigns - Current campaigns array.
 * @param horseId - The horse ID whose campaign to update.
 * @param targetRaceKey - The new target race key.
 */
export function setCampaignTargetRaceInList(
  campaigns: HorseCampaign[] | undefined,
  horseId: string,
  targetRaceKey?: string,
): HorseCampaign[] | undefined {
  if (!campaigns) return campaigns;
  return campaigns.map((c) => (c.horseId === horseId ? { ...c, targetRaceKey } : c));
}

/**
 * Add a slot to a campaign by horseId.
 * Pure: returns a new campaigns array, does not mutate the input.
 * @param campaigns - Current campaigns array.
 * @param horseId - The horse ID whose campaign to update.
 * @param slot - The slot to add.
 */
export function addCampaignSlotInList(
  campaigns: HorseCampaign[] | undefined,
  horseId: string,
  slot: CampaignRaceSlot,
): HorseCampaign[] | undefined {
  if (!campaigns) return campaigns;
  return campaigns.map((c) => (c.horseId === horseId ? { ...c, slots: [...c.slots, slot] } : c));
}

/**
 * Remove a slot from a campaign by horseId and slotIndex.
 * Pure: returns a new campaigns array, does not mutate the input.
 * @param campaigns - Current campaigns array.
 * @param horseId - The horse ID whose campaign to update.
 * @param slotIndex - The slot index to remove.
 */
export function removeCampaignSlotInList(
  campaigns: HorseCampaign[] | undefined,
  horseId: string,
  slotIndex: number,
): HorseCampaign[] | undefined {
  if (!campaigns) return campaigns;
  return campaigns.map((c) =>
    c.horseId === horseId ? { ...c, slots: c.slots.filter((_, i) => i !== slotIndex) } : c,
  );
}
