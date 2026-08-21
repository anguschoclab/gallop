/**
 * Integration tests for NPC bankruptcy lifecycle —
 * verifies the full flow from bankruptcy detection through replacement,
 * and that the replacement stable functions in subsequent pipeline phases.
 */

import { describe, it, expect } from "vitest";
import { npcBankruptcyPhase } from "@/core/time/phases/npcBankruptcy";
import { upkeepPhase } from "@/core/time/phases/upkeep";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Syndicate } from "@/game/types";
import type {
  CashImpact,
  ConsignmentImpact,
  NewsImpact,
  InboxImpact,
  HorseCreationImpact,
} from "@/core/resolver/impacts/index";

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

describe("NPC Bankruptcy Lifecycle (integration)", () => {
  it("full lifecycle: upkeep drains cash → bankruptcy phase dissolves and replaces", () => {
    const stable = createTestStable({
      id: "poor-stable",
      cash: 50,
      horses: ["horse-1"],
    });
    const horse = createTestHorse({
      id: "horse-1",
      name: "Soon To Be Liquidated",
      age: 3,
      gender: "colt",
      stableId: "poor-stable",
      ownership: { type: "unowned" },
    });
    const state = makeGameState({
      day: 10,
      npcStables: [stable],
      horses: h2r([horse]),
    }) as GameState;

    // Run upkeep — will drain the stable's cash below 0
    let context = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const upkeepResult = upkeepPhase.execute(context);
    const npcCashImpact = upkeepResult.impacts.find(
      (i): i is CashImpact => i.type === "cash_change" && i.entityId === "poor-stable",
    );
    expect(npcCashImpact).toBeDefined();
    expect(npcCashImpact!.amount).toBeLessThan(0);

    // Apply the upkeep impact to get the updated cash
    const postUpkeepState: GameState = {
      ...upkeepResult.state,
      npcStables: upkeepResult.state.npcStables.map((s) =>
        s.id === "poor-stable" ? { ...s, cash: s.cash + npcCashImpact!.amount } : s,
      ),
    };

    context = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state: postUpkeepState,
    }) as PipelineContext;

    const bankruptcyResult = npcBankruptcyPhase.execute(context);

    // Verify the bankrupt stable is gone
    expect(bankruptcyResult.state.npcStables.some((s) => s.id === "poor-stable")).toBe(false);

    // Verify a replacement stable exists
    const replacement = bankruptcyResult.state.npcStables.find((s) => s.id !== "poor-stable");
    expect(replacement).toBeDefined();
    expect(replacement!.tier).toBe("budget");

    // Verify liquidation sale was created
    const liquidationSale = (bankruptcyResult.state as GameState).auctions?.find(
      (a) => a.kind === "liquidation",
    );
    expect(liquidationSale).toBeDefined();

    // Verify consignment impact for the horse
    const consignmentImpacts = bankruptcyResult.impacts.filter(
      (i): i is ConsignmentImpact => i.type === "consignment",
    );
    expect(consignmentImpacts).toHaveLength(1);
    expect(consignmentImpacts[0].horseId).toBe("horse-1");

    // Verify news and inbox messages
    const newsImpact = bankruptcyResult.impacts.find(
      (i): i is NewsImpact => i.type === "news_item",
    );
    expect(newsImpact).toBeDefined();

    const inboxImpacts = bankruptcyResult.impacts.filter(
      (i): i is InboxImpact => i.type === "inbox_message",
    );
    expect(inboxImpacts.length).toBeGreaterThanOrEqual(1);
  });

  it("player with syndicate shares in bankrupt stable's stallion receives buyout cash", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const stallion = createTestHorse({
      id: "stallion-1",
      name: "Syndicated Stallion",
      age: 8,
      gender: "horse",
      stableId: "bankrupt-1",
      ownership: { type: "unowned" },
      lifetimeEarnings: 5000000,
    });
    const syndicate = makeSyndicate({
      stallionId: "stallion-1",
      shareHolders: { player: 10, "bankrupt-1": 30 },
    });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([stallion]),
      syndicates: { "syn-1": syndicate },
      cash: 100000,
    }) as GameState;

    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const cashImpact = result.impacts.find(
      (i): i is CashImpact => i.type === "cash_change" && i.entityId === "player",
    );
    expect(cashImpact).toBeDefined();
    expect(cashImpact!.amount).toBeGreaterThan(0);

    // Verify player removed from shareHolders
    const updatedSyndicate = (result.state as GameState).syndicates["syn-1"];
    expect(updatedSyndicate.shareHolders["player"]).toBeUndefined();
    expect(updatedSyndicate.shareHolders["bankrupt-1"]).toBeUndefined();
  });

  it("replacement stable exists and functions in subsequent pipeline phases", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const state = makeGameState({ npcStables: [stable] }) as GameState;

    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const replacement = result.state.npcStables.find((s) => s.id !== "bankrupt-1");
    expect(replacement).toBeDefined();
    expect(replacement!.cash).toBeGreaterThan(0);
    expect(replacement!.horses.length).toBeGreaterThan(0);

    // Apply horse_creation impacts to state so upkeep can find the horses
    const horseCreationImpacts = result.impacts.filter(
      (i): i is HorseCreationImpact => i.type === "horse_creation",
    );
    const postBankruptcyState = { ...result.state } as GameState;
    postBankruptcyState.horses = { ...postBankruptcyState.horses };
    for (const impact of horseCreationImpacts) {
      postBankruptcyState.horses[impact.horse.id] = impact.horse;
    }

    // Run upkeep on the replacement stable — should produce cash_change impact
    const upkeepContext = makePipelineContext({
      previousDay: 10,
      newDay: 11,
      state: postBankruptcyState,
    }) as PipelineContext;

    const upkeepResult = upkeepPhase.execute(upkeepContext);
    const replacementCashImpact = upkeepResult.impacts.find(
      (i): i is CashImpact => i.type === "cash_change" && i.entityId === replacement!.id,
    );
    expect(replacementCashImpact).toBeDefined();
    expect(replacementCashImpact!.amount).toBeLessThan(0);
  });

  it("syndicate buyout → dissolution → devolution in one pass", () => {
    const stable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const stallion = createTestHorse({
      id: "stallion-1",
      name: "Syndicated Stallion",
      age: 8,
      gender: "horse",
      stableId: "bankrupt-1",
      ownership: { type: "unowned" },
      lifetimeEarnings: 5000000,
    });
    const otherNpcStable = createTestStable({ id: "other-npc", cash: 100000, horses: [] });
    const syndicate = makeSyndicate({
      stallionId: "stallion-1",
      shareHolders: { player: 5, "bankrupt-1": 20, "other-npc": 15 },
    });
    const state = makeGameState({
      npcStables: [stable, otherNpcStable],
      horses: h2r([stallion]),
      syndicates: { "syn-1": syndicate },
    }) as GameState;

    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const cashImpact = result.impacts.find(
      (i): i is CashImpact => i.type === "cash_change" && i.entityId === "player",
    );
    expect(cashImpact).toBeDefined();
    expect(cashImpact!.amount).toBeGreaterThan(0);

    const updatedSyndicate = (result.state as GameState).syndicates["syn-1"];
    expect(updatedSyndicate.shareHolders["bankrupt-1"]).toBeUndefined();
    expect(updatedSyndicate.shareHolders["player"]).toBeUndefined();
    expect(updatedSyndicate.shareHolders["other-npc"]).toBe(15);

    const updatedStallion = (result.state as GameState).horses["stallion-1"];
    expect(updatedStallion.stableId).toBe("other-npc");
  });

  it("multiple bankruptcies on same day each produce separate liquidation sales", () => {
    const stable1 = createTestStable({ id: "bankrupt-1", cash: 0, horses: ["h1"] });
    const stable2 = createTestStable({ id: "bankrupt-2", cash: -500, horses: ["h2"] });
    const horse1 = createTestHorse({
      id: "h1",
      name: "H1",
      age: 3,
      gender: "colt",
      stableId: "bankrupt-1",
      ownership: { type: "unowned" },
    });
    const horse2 = createTestHorse({
      id: "h2",
      name: "H2",
      age: 5,
      gender: "mare",
      stableId: "bankrupt-2",
      ownership: { type: "unowned" },
    });
    const state = makeGameState({
      npcStables: [stable1, stable2],
      horses: h2r([horse1, horse2]),
    }) as GameState;

    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    const liquidationSales = (result.state as GameState).auctions?.filter(
      (a) => a.kind === "liquidation",
    );
    expect(liquidationSales).toHaveLength(2);

    const consignmentImpacts = result.impacts.filter(
      (i): i is ConsignmentImpact => i.type === "consignment",
    );
    expect(consignmentImpacts).toHaveLength(2);

    const newsImpacts = result.impacts.filter((i): i is NewsImpact => i.type === "news_item");
    expect(newsImpacts).toHaveLength(2);

    expect(result.state.npcStables.some((s) => s.id === "bankrupt-1")).toBe(false);
    expect(result.state.npcStables.some((s) => s.id === "bankrupt-2")).toBe(false);
    const replacements = result.state.npcStables.filter(
      (s) => s.id !== "bankrupt-1" && s.id !== "bankrupt-2",
    );
    expect(replacements).toHaveLength(2);
  });

  it("healthy stable survives while bankrupt stable is dissolved in same run", () => {
    const bankruptStable = createTestStable({ id: "bankrupt-1", cash: 0, horses: [] });
    const healthyStable = createTestStable({
      id: "healthy-1",
      cash: 500000,
      horses: [],
    });
    const state = makeGameState({ npcStables: [bankruptStable, healthyStable] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    expect(result.state.npcStables.some((s) => s.id === "healthy-1")).toBe(true);
    expect(result.state.npcStables.some((s) => s.id === "bankrupt-1")).toBe(false);

    const healthyInResult = result.state.npcStables.find((s) => s.id === "healthy-1");
    expect(healthyInResult!.cash).toBe(500000);
  });

  it("no bankruptcy impacts when all stables are healthy", () => {
    const stable1 = createTestStable({ id: "healthy-1", cash: 100000, horses: [] });
    const stable2 = createTestStable({ id: "healthy-2", cash: 50000, horses: [] });
    const state = makeGameState({ npcStables: [stable1, stable2] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    expect(result.impacts).toHaveLength(0);
    expect(result.state.npcStables).toHaveLength(2);
  });

  it("no bankruptcies when npcStables is empty", () => {
    const state = makeGameState({ npcStables: [] }) as GameState;

    const context = makePipelineContext({ state }) as PipelineContext;
    const result = npcBankruptcyPhase.execute(context);

    expect(result.impacts).toHaveLength(0);
    expect(result.state.npcStables).toHaveLength(0);
  });
});
