import { describe, it, expect } from "vitest";
import { calculateOverallRating } from "@/core/horse/stats";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import type { Horse } from "@/game/types";

describe("calculateOverallRating — phenotype interaction", () => {
  it("returns 0 for unresolved horse (all stats 0)", () => {
    const horse: Horse = {
      id: "h1",
      name: "Unresolved",
      stats: { speed: 0, stamina: 0, acceleration: 0, temperament: 0, conformation: 0, consistency: 0 },
      potential: 0,
      phenotypeResolved: false,
    } as unknown as Horse;

    expect(calculateOverallRating(horse)).toBe(0);
  });

  it("returns non-zero for resolved horse", () => {
    const raw = generateHorse({ tier: "starter" });
    const resolved = ensurePhenotypeResolved(raw);
    expect(calculateOverallRating(resolved)).toBeGreaterThan(0);
  });
});
