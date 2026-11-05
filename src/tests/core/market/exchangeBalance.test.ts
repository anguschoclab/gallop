import { describe, it, expect } from "vitest";
import { createInitialState } from "@/platform/game/store/initialization";
import { BACKSTORIES } from "@/shared/common/backstories";
import { runExchangeSettlementDay } from "@/domains/market/simulation/exchangeSettlement";
import { createDefaultExchangeState, exchangeCommissionRate } from "@/domains/market/simulation/exchange";
import { EXCHANGE_NPC_CASH_RESERVE } from "@/domains/market/simulation/exchangeAI";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";

function world(): any {
  const b = BACKSTORIES[0];
  return createInitialState({
    profile: {
      stableName: "Balance",
      owner: generatePersonIdentity({ id: "player", displayName: "x", role: "owner", ageBand: "adult" }),
      silk: { pattern: "solid", primary: "#f00", secondary: "#00f", cap: "#0f0" },
      backstoryId: b.id,
      founded: 1,
    },
    backstory: b,
    worldSize: "small",
  } as any);
}

describe("exchange balance over 120 days", { timeout: 120_000 }, () => {
  const s = world();
  let ex = createDefaultExchangeState();
  let horses = s.horses;
  let stables = s.npcStables;
  const startTotal = stables.reduce((a: number, x: any) => a + x.cash, 0);
  const startRep = new Map(stables.map((x: any) => [x.id, x.reputation]));
  let lateTrades = 0;
  let belowReserveBuys = 0;
  for (let d = 1; d <= 120; d++) {
    const before = new Map(stables.map((x: any) => [x.id, x.cash]));
    const r = runExchangeSettlementDay({ day: d, exchange: ex, horses, npcStables: stables, playerReputation: 100 });
    for (const t of r.exchange.trades.filter((t) => t.day === d)) {
      if (d > 90) lateTrades++;
      const after = r.npcStables.find((x) => x.id === t.buyerId)?.cash ?? Infinity;
      if (before.has(t.buyerId) && after < Math.min(EXCHANGE_NPC_CASH_RESERVE, before.get(t.buyerId) as number)) belowReserveBuys++;
    }
    ex = r.exchange;
    horses = r.horses;
    stables = r.npcStables;
  }
  const endTotal = stables.reduce((a: number, x: any) => a + x.cash, 0);

  it("keeps trades settling after the first month", () => expect(lateTrades).toBeGreaterThanOrEqual(30));
  it("drains at most 25% of rival cash through commission", () => expect(endTotal).toBeGreaterThan(startTotal * 0.75));
  it("never mints rival cash", () => expect(endTotal).toBeLessThanOrEqual(startTotal));
  it("never lets a buyer dip under its cash reserve", () => expect(belowReserveBuys).toBe(0));
  it("leaves stable reputation untouched", () =>
    expect(stables.every((x: any) => x.reputation === startRep.get(x.id))).toBe(true));
  it("charges about 2.8% at the exchange's prestige", () =>
    expect(exchangeCommissionRate()).toBeCloseTo(0.0277, 3));
});
