import { describe, it, expect } from "vitest";
import { buildRunner } from "@/core/race/engine/runnerBuilder";
import type { Runner } from "@/core/race/engine/runnerTypes";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

describe("Runner type: isPlayer property", () => {
  it("buildRunner returns Runner with isPlayer=true when owned=true", () => {
    const horse = ensurePhenotypeResolved(generateHorse({ ownership: makePlayerOwned() }));
    const runner = buildRunner(horse, true, 1600, "Turf");
    expect(runner.isPlayer).toBe(true);
  });

  it("buildRunner returns Runner with isPlayer=false when owned=false", () => {
    const horse = ensurePhenotypeResolved(generateHorse({ ownership: makeUnowned() }));
    const runner = buildRunner(horse, false, 1600, "Turf");
    expect(runner.isPlayer).toBe(false);
  });

  it("Runner type has isPlayer property, NOT owned", () => {
    const horse = ensurePhenotypeResolved(generateHorse({ ownership: makePlayerOwned() }));
    const runner: Runner = buildRunner(horse, true, 1600, "Turf");
    expect(runner).toHaveProperty("isPlayer");
    expect(runner).not.toHaveProperty("owned");
  });
});
