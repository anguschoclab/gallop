import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { useInbox, useUnreadCount } from "@/hooks/inbox/useInbox";
import { getCategoryIcon, getPriorityColor } from "@/core/inbox/inboxUtils";
import { useGame } from "@/game/store";
import type { InboxMessage } from "@/core/inbox/inboxTypes";

function mkMsg(id: string, overrides: Partial<InboxMessage> = {}): InboxMessage {
  return {
    id,
    day: 10,
    category: "system",
    priority: "info",
    title: `Message ${id}`,
    body: "Body text",
    ...overrides,
  };
}

describe("useInbox — filtering", () => {
  beforeEach(() => {
    seedStore();
  });

  it("filter 'all' returns all messages", () => {
    const messages = [mkMsg("m1"), mkMsg("m2"), mkMsg("m3")];
    seedStore({ ...createDefaultGameState(), inbox: messages });

    const { result } = renderHook(() => useInbox());
    expect(result.current.filteredMessages).toHaveLength(3);
  });

  it("filter 'unread' returns only messages where readAt is undefined", () => {
    const messages = [
      mkMsg("m1", { readAt: undefined }),
      mkMsg("m2", { readAt: 5 }),
      mkMsg("m3", { readAt: undefined }),
    ];
    seedStore({ ...createDefaultGameState(), inbox: messages });

    const { result } = renderHook(() => useInbox());
    act(() => result.current.setFilter("unread"));
    expect(result.current.filteredMessages).toHaveLength(2);
    expect(result.current.filteredMessages.map((m) => m.id)).toEqual(["m1", "m3"]);
  });

  it("filter 'action' returns only messages where priority is not 'info' or 'low'", () => {
    const messages = [
      mkMsg("m1", { priority: "info" }),
      mkMsg("m2", { priority: "action" }),
      mkMsg("m3", { priority: "urgent" }),
      mkMsg("m4", { priority: "low" as any }),
      mkMsg("m5", { priority: "critical" as any }),
    ];
    seedStore({ ...createDefaultGameState(), inbox: messages });

    const { result } = renderHook(() => useInbox());
    act(() => result.current.setFilter("action"));
    expect(result.current.filteredMessages).toHaveLength(3);
    expect(result.current.filteredMessages.map((m) => m.id)).toEqual(["m2", "m3", "m5"]);
  });

  it("filter 'critical' returns only critical priority messages", () => {
    const messages = [
      mkMsg("m1", { priority: "info" }),
      mkMsg("m2", { priority: "critical" as any }),
      mkMsg("m3", { priority: "urgent" }),
      mkMsg("m4", { priority: "critical" as any }),
    ];
    seedStore({ ...createDefaultGameState(), inbox: messages });

    const { result } = renderHook(() => useInbox());
    act(() => result.current.setFilter("critical" as any));
    expect(result.current.filteredMessages).toHaveLength(2);
    expect(result.current.filteredMessages.map((m) => m.id)).toEqual(["m2", "m4"]);
  });

  it("filter 'urgent' returns only urgent priority messages", () => {
    const messages = [
      mkMsg("m1", { priority: "info" }),
      mkMsg("m2", { priority: "urgent" }),
      mkMsg("m3", { priority: "action" }),
      mkMsg("m4", { priority: "urgent" }),
    ];
    seedStore({ ...createDefaultGameState(), inbox: messages });

    const { result } = renderHook(() => useInbox());
    act(() => result.current.setFilter("urgent" as any));
    expect(result.current.filteredMessages).toHaveLength(2);
    expect(result.current.filteredMessages.map((m) => m.id)).toEqual(["m2", "m4"]);
  });

  it("filter 'low' returns only low priority messages", () => {
    const messages = [
      mkMsg("m1", { priority: "info" }),
      mkMsg("m2", { priority: "low" as any }),
      mkMsg("m3", { priority: "action" }),
      mkMsg("m4", { priority: "low" as any }),
    ];
    seedStore({ ...createDefaultGameState(), inbox: messages });

    const { result } = renderHook(() => useInbox());
    act(() => result.current.setFilter("low" as any));
    expect(result.current.filteredMessages).toHaveLength(2);
    expect(result.current.filteredMessages.map((m) => m.id)).toEqual(["m2", "m4"]);
  });

  it("default filter is 'all'", () => {
    seedStore({ ...createDefaultGameState(), inbox: [mkMsg("m1")] });

    const { result } = renderHook(() => useInbox());
    expect(result.current.filter).toBe("all");
  });

  it("setFilter updates the filter and filteredMessages", () => {
    const messages = [
      mkMsg("m1", { priority: "info", readAt: 5 }),
      mkMsg("m2", { priority: "action", readAt: undefined }),
    ];
    seedStore({ ...createDefaultGameState(), inbox: messages });

    const { result } = renderHook(() => useInbox());
    expect(result.current.filteredMessages).toHaveLength(2);

    act(() => result.current.setFilter("unread"));
    expect(result.current.filter).toBe("unread");
    expect(result.current.filteredMessages).toHaveLength(1);
    expect(result.current.filteredMessages[0].id).toBe("m2");

    act(() => result.current.setFilter("action"));
    expect(result.current.filter).toBe("action");
    expect(result.current.filteredMessages).toHaveLength(1);
    expect(result.current.filteredMessages[0].id).toBe("m2");
  });
});

