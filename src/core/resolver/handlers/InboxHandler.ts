/**
 * resolver/handlers/InboxHandler.ts - Inbox impact handler
 *
 * This file provides the handler for processing inbox_message impacts
 * into the game state.
 *
 * Dependencies: ./types (ImpactHandler), @/core/uuid (generateUUID)
 */

import type { WritableDraft } from "immer";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler, LookupMaps } from "./types";
import type { InboxImpact } from "../impacts/inboxImpacts";
import { generateUUID } from "@/core/uuid";

export class InboxHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return type === "inbox_message";
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact, _lookupMaps?: LookupMaps): void {
    const { message } = impact as InboxImpact;
    if (!draft.inbox) draft.inbox = [];

    // Push the message to the player's inbox
    draft.inbox.push({
      ...message,
      id: generateUUID(),
      day: impact.day, // Use the impact day if available, otherwise fallback to message.day
    });
  }
}
