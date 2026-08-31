/**
 * Tests for NPC bankruptcy phase
 */

import { describe, it, expect } from "vitest";
import { npcBankruptcyPhase } from "@/core/time/phases/npcBankruptcy";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Stable, Horse, Syndicate } from "@/game/types";
import type {
  CashImpact,
  ConsignmentImpact,
  NewsImpact,
  InboxImpact,
  HorseCreationImpact,
} from "@/core/resolver/impacts/index";
import { createRng } from "@/core/common/rng";
import { getStableId, makeNpcOwned, makeUnowned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";

function makeSyndicate(overrides: Partial<Syndicate> = {}): Syndicate {
  return {
    id: "syn-1",
    stallionId: "stallion-1",
    stallionName: "Test Stallion",
    totalShares: 40,
    shareHolders: {},
    sharePrice: 10000,
    studFee: 5000,
    isPublic: true,
    lifetimeEarnings: 0,
    ...overrides,
  };
}

describe("npcBankruptcyPhase", () => {
  it("should not run if state.runEnded is true", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const state = makeGameState({
      npcStables: [stable],
      runEnded: true,
    }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    expect(result.state.npcStables).toHaveLength(1);
    expect(result.impacts).toHaveLength(0);
  });

  it("should not trigger bankruptcy for stable with cash > 0", () => {
    const stable = createTestStable({ id: "healthy-1", cash: 50000, horses: [] });
    const state = makeGameState({ npcStables: [stable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    expect(result.state.npcStables).toHaveLength(1);
    expect(result.state.npcStables[0].id).toBe("healthy-1");
    expect(result.impacts).toHaveLength(0);
  });

  it("should trigger bankruptcy for stable with cash <= 0", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const state = makeGameState({ npcStables: [stable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const bankruptRemoved = !result.state.npcStables.some((s) => s.id === "bankrupt-1");
    expect(bankruptRemoved).toBe(true);
  });

  it("should trigger bankruptcy for stable with negative cash", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: -5000, horses: [] });
    const state = makeGameState({ npcStables: [stable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const bankruptRemoved = !result.state.npcStables.some((s) => s.id === "bankrupt-1");
    expect(bankruptRemoved).toBe(true);
  });

  it("should emit cash_change impact for player syndicate share buyout", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const stallion = createTestHorse({
      id: "stallion-1",
      name: "Stallion 1",
      age: 8,
      gender: "horse",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
      lifetimeEarnings: 5000000,
    });
    const syndicate = makeSyndicate({
      id: "syn-1",
      stallionId: "stallion-1",
      shareHolders: { player: 5, "bankrupt-1": 35 },
    });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([stallion]),
      syndicates: { "syn-1": syndicate },
    }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const cashImpact = result.impacts.find(
      (i): i is CashImpact => i.type === "cash_change" && i.entityId === "player",
    );
    expect(cashImpact).toBeDefined();
    expect(cashImpact!.amount).toBeGreaterThan(0);
  });

  it("should emit inbox_message about forced buyout", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const stallion = createTestHorse({
      id: "stallion-1",
      name: "Stallion 1",
      age: 8,
      gender: "horse",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
      lifetimeEarnings: 5000000,
    });
    const syndicate = makeSyndicate({
      stallionId: "stallion-1",
      shareHolders: { player: 5, "bankrupt-1": 35 },
    });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([stallion]),
      syndicates: { "syn-1": syndicate },
    }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const inboxImpacts = result.impacts.filter((i): i is InboxImpact => i.type === "inbox_message");
    const buyoutMsg = inboxImpacts.find((m) => m.message.title === "Syndicate Share Buyout");
    expect(buyoutMsg).toBeDefined();
  });

  it("should remove player from syndicate shareHolders after buyout", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const stallion = createTestHorse({
      id: "stallion-1",
      name: "Stallion 1",
      age: 8,
      gender: "horse",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
      lifetimeEarnings: 5000000,
    });
    const syndicate = makeSyndicate({
      stallionId: "stallion-1",
      shareHolders: { player: 5, "bankrupt-1": 35 },
    });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([stallion]),
      syndicates: { "syn-1": syndicate },
    }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const updatedSyndicate = (result.state as GameState).syndicates["syn-1"];
    expect(updatedSyndicate.shareHolders["player"]).toBeUndefined();
  });

  it("should remove bankrupt stable from all syndicate shareHolders", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const stallion = createTestHorse({
      id: "stallion-1",
      name: "Stallion 1",
      age: 8,
      gender: "horse",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
      lifetimeEarnings: 5000000,
    });
    const syndicate = makeSyndicate({
      stallionId: "stallion-1",
      shareHolders: { player: 5, "bankrupt-1": 35 },
    });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([stallion]),
      syndicates: { "syn-1": syndicate },
    }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const updatedSyndicate = (result.state as GameState).syndicates["syn-1"];
    expect(updatedSyndicate.shareHolders["bankrupt-1"]).toBeUndefined();
  });

  it("should not buy out player if player has no shares in the syndicate", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const stallion = createTestHorse({
      id: "stallion-1",
      name: "Stallion 1",
      age: 8,
      gender: "horse",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
      lifetimeEarnings: 5000000,
    });
    const syndicate = makeSyndicate({
      stallionId: "stallion-1",
      shareHolders: { "bankrupt-1": 40 },
    });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([stallion]),
      syndicates: { "syn-1": syndicate },
    }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const cashImpact = result.impacts.find(
      (i): i is CashImpact => i.type === "cash_change" && i.entityId === "player",
    );
    expect(cashImpact).toBeUndefined();
  });

  it("should create a liquidation AuctionSale with kind 'liquidation'", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: ["horse-1"] });
    const horse = createTestHorse({
      id: "horse-1",
      name: "Horse 1",
      age: 3,
      gender: "colt",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
    });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([horse]),
    }) as GameState;

    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const liquidationSale = (result.state as GameState).auctions?.find(
      (a) => a.kind === "liquidation",
    );
    expect(liquidationSale).toBeDefined();
    expect(liquidationSale!.day).toBe(13); // newDay + 3
    expect(liquidationSale!.resolved).toBe(false);
  });

  it("should emit consignment impacts for each horse", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: ["horse-1", "horse-2"] });
    const horse1 = createTestHorse({
      id: "horse-1",
      name: "Horse 1",
      age: 3,
      gender: "colt",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
    });
    const horse2 = createTestHorse({
      id: "horse-2",
      name: "Horse 2",
      age: 5,
      gender: "mare",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
    });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([horse1, horse2]),
    }) as GameState;

    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const consignmentImpacts = result.impacts.filter(
      (i): i is ConsignmentImpact => i.type === "consignment",
    );
    expect(consignmentImpacts).toHaveLength(2);
    expect(consignmentImpacts.every((i) => i.consignorStableId === "bankrupt-1")).toBe(true);
  });

  it("should set reserve prices at 50% of horsePrice", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: ["horse-1"] });
    const horse = createTestHorse({
      id: "horse-1",
      name: "Horse 1",
      age: 3,
      gender: "colt",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
    });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([horse]),
    }) as GameState;

    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const consignmentImpact = result.impacts.find(
      (i): i is ConsignmentImpact => i.type === "consignment",
    );
    expect(consignmentImpact).toBeDefined();
    expect(consignmentImpact!.reservePrice).toBeGreaterThan(0);
  });

  it("should remove bankrupt stable from npcStables", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const healthyStable = createTestStable({ id: "healthy-1", cash: 100000, horses: [] });
    const state = makeGameState({ npcStables: [stable, healthyStable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    expect(result.state.npcStables.some((s) => s.id === "bankrupt-1")).toBe(false);
    expect(result.state.npcStables.some((s) => s.id === "healthy-1")).toBe(true);
  });

  it("should spawn a replacement stable (budget tier)", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const state = makeGameState({ npcStables: [stable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const replacement = result.state.npcStables.find((s) => s.id !== "bankrupt-1");
    expect(replacement).toBeDefined();
    expect(replacement!.tier).toBe("budget");
    expect(replacement!.isMajor).toBe(false);
  });

  it("should emit horse_creation impacts for replacement stable horses", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const state = makeGameState({ npcStables: [stable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const horseCreationImpacts = result.impacts.filter(
      (i): i is HorseCreationImpact => i.type === "horse_creation",
    );
    expect(horseCreationImpacts.length).toBeGreaterThan(0);
  });

  it("should emit news_item about bankruptcy", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const state = makeGameState({ npcStables: [stable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const newsImpact = result.impacts.find((i): i is NewsImpact => i.type === "news_item");
    expect(newsImpact).toBeDefined();
    expect(newsImpact!.newsItem.headline).toContain("bankruptcy");
  });

  it("should emit inbox_message about liquidation sale", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: ["horse-1"] });
    const horse = createTestHorse({
      id: "horse-1",
      name: "Horse 1",
      age: 3,
      gender: "colt",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
    });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([horse]),
    }) as GameState;

    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const inboxImpacts = result.impacts.filter((i): i is InboxImpact => i.type === "inbox_message");
    const saleMsg = inboxImpacts.find((m) => m.message.title === "Liquidation Sale Scheduled");
    expect(saleMsg).toBeDefined();
  });

  it("should dissolve stable with no horses correctly", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const state = makeGameState({ npcStables: [stable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const consignmentImpacts = result.impacts.filter(
      (i): i is ConsignmentImpact => i.type === "consignment",
    );
    expect(consignmentImpacts).toHaveLength(0);

    const bankruptRemoved = !result.state.npcStables.some((s) => s.id === "bankrupt-1");
    expect(bankruptRemoved).toBe(true);

    const replacement = result.state.npcStables.find((s) => s.id !== "bankrupt-1");
    expect(replacement).toBeDefined();
  });

  it("should handle multiple stables going bankrupt on the same day", () => {
    const stable1 = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const stable2 = createTestStable({ id: "bankrupt-2", cash: -100, horses: [] });
    const healthyStable = createTestStable({ id: "healthy-1", cash: 50000, horses: [] });
    const state = makeGameState({
      npcStables: [stable1, stable2, healthyStable],
    }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    expect(result.state.npcStables.some((s) => s.id === "bankrupt-1")).toBe(false);
    expect(result.state.npcStables.some((s) => s.id === "bankrupt-2")).toBe(false);
    expect(result.state.npcStables.some((s) => s.id === "healthy-1")).toBe(true);

    const newsImpacts = result.impacts.filter((i): i is NewsImpact => i.type === "news_item");
    expect(newsImpacts.length).toBeGreaterThanOrEqual(2);
  });

  it("should add replacement stable to npcStables", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const state = makeGameState({ npcStables: [stable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    expect(result.state.npcStables.length).toBeGreaterThanOrEqual(1);
    const newStables = result.state.npcStables.filter((s) => s.id !== "bankrupt-1");
    expect(newStables.length).toBe(1);
  });

  it("should populate replacement stable horses array", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const state = makeGameState({ npcStables: [stable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const replacement = result.state.npcStables.find((s) => s.id !== "bankrupt-1");
    expect(replacement).toBeDefined();
    expect(replacement!.horses.length).toBeGreaterThan(0);
  });

  it("should remove bankrupt stable from npcAIManager.stableStates", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const npcAIManager = {
      stableStates: {
        "bankrupt-1": { lastActionDay: 0, budgetAllocation: {} } as any,
      },
    } as any;
    const state = makeGameState({ npcStables: [stable], npcAIManager }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const updatedManager = (result.state as GameState).npcAIManager;
    expect(updatedManager).toBeDefined();
    expect(updatedManager!.stableStates["bankrupt-1"]).toBeUndefined();
  });

  it("should set replacement stable horses' stableId to the new stable's ID", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const state = makeGameState({ npcStables: [stable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const replacement = result.state.npcStables.find((s) => s.id !== "bankrupt-1");
    expect(replacement).toBeDefined();

    const horseCreationImpacts = result.impacts.filter(
      (i): i is HorseCreationImpact => i.type === "horse_creation",
    );
    for (const impact of horseCreationImpacts) {
      expect(impact.horse.ownership).toEqual({ type: "npc", stableId: replacement!.id });
    }
  });

  it("should trigger syndicate devolution when removing bankrupt stable's shares causes another holder to become majority", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const stallion = createTestHorse({
      id: "stallion-1",
      name: "Stallion 1",
      age: 8,
      gender: "horse",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
      lifetimeEarnings: 5000000,
    });
    // bankrupt-1 has 20 shares, other-npc has 15, player has 5
    // totalShares = 40. After removing bankrupt-1's 20 shares,
    // other-npc has 15 > 0 (player's 5), so devolution should trigger
    const syndicate = makeSyndicate({
      stallionId: "stallion-1",
      shareHolders: { player: 5, "bankrupt-1": 20, "other-npc": 15 },
    });
    const otherNpcStable = createTestStable({ id: "other-npc", cash: 100000, horses: [] });
    const state = makeGameState({
      npcStables: [stable, otherNpcStable],
      horses: h2r([stallion]),
      syndicates: { "syn-1": syndicate },
    }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const updatedStallion = (result.state as GameState).horses["stallion-1"];
    expect(getStableId(updatedStallion)).toBe("other-npc");
  });

  it("should not devolve if no majority holder remains after dissolution", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const stallion = createTestHorse({
      id: "stallion-1",
      name: "Stallion 1",
      age: 8,
      gender: "horse",
      ownership: makeNpcOwned(asNpcStableId("bankrupt-1")),
      lifetimeEarnings: 5000000,
    });
    // bankrupt-1 has 40 shares, player has 0 (no player buyout needed).
    // After removing bankrupt-1's shares, no shareholders remain at all.
    // findMajorityOwner returns wouldDevolve=false since no holder has > 0 shares.
    const syndicate = makeSyndicate({
      stallionId: "stallion-1",
      shareHolders: { "bankrupt-1": 40 },
    });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([stallion]),
      syndicates: { "syn-1": syndicate },
    }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    // No majority — getStableId(stallion) stays as bankrupt-1 (will be updated when consigned/sold)
    const updatedStallion = (result.state as GameState).horses["stallion-1"];
    expect(getStableId(updatedStallion)).toBe("bankrupt-1");
  });

  it("should respect worldSize: small when generating replacement stable horses", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const state = makeGameState({ npcStables: [stable], worldSize: "small" }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    // Replacement stable should have been spawned with small-world horse counts (~5)
    const newStable = result.state.npcStables.find((s) => s.id !== "bankrupt-1");
    expect(newStable).toBeDefined();
    expect(newStable!.horses.length).toBeLessThanOrEqual(8);
  });
});
