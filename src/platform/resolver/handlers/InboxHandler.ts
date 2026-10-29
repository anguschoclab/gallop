/**
 * resolver/handlers/InboxHandler.ts - Inbox impact handler
 *
 * This file provides the handler for processing inbox_message impacts
 * into the game state.
 *
 * Dependencies: ./types (ImpactHandler), @/core/uuid (generateUUID)
 */

import { BaseHandler } from "@/platform/resolver/handlers/BaseHandler";
import type { ImpactHandlerFunction } from "@/platform/resolver/handlers/types";
import type { InboxImpact } from "@/platform/resolver/impacts/inboxImpacts";
import { generateUUID } from "@/shared/uuid/uuid";

const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = {
  inbox_message: (draft, impact) => {
    const { message } = impact as InboxImpact;
    if (!draft.inbox) draft.inbox = [];

    // Push the message to the player's inbox
    draft.inbox.push({
      ...message,
      id: generateUUID(),
      day: impact.day, // Use the impact day if available, otherwise fallback to message.day
    });
  },
};

export class InboxHandler extends BaseHandler {
  protected get handlers() {
    return IMPACT_HANDLERS;
  }
}