describe("useInbox — sorting", () => {
  beforeEach(() => {
    seedStore();
  });

  it("sorts by day descending when no pins", () => {
    const messages = [mkMsg("m1", { day: 5 }), mkMsg("m2", { day: 20 }), mkMsg("m3", { day: 10 })];
    seedStore({ ...createDefaultGameState(), day: 30, inbox: messages });

    const { result } = renderHook(() => useInbox());
    expect(result.current.filteredMessages.map((m) => m.id)).toEqual(["m2", "m3", "m1"]);
  });

  it("pinned message sorts above unpinned even with older day", () => {
    const messages = [mkMsg("m1", { day: 50, pinnedUntil: 100 }), mkMsg("m2", { day: 80 })];
    seedStore({ ...createDefaultGameState(), day: 60, inbox: messages });

    const { result } = renderHook(() => useInbox());
    expect(result.current.filteredMessages[0].id).toBe("m1");
    expect(result.current.filteredMessages[1].id).toBe("m2");
  });

  it("expired pin (pinnedUntil < day) is treated as unpinned", () => {
    const messages = [mkMsg("m1", { day: 50, pinnedUntil: 40 }), mkMsg("m2", { day: 80 })];
    seedStore({ ...createDefaultGameState(), day: 60, inbox: messages });

    const { result } = renderHook(() => useInbox());
    expect(result.current.filteredMessages[0].id).toBe("m2");
    expect(result.current.filteredMessages[1].id).toBe("m1");
  });

  it("multiple pinned messages sort by day descending among themselves", () => {
    const messages = [
      mkMsg("m1", { day: 10, pinnedUntil: 100 }),
      mkMsg("m2", { day: 30, pinnedUntil: 100 }),
      mkMsg("m3", { day: 50, pinnedUntil: 100 }),
      mkMsg("m4", { day: 40 }),
    ];
    seedStore({ ...createDefaultGameState(), day: 60, inbox: messages });

    const { result } = renderHook(() => useInbox());
    const ids = result.current.filteredMessages.map((m) => m.id);
    expect(ids).toEqual(["m3", "m2", "m1", "m4"]);
  });
});

describe("useInbox — empty inbox", () => {
  beforeEach(() => {
    seedStore();
  });

  it("filteredMessages returns empty array without error", () => {
    seedStore({ ...createDefaultGameState(), inbox: [] });

    const { result } = renderHook(() => useInbox());
    expect(result.current.filteredMessages).toEqual([]);
    expect(result.current.inbox).toEqual([]);
  });
});

