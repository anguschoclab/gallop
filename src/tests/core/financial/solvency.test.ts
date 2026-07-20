import { describe, it, expect } from "vitest";
import {
  deriveSolvencyState,
  selectForcedSaleHorse,
  computeDailyInterest,
  SOLVENCY_THRESHOLDS,
} from "@/core/financial/solvency";

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
    const horses = [
      { id: "a", owned: true, age: 4, value: 20_000 },
      { id: "b", owned: true, age: 6, value: 55_000 },
      { id: "c", owned: false, age: 5, value: 90_000 },
      { id: "d", owned: true, age: 0, value: 80_000 },
    ];
    expect(selectForcedSaleHorse(horses)?.id).toBe("b");
  });

  it("returns null when there is nothing eligible", () => {
    expect(selectForcedSaleHorse([])).toBeNull();
    expect(
      selectForcedSaleHorse([{ id: "x", owned: false, age: 4, value: 10 }]),
    ).toBeNull();
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
