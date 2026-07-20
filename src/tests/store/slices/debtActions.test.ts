import { describe, it, expect, vi, beforeEach } from "vitest";
import { seedStore } from "@/test-utils/renderWithStore";
import { useGame } from "@/game/store";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { h2r } from "@/tests/helpers/sampleGameState";
import { SOLVENCY_THRESHOLDS } from "@/core/financial/solvency";
import { horsePrice } from "@/core/horse/pricing";

describe("payDownDebt action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("injects cash and reduces debt when amount > 0 and cash < 0", () => {
    seedStore({ cash: -30_000, day: 5 });
    const result = useGame.getState().payDownDebt(10_000);
    expect(result.ok).toBe(true);
    expect(useGame.getState().cash).toBe(-20_000);
  });

  it("records a repayment audit entry", () => {
    seedStore({ cash: -30_000, day: 5 });
    useGame.getState().payDownDebt(10_000);
    const audit = useGame.getState().solvencyAuditLog ?? [];
    expect(audit.some((e) => e.kind === "repayment")).toBe(true);
    const entry = audit.find((e) => e.kind === "repayment");
    expect(entry?.delta).toBe(10_000);
    expect(entry?.day).toBe(5);
  });

  it("clears consecutiveDaysInDebt when cash reaches >= 0", () => {
    seedStore({ cash: -5_000, day: 3, consecutiveDaysInDebt: 3 });
    useGame.getState().payDownDebt(5_000);
    expect(useGame.getState().cash).toBe(0);
    expect(useGame.getState().consecutiveDaysInDebt).toBe(0);
  });

  it("does not clear consecutiveDaysInDebt when still in debt after paydown", () => {
    seedStore({ cash: -30_000, day: 3, consecutiveDaysInDebt: 3 });
    useGame.getState().payDownDebt(10_000);
    expect(useGame.getState().cash).toBe(-20_000);
    expect(useGame.getState().consecutiveDaysInDebt).toBe(3);
  });

  it("fails when cash is already positive", () => {
    seedStore({ cash: 50_000, day: 1 });
    const result = useGame.getState().payDownDebt(10_000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/not in debt/i);
    }
  });

  it("fails when amount is <= 0", () => {
    seedStore({ cash: -10_000, day: 1 });
    const result = useGame.getState().payDownDebt(0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/positive/i);
    }
  });

  it("fails when amount exceeds the debt (overpayment)", () => {
    seedStore({ cash: -5_000, day: 1 });
    const result = useGame.getState().payDownDebt(10_000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/exceeds/i);
    }
  });
});

describe("quickSellHorse action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sells horse at distress rate and adds proceeds to cash", () => {
    const horse = createTestHorse({ id: "h1", name: "Sell Me", age: 5 });
    const assessed = horsePrice(horse);
    const expectedSale = Math.round(assessed * SOLVENCY_THRESHOLDS.distressSaleRate);
    seedStore({
      cash: -30_000,
      day: 3,
      horses: h2r([horse]),
    });
    const result = useGame.getState().quickSellHorse("h1");
    expect(result.ok).toBe(true);
    expect(useGame.getState().cash).toBe(-30_000 + expectedSale);
  });

  it("removes horse from player ownership", () => {
    const horse = createTestHorse({ id: "h1", name: "Sell Me", age: 5 });
    seedStore({
      cash: -30_000,
      day: 3,
      horses: h2r([horse]),
    });
    useGame.getState().quickSellHorse("h1");
    const soldHorse = useGame.getState().horses["h1"];
    expect(soldHorse.owned).toBe(false);
  });

  it("records a voluntary_sale audit entry", () => {
    const horse = createTestHorse({ id: "h1", name: "Sell Me", age: 5 });
    seedStore({
      cash: -30_000,
      day: 3,
      horses: h2r([horse]),
    });
    useGame.getState().quickSellHorse("h1");
    const audit = useGame.getState().solvencyAuditLog ?? [];
    expect(audit.some((e) => e.kind === "voluntary_sale")).toBe(true);
  });

  it("fails when horse is not owned by player", () => {
    const npcHorse = createTestHorse({
      id: "npc1",
      name: "NPC Horse",
      age: 5,
      owned: false,
      stableId: "npc-stable",
    });
    seedStore({
      cash: -30_000,
      day: 3,
      horses: h2r([npcHorse]),
    });
    const result = useGame.getState().quickSellHorse("npc1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/not owned/i);
    }
  });

  it("fails when horse does not exist", () => {
    seedStore({ cash: -30_000, day: 3 });
    const result = useGame.getState().quickSellHorse("nonexistent");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/not found/i);
    }
  });

  it("fails when horse is a foal (age 0)", () => {
    const foal = createTestHorse({ id: "foal1", name: "Baby", age: 0 });
    seedStore({
      cash: -30_000,
      day: 3,
      horses: h2r([foal]),
    });
    const result = useGame.getState().quickSellHorse("foal1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/foal|age/i);
    }
  });

  it("clears debt counter when sale proceeds bring cash >= 0", () => {
    const horse = createTestHorse({
      id: "h1",
      name: "Valuable",
      age: 5,
      stats: { speed: 110, stamina: 110, acceleration: 110, consistency: 110, temperament: 50, conformation: 50 },
    });
    seedStore({
      cash: -1_000,
      day: 3,
      consecutiveDaysInDebt: 2,
      horses: h2r([horse]),
    });
    const result = useGame.getState().quickSellHorse("h1");
    expect(result.ok).toBe(true);
    expect(useGame.getState().cash).toBeGreaterThanOrEqual(0);
    expect(useGame.getState().consecutiveDaysInDebt).toBe(0);
  });
});
