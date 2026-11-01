import { describe, expect, it } from "vitest";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { horseMarketValue, horsePrice } from "@/domains/horse/simulation/pricing";
import { npcWalkAwayPrice } from "@/domains/auction/simulation/engine";
import {
  explainHorseValue,
  explainPriceMovement,
  saleKindForHorse,
} from "@/domains/market/simulation/valuationBreakdown";
import type { Horse, Stable } from "@/platform/game/types";

function horse(over: Partial<Horse> = {}): Horse {
  return createTestHorse({
    age: 4,
    gender: "colt",
    raceHistory: [],
    fame: 10,
    fanCount: 0,
    ...over,
  });
}

const win = (day: number) =>
  ({ day, position: 1, raceName: "R", raceId: `r${day}`, prize: 1000, fieldSize: 8 }) as never;

describe("explainHorseValue", () => {
  it("ends the racing steps at horsePrice × pedigree × form and totals to market value", () => {
    const h = horse({ raceHistory: [win(10)] });
    const b = explainHorseValue(h, [h]);
    expect(b.marketValue).toBe(horseMarketValue(h, [h]));
    const fans = b.factors.find((f) => f.key === "fans")!;
    // horsePrice rounds to $50; the step value before rounding must be within $50.
    expect(Math.abs(fans.valueAfter - horsePrice(h))).toBeLessThanOrEqual(50);
    expect(b.factors.find((f) => f.key === "form")!.multiplier).toBeCloseTo(1.04, 5);
  });
});

describe("explainPriceMovement", () => {
  it("credits a win inside the window to recent results", () => {
    const h = horse({ raceHistory: [win(95)] });
    const m = explainPriceMovement(h, [h], undefined, 100, 30);
    expect(m.winsInWindow).toBe(1);
    expect(m.fromResults).toBeGreaterThan(0);
    expect(m.change).toBeNull();
  });

  it("does not credit a win older than the window", () => {
    const h = horse({ raceHistory: [win(10)] });
    const m = explainPriceMovement(h, [h], undefined, 100, 30);
    expect(m.winsInWindow).toBe(0);
    expect(m.fromResults).toBe(0);
  });

  it("splits a recorded price change into results, reputation and the rest", () => {
    const h = horse({ raceHistory: [win(95)], fame: 60 });
    const m = explainPriceMovement(
      h,
      [h],
      [{ day: 60, rank: 40, points: 0, reputation: 10, price: 1000 }],
      100,
      30,
    );
    expect(m.priceThen).toBe(1000);
    expect(m.change).toBe(m.priceNow - 1000);
    expect(m.fromResults + m.fromReputation + (m.fromOther ?? 0)).toBe(m.change);
    expect(m.rankThen).toBe(40);
  });

  it("measures from the first record when history starts inside the window", () => {
    const h = horse({ raceHistory: [win(80), win(95)] });
    const m = explainPriceMovement(
      h,
      [h],
      [{ day: 90, rank: 3, points: 0, reputation: 10, price: 5000 }],
      100,
      30,
    );
    expect(m.windowDays).toBe(10);
    expect(m.winsInWindow).toBe(1); // the day-80 win was already in the day-90 price
  });

  it("ignores snapshots recorded before the horse had a price", () => {
    const h = horse();
    const m = explainPriceMovement(
      h,
      [h],
      [{ day: 60, rank: 5, points: 0, reputation: 10, price: 0 }],
      100,
      30,
    );
    expect(m.priceThen).toBeNull();
    expect(m.change).toBeNull();
  });
});

describe("npcWalkAwayPrice", () => {
  const stable = (over: Partial<Stable>) =>
    ({
      id: "s1",
      name: "Rival",
      personality: "aggressive",
      tier: 2,
      cash: 10_000_000,
      ...over,
    }) as Stable;

  it("conservative stables stop at 80% of their valuation", () => {
    const h = horse();
    const w = npcWalkAwayPrice(stable({ personality: "conservative" }), h, "racing_age", [h]);
    expect(w.limitedBy).toBe("personality");
    expect(w.walkAway).toBe(Math.floor((w.valuation * 0.8) / 100) * 100);
  });

  it("a cash-poor stable is capped by its budget", () => {
    const h = horse();
    const w = npcWalkAwayPrice(
      stable({ personality: "conservative", cash: 1000 }),
      h,
      "racing_age",
      [h],
    );
    expect(w.limitedBy).toBe("cash");
    expect(w.walkAway).toBe(100); // 15% of $1,000 = $150, rounded down to $100
  });
});

describe("saleKindForHorse", () => {
  it("maps ages to sale rings", () => {
    expect(saleKindForHorse(horse({ age: 1 }))).toBe("yearling");
    expect(saleKindForHorse(horse({ age: 2 }))).toBe("2yo_training");
    expect(saleKindForHorse(horse({ age: 5 }))).toBe("racing_age");
  });
});
