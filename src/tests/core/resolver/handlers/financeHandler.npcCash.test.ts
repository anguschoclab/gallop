/**
 * Tests for FinanceHandler — NPC cash no longer clamped to 0
 */

import { describe, it, expect } from "vitest";
import { FinanceHandler } from "@/core/resolver/handlers/FinanceHandler";
import type { GameState } from "@/game/types";
import type { CashImpact } from "@/core/resolver/impacts/financialImpacts";
import { createTestStable } from "@/tests/helpers";

describe("FinanceHandler cash_change — NPC cash", () => {
  it("should allow NPC cash to go negative (no Math.max clamp)", () => {
    const handler = new FinanceHandler();
    const stable = createTestStable({ id: "npc-1", cash: 1000 });
    const state = {
      npcStables: [stable],
      cash: 50000,
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: CashImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "upkeep",
      logLevel: "conditional",
      type: "cash_change",
      entityId: "npc-1",
      amount: -5000,
      reason: "Daily upkeep",
    };

    handler.handle(draft, impact);

    expect(draft.npcStables[0].cash).toBe(-4000);
  });

  it("should add positive cash changes to NPC stable", () => {
    const handler = new FinanceHandler();
    const stable = createTestStable({ id: "npc-1", cash: 10000 });
    const state = {
      npcStables: [stable],
      cash: 50000,
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: CashImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "races",
      logLevel: "conditional",
      type: "cash_change",
      entityId: "npc-1",
      amount: 25000,
      reason: "Race winnings",
    };

    handler.handle(draft, impact);

    expect(draft.npcStables[0].cash).toBe(35000);
  });

  it("should handle NPC stable at exactly 0 cash after deduction", () => {
    const handler = new FinanceHandler();
    const stable = createTestStable({ id: "npc-1", cash: 5000 });
    const state = {
      npcStables: [stable],
      cash: 50000,
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: CashImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "upkeep",
      logLevel: "conditional",
      type: "cash_change",
      entityId: "npc-1",
      amount: -5000,
      reason: "Daily upkeep",
    };

    handler.handle(draft, impact);

    expect(draft.npcStables[0].cash).toBe(0);
  });

  it("should not affect player cash for NPC cash_change", () => {
    const handler = new FinanceHandler();
    const stable = createTestStable({ id: "npc-1", cash: 10000 });
    const state = {
      npcStables: [stable],
      cash: 50000,
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: CashImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "upkeep",
      logLevel: "conditional",
      type: "cash_change",
      entityId: "npc-1",
      amount: -5000,
      reason: "Daily upkeep",
    };

    handler.handle(draft, impact);

    expect(draft.cash).toBe(50000);
  });

  it("should update player cash when entityId is 'player'", () => {
    const handler = new FinanceHandler();
    const state = {
      npcStables: [],
      cash: 50000,
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: CashImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "npcBankruptcy",
      logLevel: "always",
      type: "cash_change",
      entityId: "player",
      amount: 50000,
      reason: "Syndicate buyout",
    };

    handler.handle(draft, impact);

    expect(draft.cash).toBe(100000);
  });

  it("should find stable via npcStables array when lookupMaps not provided", () => {
    const handler = new FinanceHandler();
    const stable = createTestStable({ id: "npc-1", cash: 3000 });
    const state = {
      npcStables: [stable],
      cash: 50000,
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: CashImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "upkeep",
      logLevel: "conditional",
      type: "cash_change",
      entityId: "npc-1",
      amount: -10000,
      reason: "Large expense",
    };

    handler.handle(draft, impact);

    expect(draft.npcStables[0].cash).toBe(-7000);
  });

  it("should allow player cash to go negative (unchanged behavior)", () => {
    const handler = new FinanceHandler();
    const state = {
      npcStables: [],
      cash: 5000,
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: CashImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "upkeep",
      logLevel: "conditional",
      type: "cash_change",
      entityId: "player",
      amount: -20000,
      reason: "Large expense",
    };

    handler.handle(draft, impact);

    expect(draft.cash).toBe(-15000);
  });
});
