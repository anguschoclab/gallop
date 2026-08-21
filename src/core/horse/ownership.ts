/**
 * ownership.ts - Canonical horse ownership model
 *
 * The single source of truth for horse ownership. Uses a discriminated union
 * to make the three ownership states (player, NPC, unowned) type-safe and
 * mutually exclusive, eliminating the historical ambiguity where an empty
 * `stableId` was overloaded to mean "player owned" — which also matched
 * world-generated stock (market listings, unassigned foals, free agents).
 *
 * Dependencies: @/core/types/branded (branded ID types)
 */

import type { NpcStableId, OwnerKey, PlayerOwnerId } from "@/core/types/branded";
import { asNpcStableId, asPlayerOwnerId } from "@/core/types/branded";

// --- Ownership discriminated union ---

export type HorseOwnership =
  { type: "player" } | { type: "npc"; stableId: NpcStableId } | { type: "unowned" };

// --- Constants ---

const PLAYER_OWNER_ID_VALUE = "__player__";

/** Synthetic branded owner id used when bucketing the player alongside NPC stables. */
export const PLAYER_OWNER_ID: PlayerOwnerId = asPlayerOwnerId(PLAYER_OWNER_ID_VALUE);

// --- Ownership predicates ---

/** True only when the player's stable owns this horse.
 * @param horse - The horse (or undefined/null) to check.
 */
export function isPlayerOwned(horse: { ownership: HorseOwnership } | undefined | null): boolean {
  return horse?.ownership.type === "player";
}

/** True when an NPC stable owns this horse.
 * @param horse - The horse (or undefined/null) to check.
 */
export function isNpcOwned(horse: { ownership: HorseOwnership } | undefined | null): boolean {
  return horse?.ownership.type === "npc";
}

/** True when nobody owns this horse (world/market stock, unassigned foals).
 * @param horse - The horse (or undefined/null) to check.
 */
export function isUnowned(horse: { ownership: HorseOwnership } | undefined | null): boolean {
  return horse?.ownership.type === "unowned";
}

// --- Ownership accessors ---

/** Owner bucket key: the player's synthetic id, the NPC stable id, or null.
 * @param horse - The horse (or undefined/null) to check.
 */
export function ownerKey(horse: { ownership: HorseOwnership } | undefined | null): OwnerKey | null {
  if (!horse) return null;
  switch (horse.ownership.type) {
    case "player":
      return PLAYER_OWNER_ID;
    case "npc":
      return horse.ownership.stableId;
    case "unowned":
      return null;
  }
}

/** Returns the NpcStableId for an NPC-owned horse, or null for player/unowned.
 * @param horse - The horse (or undefined/null) to check.
 */
export function getStableId(
  horse: { ownership: HorseOwnership } | undefined | null,
): NpcStableId | null {
  if (!horse) return null;
  return horse.ownership.type === "npc" ? horse.ownership.stableId : null;
}

// --- Ownership constructors ---

export function makePlayerOwned(): HorseOwnership {
  return { type: "player" };
}

export function makeNpcOwned(stableId: NpcStableId): HorseOwnership {
  return { type: "npc", stableId };
}

export function makeUnowned(): HorseOwnership {
  return { type: "unowned" };
}

/** Convenience: creates ownership from a legacy stableId string (for boundaries).
 * @param stableId - The raw stableId string, or undefined for unowned.
 */
export function ownershipFromStableId(stableId: string | undefined): HorseOwnership {
  if (!stableId) return { type: "unowned" };
  return { type: "npc", stableId: asNpcStableId(stableId) };
}
