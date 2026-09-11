/**
 * auctionImpactActions.ts - Pure helpers for applying auction impacts.
 *
 * Extracted from auctionSlice.commitAuctionResult so the slice becomes a thin
 * coordinator. The pure logic (cash/NPC/horse/inbox mutation from impacts) lives
 * here; the slice handles state mutation via set().
 *
 * Per PR 7 of the megaplan.
 *
 * Dependencies: @/game/types (Horse, InboxMessage), @/core/uuid (generateUUID),
 *              @/core/horse/ownership (makeNpcOwned, makePlayerOwned)
 * Related files: src/game/store/slices/auctionSlice.ts (coordinator)
 */

import type { Horse } from "@/game/types";
import type { Stable } from "@/game/types";
import type { InboxMessage } from "@/core/inbox/inboxTypes";
import { generateUUID } from "@/core/uuid";
import { makeNpcOwned, makePlayerOwned } from "@/core/horse/ownership";
import { asNpcStableId, asStableId } from "@/core/types/branded";
import type { AnyImpact } from "@/core/resolver/impacts";

/** Mutable accumulator for auction impact application. */
export interface AuctionImpactAccumulator {
  cash: number;
  npcStables: Stable[];
  horses: Record<string, Horse>;
  inbox: InboxMessage[];
}

/**
 * Apply a list of auction impacts to the accumulator (mutates the accumulator).
 * @param acc
 * @param impacts
 */
export function applyAuctionImpacts(acc: AuctionImpactAccumulator, impacts: AnyImpact[]): void {
  for (const impact of impacts ?? []) {
    switch (impact.type) {
      case "cash_change": {
        const { entityId, amount } = impact;
        if (entityId) {
          acc.npcStables = acc.npcStables.map((stable) =>
            stable.id === asStableId(entityId)
              ? { ...stable, cash: Math.max(0, stable.cash + amount) }
              : stable,
          );
        } else {
          acc.cash = Math.max(0, acc.cash + amount);
        }
        break;
      }
      case "horse_transfer": {
        const { horseId: transferId, toStableId } = impact;
        if (acc.horses[transferId]) {
          acc.horses = {
            ...acc.horses,
            [transferId]: {
              ...acc.horses[transferId],
              ownership: toStableId ? makeNpcOwned(asNpcStableId(toStableId)) : makePlayerOwned(),
            },
          };
        }
        break;
      }
      case "inbox_message": {
        const { message } = impact;
        if (message) {
          const fullMessage: InboxMessage = {
            ...message,
            id: generateUUID(),
            readAt: undefined,
          };
          acc.inbox = [fullMessage, ...acc.inbox].slice(0, 100);
        }
        break;
      }
    }
  }
}
