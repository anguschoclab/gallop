/**
 * pendingOfferForStable.ts - Find the player's pending private sale offer to a stable
 *
 * Dependencies: @/game/types (PrivateSaleOffer)
 * Related files: src/components/stable/StableCard.tsx (consumer)
 */

import type { PrivateSaleOffer } from "@/game/types";

/**
 * Find the first pending private sale offer from the player to the given NPC
 * stable. Returns `undefined` when no pending offer exists.
 * @param offers - All private sale offers in game state
 * @param stableId - The NPC stable ID to match against `toStableId`
 */
export function findPendingOfferForStable(
  offers: PrivateSaleOffer[],
  stableId: string,
): PrivateSaleOffer | undefined {
  return offers.find((o) => o.toStableId === stableId && o.status === "pending");
}
