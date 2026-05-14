/**
 * store/slices/inboxSlice.ts - Inbox state slice
 *
 * This file provides UI-driven inbox actions, including marking messages as read,
 * dismissing notifications, and pinning important messages.
 *
 * Dependencies: ../types (GameStateCreator, StoreGet)
 * Related files: src/core/inbox/inboxTypes.ts (data model)
 */

import type { GameStateCreator } from "../types";

export type InboxSlice = {
  /** Marks a specific inbox message as read */
  markMessageRead: (id: string) => void;
  /** Marks all unread messages as read */
  markAllMessagesRead: () => void;
  /** Permanently removes a message from the inbox */
  dismissMessage: (id: string) => void;
  /** Pins a message to the top until a specific day */
  pinMessageUntil: (id: string, day: number) => void;
};

/**
 * Create the inbox state slice with read/write actions for the player's inbox.
 */
export const createInboxSlice: GameStateCreator<InboxSlice> = (set, get) => ({
  markMessageRead: (id) => {
    const { inbox, day } = get();
    set({
      inbox: inbox.map((m) => (m.id === id ? { ...m, readAt: day } : m)),
    });
  },

  markAllMessagesRead: () => {
    const { inbox, day } = get();
    set({
      inbox: inbox.map((m) => (m.readAt ? m : { ...m, readAt: day })),
    });
  },

  dismissMessage: (id) => {
    const { inbox } = get();
    set({
      inbox: inbox.filter((m) => m.id !== id),
    });
  },

  pinMessageUntil: (id, untilDay) => {
    const { inbox } = get();
    set({
      inbox: inbox.map((m) => (m.id === id ? { ...m, pinnedUntil: untilDay } : m)),
    });
  },
});
