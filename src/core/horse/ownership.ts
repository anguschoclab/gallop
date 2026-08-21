/**
 * ownership.ts - Canonical horse ownership predicates
 *
 * The single source of truth for "does the player own this horse?".
 *
 * Historically the codebase overloaded an empty `stableId` to mean "player
 * owned". That is wrong: world-generated stock (market listings, unassigned
 * foals, free agents) also has no `stableId`, so those horses were silently
 * treated as belonging to the player — inflating upkeep counts and, far worse,
 * crediting their prize money to the player's ledger.
 *
 * Rules:
 * - `horse.owned === true`  → the player's stable owns the horse.
 * - `horse.stableId` set    → an NPC stable owns the horse.
 * - neither                 → unowned world stock (market, free foals).
 *
 * Dependencies: @/core/horse/types (Horse)
 * Related files: src/core/standings/computeWealthStandings.ts (same model)
 */

import type { Horse } from "@/core/horse/types";

/** Synthetic owner id used when bucketing the player alongside NPC stables. */
export const PLAYER_OWNER_ID = "__player__";

type OwnershipFields = Pick<Horse, "owned" | "stableId">;

/** True only when the player's stable owns this horse. */
export function isPlayerOwned(horse: Pick<Horse, "owned"> | undefined | null): boolean {
  return horse?.owned === true;
}

/** True when an NPC stable owns this horse. */
export function isNpcOwned(horse: OwnershipFields | undefined | null): boolean {
  return !!horse && !horse.owned && !!horse.stableId;
}

/** True when nobody owns this horse (world/market stock, unassigned foals). */
export function isUnowned(horse: OwnershipFields | undefined | null): boolean {
  return !!horse && !horse.owned && !horse.stableId;
}

/** Owner bucket key: the player's synthetic id, the NPC stable id, or null. */
export function ownerKey(horse: OwnershipFields | undefined | null): string | null {
  if (!horse) return null;
  if (horse.owned) return PLAYER_OWNER_ID;
  return horse.stableId || null;
}
