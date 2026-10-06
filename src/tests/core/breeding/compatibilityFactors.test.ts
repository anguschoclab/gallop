import { describe, it, expect } from "vitest";
import { calculateCrossFamilyAffinity } from "@/core/breeding/compatibilityFactors";
import type { Horse } from "@/core/horse/types";

function makeHorse(overrides: Partial<Horse>): Horse {
  return {
    ...overrides,
  } as unknown as Horse;
}

describe("calculateCrossFamilyAffinity", () => {
  it("returns 0.4 and 'No documented cross-family affinity' when bloodline is missing", () => {
    const sire = makeHorse({ bloodline: undefined });
    const dam = makeHorse({ bruceLoweFamily: 1 });
    const result = calculateCrossFamilyAffinity(sire, dam);
    expect(result.score).toBe(0.4);
    expect(result.description).toBe("No documented cross-family affinity");
  });

  it("returns 0.4 and 'No documented cross-family affinity' when dam family is missing", () => {
    const sire = makeHorse({ bloodline: "Northern Dancer" });
    const dam = makeHorse({ bruceLoweFamily: undefined });
    const result = calculateCrossFamilyAffinity(sire, dam);
    expect(result.score).toBe(0.4);
    expect(result.description).toBe("No documented cross-family affinity");
  });

  it("returns 0.4 and 'No documented cross-family affinity' when bloodline has no affinities", () => {
    const sire = makeHorse({ bloodline: "Unknown Bloodline" });
    const dam = makeHorse({ bruceLoweFamily: 1 });
    const result = calculateCrossFamilyAffinity(sire, dam);
    expect(result.score).toBe(0.4);
    expect(result.description).toBe("No documented cross-family affinity");
  });

  it("returns strong cross when bonus is >= 0.7", () => {
    // "Northern Dancer" and Family 1 yields 0.8
    const sire = makeHorse({ bloodline: "Northern Dancer" });
    const dam = makeHorse({ bruceLoweFamily: 1 });
    const result = calculateCrossFamilyAffinity(sire, dam);
    expect(result.score).toBe(0.8);
    expect(result.description).toBe("Strong cross: Northern Dancer × Family 1");
  });

  it("returns notable cross when bonus is >= 0.55 but < 0.7", () => {
    // "Northern Dancer" and Family 9 yields 0.6
    const sire = makeHorse({ bloodline: "Northern Dancer" });
    const dam = makeHorse({ bruceLoweFamily: 9 });
    const result = calculateCrossFamilyAffinity(sire, dam);
    expect(result.score).toBe(0.6);
    expect(result.description).toBe("Notable cross: Northern Dancer × Family 9");
  });

  it("returns standard cross when bonus is < 0.55", () => {
    // "Northern Dancer" and Family 99 yields fallback 0.4
    const sire = makeHorse({ bloodline: "Northern Dancer" });
    const dam = makeHorse({ bruceLoweFamily: 99 });
    const result = calculateCrossFamilyAffinity(sire, dam);
    expect(result.score).toBe(0.4);
    expect(result.description).toBe("Standard cross: Northern Dancer × Family 99");
  });
});
