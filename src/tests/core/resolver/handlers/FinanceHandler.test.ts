import { describe, it, expect } from "vitest";
import { FinanceHandler } from "@/core/resolver/handlers/FinanceHandler";
import type { GameState } from "@/game/store/state";
import type {
  CashImpact,
  HorseTransferImpact,
  TransactionImpact,
} from "@/core/resolver/impacts/index";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import type { Horse } from "@/game/types";

describe("FinanceHandler", () => {
  it("cash_change with entityId='player' updates draft.cash", () => {
    const handler = new FinanceHandler();
    const state = { cash: 1000, horses: {}, npcStables: [] } as unknown as GameState;

    const impact: CashImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "cash_change",
      entityId: "player",
      amount: 500,
      reason: "Prize money",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.cash).toBe(1500);
  });

  it("cash_change with NPC stable ID updates stable cash", () => {
    const handler = new FinanceHandler();
    const state = {
      cash: 1000,
      horses: {},
      npcStables: [{ id: "stable-1", cash: 200 }],
    } as unknown as GameState;

    const impact: CashImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "cash_change",
      entityId: "stable-1",
      amount: 300,
      reason: "NPC prize money",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.cash).toBe(1000);
    expect(draft.npcStables[0].cash).toBe(500);
  });

  it("cash_change allows player cash to go negative (solvency handles escalation)", () => {
    const handler = new FinanceHandler();
    const state = { cash: 100, horses: {}, npcStables: [] } as unknown as GameState;

    const impact: CashImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "cash_change",
      entityId: "player",
      amount: -500,
      reason: "Big expense",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.cash).toBe(-400);
  });

  it("horse_transfer sets horse.ownership to npc", () => {
    const handler = new FinanceHandler();
    const state = {
      cash: 1000,
      horses: h2r([
        { id: "horse-1", name: "Star", ownership: { type: "player" } },
      ] as unknown as Horse[]),
      npcStables: [],
    } as unknown as GameState;

    const impact: HorseTransferImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "horse_transfer",
      horseId: "horse-1",
      toStableId: "stable-2",
      price: 50000,
      reason: "Claimed",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["horse-1"].ownership).toEqual({ type: "npc", stableId: "stable-2" });
  });

  it("horse_transfer to empty stableId sets ownership to player", () => {
    const handler = new FinanceHandler();
    const state = {
      cash: 1000,
      horses: h2r([
        { id: "horse-1", name: "Star", ownership: { type: "unowned" } },
      ] as unknown as Horse[]),
      npcStables: [],
    } as unknown as GameState;

    const impact: HorseTransferImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "horse_transfer",
      horseId: "horse-1",
      toStableId: "",
      price: 0,
      reason: "Returned to player",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["horse-1"].ownership).toEqual({ type: "player" });
  });

  it("transaction creates a transaction entry with correct type", () => {
    const handler = new FinanceHandler();
    const state = { cash: 1000, transactions: [], horses: {} } as unknown as GameState;

    const impact: TransactionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "transaction",
      amount: 500,
      category: "prize_money",
      description: "Race winnings",
      reason: "Transaction",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.transactions).toHaveLength(1);
    expect(draft.transactions[0].amount).toBe(500);
    expect(draft.transactions[0].type).toBe("income");
  });

  it("transaction with negative amount creates expense type", () => {
    const handler = new FinanceHandler();
    const state = { cash: 1000, transactions: [], horses: {} } as unknown as GameState;

    const impact: TransactionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "transaction",
      amount: -200,
      category: "entry_fee",
      description: "Race entry fee",
      reason: "Transaction",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.transactions).toHaveLength(1);
    expect(draft.transactions[0].type).toBe("expense");
  });

  it("canHandle returns true for cash_change, horse_transfer, and transaction", () => {
    const handler = new FinanceHandler();
    expect(handler.canHandle("cash_change")).toBe(true);
    expect(handler.canHandle("horse_transfer")).toBe(true);
    expect(handler.canHandle("transaction")).toBe(true);
    expect(handler.canHandle("unknown_type")).toBe(false);
  });
});
