import { describe, it, expect } from "vitest";
import { FinanceHandler } from "@/core/resolver/handlers/FinanceHandler";
import type { GameState } from "@/game/store/state";
import type { CashImpact, HorseTransferImpact } from "@/core/resolver/impacts/index";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

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

  it("cash_change prevents cash from going negative", () => {
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

    expect(draft.cash).toBe(0);
  });

  it("horse_transfer sets horse.stableId and horse.owned", () => {
    const handler = new FinanceHandler();
    const state = {
      cash: 1000,
      horses: h2r([{ id: "horse-1", name: "Star", stableId: "player", owned: true }] as unknown as Horse[]),
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

    expect(draft.horses[0].stableId).toBe("stable-2");
    expect(draft.horses[0].owned).toBe(false);
  });

  it("horse_transfer to empty stableId sets owned=true", () => {
    const handler = new FinanceHandler();
    const state = {
      cash: 1000,
      horses: h2r([{ id: "horse-1", name: "Star", stableId: "stable-2", owned: false }] as unknown as Horse[]),
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

    expect(draft.horses[0].stableId).toBe("");
    expect(draft.horses[0].owned).toBe(true);
  });

  it("canHandle returns true for cash_change and horse_transfer only", () => {
    const handler = new FinanceHandler();
    expect(handler.canHandle("cash_change")).toBe(true);
    expect(handler.canHandle("horse_transfer")).toBe(true);
    expect(handler.canHandle("transaction")).toBe(false);
    expect(handler.canHandle("unknown_type")).toBe(false);
  });
});
