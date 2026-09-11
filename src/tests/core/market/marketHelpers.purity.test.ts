import { describe, it, expect } from "vitest";
import { ageHorses, refreshMarket } from "@/core/market/marketRefresh";
import { generateHorse } from "@/core/horse/horseFactory";
import { makeUnowned } from "@/core/horse/ownership";
import { createRng, hashStr } from "@/core/common/rng";
import type { Horse } from "@/game/types";

/**
 * Purity tests for market helper functions.
 * These assert that the functions do NOT mutate their inputs — a
 * prerequisite for moving them into the core layer where purity is
 * mandatory.
 *
 * Pattern follows store.pure.test.ts:258 ("should not mutate input").
 */

describe("ageHorses purity", () => {
  it("does not mutate the input horses array", () => {
    const horses = [
      generateHorse({ tier: "budget", ownership: makeUnowned() }),
      generateHorse({ tier: "budget", ownership: makeUnowned() }),
    ];
    const originalAges = horses.map((h) => h.age);
    const originalGenders = horses.map((h) => h.gender);

    ageHorses(horses, 1); // Northern universal birthday (Jan 1 = day 1)

    // Input array and objects must be unchanged
    expect(horses.map((h) => h.age)).toEqual(originalAges);
    expect(horses.map((h) => h.gender)).toEqual(originalGenders);
  });

  it("returns the same array reference when no aging occurs", () => {
    const horses: Horse[] = [generateHorse({ tier: "budget", ownership: makeUnowned() })];
    const result = ageHorses(horses, 10); // Not a universal birthday day
    expect(result).toBe(horses);
  });
});

describe("refreshMarket purity", () => {
  it("does not mutate the input market array", () => {
    const market = [
      generateHorse({ tier: "budget", ownership: makeUnowned() }),
      generateHorse({ tier: "budget", ownership: makeUnowned() }),
      generateHorse({ tier: "budget", ownership: makeUnowned() }),
    ];
    const originalIds = market.map((h) => h.id);

    refreshMarket(market, createRng(hashStr("test")));

    // Input array must be unchanged
    expect(market.map((h) => h.id)).toEqual(originalIds);
  });
});
