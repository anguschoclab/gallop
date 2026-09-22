import { describe, it, expect, vi } from "vitest";
import {
  applyAuctionImpacts,
  type AuctionImpactAccumulator,
} from "@/core/auction/auctionImpactActions";
import type { Stable, Horse } from "@/game/types";
import type { InboxMessage } from "@/core/inbox/inboxTypes";
import { asStableId, asHorseId, asNpcStableId, asOwnerKey } from "@/core/types/branded";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";

vi.mock("@/core/uuid", () => ({
  generateUUID: vi.fn(() => "mocked-uuid"),
}));

/** Shared base fields required by every Impact. */
const baseImpact = {
  id: "impact-1",
  intentId: "intent-1",
  day: 1,
  phase: "auction",
  logLevel: "never" as const,
};

describe("applyAuctionImpacts", () => {
  it("applies cash_change to player (empty entityId) and prevents negative cash", () => {
    const acc: AuctionImpactAccumulator = {
      cash: 100,
      npcStables: [],
      horses: {},
      inbox: [],
    };

    applyAuctionImpacts(acc, [
      { ...baseImpact, type: "cash_change", entityId: asOwnerKey(""), amount: 50, reason: "test" },
    ]);
    expect(acc.cash).toBe(150);

    applyAuctionImpacts(acc, [
      {
        ...baseImpact,
        type: "cash_change",
        entityId: asOwnerKey(""),
        amount: -200,
        reason: "test",
      },
    ]);
    expect(acc.cash).toBe(0);
  });

  it("applies cash_change to NPC and prevents negative cash", () => {
    const acc: AuctionImpactAccumulator = {
      cash: 0,
      npcStables: [{ id: asStableId("npc1"), cash: 100 } as Stable],
      horses: {},
      inbox: [],
    };

    applyAuctionImpacts(acc, [
      {
        ...baseImpact,
        type: "cash_change",
        entityId: asOwnerKey("npc1"),
        amount: 50,
        reason: "test",
      },
    ]);
    expect(acc.npcStables[0].cash).toBe(150);

    applyAuctionImpacts(acc, [
      {
        ...baseImpact,
        type: "cash_change",
        entityId: asOwnerKey("npc1"),
        amount: -200,
        reason: "test",
      },
    ]);
    expect(acc.npcStables[0].cash).toBe(0);
  });

  it("applies horse_transfer to player", () => {
    const horse = { id: asHorseId("h1"), ownership: makeNpcOwned(asNpcStableId("npc1")) } as Horse;
    const acc: AuctionImpactAccumulator = {
      cash: 0,
      npcStables: [],
      horses: { h1: horse },
      inbox: [],
    };

    applyAuctionImpacts(acc, [
      { ...baseImpact, type: "horse_transfer", horseId: asHorseId("h1"), price: 0, reason: "test" },
    ]);
    expect(acc.horses.h1.ownership.type).toBe("player");
  });

  it("applies horse_transfer to NPC", () => {
    const horse = { id: asHorseId("h1"), ownership: makePlayerOwned() } as Horse;
    const acc: AuctionImpactAccumulator = {
      cash: 0,
      npcStables: [],
      horses: { h1: horse },
      inbox: [],
    };

    applyAuctionImpacts(acc, [
      {
        ...baseImpact,
        type: "horse_transfer",
        horseId: asHorseId("h1"),
        toStableId: asStableId("npc2"),
        price: 0,
        reason: "test",
      },
    ]);
    expect(acc.horses.h1.ownership.type).toBe("npc");
    if (acc.horses.h1.ownership.type === "npc") {
      expect(acc.horses.h1.ownership.stableId).toBe("npc2");
    }
  });

  it("applies inbox_message, injects UUID, and caps at 100", () => {
    const initialInbox = Array.from({ length: 100 }).map(
      (_, i) =>
        ({
          id: `old-${i}`,
          title: `Old ${i}`,
        }) as InboxMessage,
    );

    const acc: AuctionImpactAccumulator = {
      cash: 0,
      npcStables: [],
      horses: {},
      inbox: initialInbox,
    };

    applyAuctionImpacts(acc, [
      {
        ...baseImpact,
        type: "inbox_message",
        message: {
          day: 1,
          category: "auction",
          priority: "info",
          title: "New Message",
          body: "...",
        },
      },
    ]);

    expect(acc.inbox.length).toBe(100);
    expect(acc.inbox[0].title).toBe("New Message");
    expect(acc.inbox[0].id).toBe("mocked-uuid");
    expect(acc.inbox[0].readAt).toBeUndefined();
    // The oldest message should be pushed out
    expect(acc.inbox[99].id).toBe("old-98");
  });
});
