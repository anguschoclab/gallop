import { describe, it, expect } from "vitest";
import {
  deriveSolvencyState,
  selectForcedSaleHorse,
  computeDailyInterest,
  previewSeizure,
  SOLVENCY_THRESHOLDS,
  type SellableHorse,
} from "@/core/financial/solvency";
import { createTestHorse, createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import { horsePrice } from "@/core/horse/pricing";

describe("deriveSolvencyState", () => {
  it("returns healthy for non-negative cash", () => {
    expect(deriveSolvencyState({ cash: 0, consecutiveDaysInDebt: 0 }).tier).toBe("healthy");
    expect(deriveSolvencyState({ cash: 100, consecutiveDaysInDebt: 10 }).tier).toBe("healthy");
  });

  it("returns warning while cash is negative but above the forced-sale threshold", () => {
    expect(deriveSolvencyState({ cash: -500, consecutiveDaysInDebt: 3 }).tier).toBe("warning");
  });

  it("waits the grace period before triggering a forced sale", () => {
    const belowThreshold = SOLVENCY_THRESHOLDS.forcedSaleCash - 1;
    expect(deriveSolvencyState({ cash: belowThreshold, consecutiveDaysInDebt: 1 }).tier).toBe(
      "warning",
    );
    expect(
      deriveSolvencyState({
        cash: belowThreshold,
        consecutiveDaysInDebt: SOLVENCY_THRESHOLDS.forcedSaleDays,
      }).tier,
    ).toBe("forced_sale");
  });

  it("returns insolvent once cash breaches the hard floor", () => {
    expect(
      deriveSolvencyState({
        cash: SOLVENCY_THRESHOLDS.insolventCash,
        consecutiveDaysInDebt: 0,
      }).tier,
    ).toBe("insolvent");
  });

  it("reports cashToRecover as the absolute deficit", () => {
    expect(deriveSolvencyState({ cash: -1234, consecutiveDaysInDebt: 0 }).cashToRecover).toBe(1234);
    expect(deriveSolvencyState({ cash: 200, consecutiveDaysInDebt: 0 }).cashToRecover).toBe(0);
  });
});

describe("selectForcedSaleHorse", () => {
  it("returns the most valuable owned adult", () => {
    const horses: SellableHorse[] = [
      { id: "a", ownership: { type: "player" }, age: 4, value: 20_000 },
      { id: "b", ownership: { type: "player" }, age: 6, value: 55_000 },
      { id: "c", ownership: { type: "unowned" }, age: 5, value: 90_000 },
      { id: "d", ownership: { type: "player" }, age: 0, value: 80_000 },
    ];
    expect(selectForcedSaleHorse(horses)?.id).toBe("b");
  });

  it("returns null when there is nothing eligible", () => {
    expect(selectForcedSaleHorse([])).toBeNull();
    expect(selectForcedSaleHorse([{ id: "x", ownership: { type: "unowned" }, age: 4, value: 10 }] as SellableHorse[])).toBeNull();
  });
});

describe("computeDailyInterest", () => {
  it("is zero for non-negative cash", () => {
    expect(computeDailyInterest(0)).toBe(0);
    expect(computeDailyInterest(50_000)).toBe(0);
  });

  it("scales with the absolute debt", () => {
    expect(computeDailyInterest(-10_000)).toBe(
      Math.round(10_000 * SOLVENCY_THRESHOLDS.dailyInterestRate),
    );
    expect(computeDailyInterest(-100_000)).toBe(
      Math.round(100_000 * SOLVENCY_THRESHOLDS.dailyInterestRate),
    );
  });
});

describe("previewSeizure", () => {
  it("returns the most valuable owned adult horse", () => {
    const cheap = createTestHorse({
      id: "cheap",
      name: "Cheap Chuck",
      age: 5,
      stats: {
        speed: 60,
        stamina: 60,
        acceleration: 60,
        consistency: 60,
        temperament: 50,
        conformation: 50,
      },
    });
    const valuable = createTestHorse({
      id: "valuable",
      name: "Star Runner",
      age: 5,
      stats: {
        speed: 100,
        stamina: 100,
        acceleration: 100,
        consistency: 100,
        temperament: 50,
        conformation: 50,
      },
    });
    const result = previewSeizure([cheap, valuable], -50_000);
    expect(result).not.toBeNull();
    expect(result!.horseId).toBe("valuable");
    expect(result!.horseName).toBe("Star Runner");
  });

  it("returns null when no eligible horses", () => {
    expect(previewSeizure([], -50_000)).toBeNull();
  });

  it("excludes NPC horses (stableId set)", () => {
    const npc = createTestNpcHorse({ id: "npc", name: "NPC Horse", age: 5 });
    const player = createTestHorse({ id: "player", name: "My Horse", age: 5 });
    const result = previewSeizure([npc, player], -50_000);
    expect(result).not.toBeNull();
    expect(result!.horseId).toBe("player");
  });

  it("excludes foals (age === 0)", () => {
    const foal = createTestHorse({ id: "foal", name: "Baby", age: 0 });
    const adult = createTestHorse({ id: "adult", name: "Adult", age: 5 });
    const result = previewSeizure([foal, adult], -50_000);
    expect(result).not.toBeNull();
    expect(result!.horseId).toBe("adult");
  });

  it("computes salePrice as 70% of assessedValue", () => {
    const horse = createTestHorse({ id: "h1", name: "Test", age: 5 });
    const assessed = horsePrice(horse);
    const result = previewSeizure([horse], -50_000);
    expect(result).not.toBeNull();
    expect(result!.assessedValue).toBe(assessed);
    expect(result!.salePrice).toBe(Math.round(assessed * SOLVENCY_THRESHOLDS.distressSaleRate));
  });

  it("computes deficitAfter correctly when salePrice < debt", () => {
    const horse = createTestHorse({
      id: "h1",
      name: "Test",
      age: 5,
      stats: {
        speed: 60,
        stamina: 60,
        acceleration: 60,
        consistency: 60,
        temperament: 50,
        conformation: 50,
      },
    });
    const assessed = horsePrice(horse);
    const salePrice = Math.round(assessed * SOLVENCY_THRESHOLDS.distressSaleRate);
    const result = previewSeizure([horse], -50_000);
    expect(result).not.toBeNull();
    expect(result!.deficitAfter).toBe(Math.max(0, 50_000 - salePrice));
  });

  it("clamps deficitAfter to 0 when salePrice exceeds debt", () => {
    const horse = createTestHorse({
      id: "h1",
      name: "Valuable",
      age: 5,
      stats: {
        speed: 110,
        stamina: 110,
        acceleration: 110,
        consistency: 110,
        temperament: 50,
        conformation: 50,
      },
    });
    const result = previewSeizure([horse], -1_000);
    expect(result).not.toBeNull();
    expect(result!.deficitAfter).toBe(0);
  });

  it("selects same horse as selectForcedSaleHorse on identical input", () => {
    const horses = [
      createTestHorse({
        id: "a",
        name: "A",
        age: 4,
        stats: {
          speed: 70,
          stamina: 70,
          acceleration: 70,
          consistency: 70,
          temperament: 50,
          conformation: 50,
        },
      }),
      createTestHorse({
        id: "b",
        name: "B",
        age: 6,
        stats: {
          speed: 90,
          stamina: 90,
          acceleration: 90,
          consistency: 90,
          temperament: 50,
          conformation: 50,
        },
      }),
    ];
    const sellable = horses.map((h) => ({
      id: h.id,
      ownership: h.ownership,
      age: h.age,
      value: horsePrice(h),
      name: h.name,
    }));
    const forcedPick = selectForcedSaleHorse(sellable);
    const preview = previewSeizure(horses, -50_000);
    expect(preview).not.toBeNull();
    expect(preview!.horseId).toBe(forcedPick?.id);
  });
});
