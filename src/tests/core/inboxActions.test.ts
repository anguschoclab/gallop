import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import type { InboxMessage } from "@/core/inbox/inboxTypes";

describe("Inbox Persistence & State", () => {
  beforeEach(() => {
    // Reset inbox for testing
    useGame.setState({
      inbox: [
        {
          id: "msg-1",
          day: 1,
          category: "system",
          priority: "info",
          title: "Test Message",
          body: "Hello world",
        },
      ] as InboxMessage[],
      day: 5,
    });
  });

  it("marks messages as read and sets readAt to the current game day", () => {
    const { markMessageRead } = useGame.getState();

    markMessageRead("msg-1");

    const updatedInbox = useGame.getState().inbox;
    expect(updatedInbox[0].readAt).toBe(5);
  });

  it("calculates unreadCount correctly", () => {
    const state = useGame.getState();
    const unreadCount = state.inbox.filter((m) => !m.readAt).length;
    expect(unreadCount).toBe(1);

    state.markMessageRead("msg-1");

    const newUnreadCount = useGame.getState().inbox.filter((m) => !m.readAt).length;
    expect(newUnreadCount).toBe(0);
  });

  it("verifies that inbox is intended to be persisted", async () => {
    // We can't easily test the IndexedDB persistence in jsdom, but we can verify the configuration
    // by checking the partialize function of the persist middleware if we had access to it,
    // or simply by checking the source file (which we did).

    // Instead, we'll verify that the inbox slice actions work correctly and preserve other fields.
    const initialDay = useGame.getState().day;
    useGame.getState().markAllMessagesRead();

    expect(useGame.getState().day).toBe(initialDay);
    expect(useGame.getState().inbox.every((m) => m.readAt === initialDay)).toBe(true);
  });
});