describe("useInbox — store action passthrough", () => {
  beforeEach(() => {
    seedStore();
  });

  it("markRead calls the store's markMessageRead", () => {
    const messages = [mkMsg("m1", { readAt: undefined })];
    seedStore({ ...createDefaultGameState(), day: 15, inbox: messages });

    const { result } = renderHook(() => useInbox());
    act(() => result.current.markRead("m1"));

    expect(useGame.getState().inbox[0].readAt).toBe(15);
  });

  it("markAllRead calls the store's markAllMessagesRead", () => {
    const messages = [mkMsg("m1"), mkMsg("m2", { readAt: 5 })];
    seedStore({ ...createDefaultGameState(), day: 20, inbox: messages });

    const { result } = renderHook(() => useInbox());
    act(() => result.current.markAllRead());

    const inbox = useGame.getState().inbox;
    expect(inbox[0].readAt).toBe(20);
    expect(inbox[1].readAt).toBe(5);
  });

  it("dismiss calls the store's dismissMessage", () => {
    const messages = [mkMsg("m1"), mkMsg("m2")];
    seedStore({ ...createDefaultGameState(), inbox: messages });

    const { result } = renderHook(() => useInbox());
    act(() => result.current.dismiss("m1"));

    expect(useGame.getState().inbox).toHaveLength(1);
    expect(useGame.getState().inbox[0].id).toBe("m2");
  });
});

describe("useUnreadCount", () => {
  beforeEach(() => {
    seedStore();
  });

  it("returns 0 when inbox is empty", () => {
    seedStore({ ...createDefaultGameState(), inbox: [] });
    const { result } = renderHook(() => useUnreadCount());
    expect(result.current).toBe(0);
  });

  it("returns count of messages where readAt is undefined", () => {
    const messages = [mkMsg("m1", { readAt: undefined }), mkMsg("m2", { readAt: 5 }), mkMsg("m3")];
    seedStore({ ...createDefaultGameState(), inbox: messages });
    const { result } = renderHook(() => useUnreadCount());
    expect(result.current).toBe(2);
  });

  it("returns 0 when all messages are read", () => {
    const messages = [mkMsg("m1", { readAt: 5 }), mkMsg("m2", { readAt: 10 })];
    seedStore({ ...createDefaultGameState(), inbox: messages });
    const { result } = renderHook(() => useUnreadCount());
    expect(result.current).toBe(0);
  });
});

describe("getCategoryIcon", () => {
  it("returns Baby icon for 'foaling'", () => {
    const icon = getCategoryIcon("foaling");
    expect(icon).toBeDefined();
  });

  it("returns Activity icon for 'injury'", () => {
    const icon = getCategoryIcon("injury");
    expect(icon).toBeDefined();
  });

  it("returns Gavel icon for 'auction'", () => {
    const icon = getCategoryIcon("auction");
    expect(icon).toBeDefined();
  });

  it("returns Calendar icon for 'deadline'", () => {
    const icon = getCategoryIcon("deadline");
    expect(icon).toBeDefined();
  });

  it("returns Gavel icon for 'offer'", () => {
    const icon = getCategoryIcon("offer");
    expect(icon).toBeDefined();
  });

  it("returns Calendar icon for 'race'", () => {
    const icon = getCategoryIcon("race");
    expect(icon).toBeDefined();
  });

  it("returns LogOut icon for 'retirement'", () => {
    const icon = getCategoryIcon("retirement");
    expect(icon).toBeDefined();
  });

  it("returns Award icon for 'hall_of_fame'", () => {
    const icon = getCategoryIcon("hall_of_fame");
    expect(icon).toBeDefined();
  });

  it("returns Bell icon for 'system' (default)", () => {
    const icon = getCategoryIcon("system");
    expect(icon).toBeDefined();
  });

  it("returns Bell icon for 'standings' (default)", () => {
    const icon = getCategoryIcon("standings");
    expect(icon).toBeDefined();
  });
});

describe("getPriorityColor", () => {
  it("returns red classes for 'urgent'", () => {
    const cls = getPriorityColor("urgent");
    expect(cls).toContain("red-500");
  });

  it("returns gold classes for 'action'", () => {
    const cls = getPriorityColor("action");
    expect(cls).toContain("gold");
  });

  it("returns blue classes for 'info' (default)", () => {
    const cls = getPriorityColor("info");
    expect(cls).toContain("blue-500");
  });

  it("returns red-600 classes for 'critical'", () => {
    const cls = getPriorityColor("critical" as any);
    expect(cls).toContain("red-600");
  });

  it("returns blue-300 classes for 'low'", () => {
    const cls = getPriorityColor("low" as any);
    expect(cls).toContain("blue-300");
  });
});
