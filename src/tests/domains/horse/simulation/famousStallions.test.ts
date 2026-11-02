import { describe, it, expect } from "vitest";
import { generateFamousStallions } from "@/domains/horse/simulation/famousStallions";
import { createRng } from "@/shared/common/rng";
import type { Stable } from "@/platform/game/types";

describe("generateFamousStallions", () => {
  it("generates active famous stallions from real-world data", () => {
    const rng = createRng("test-seed");
    const mockStables: Stable[] = [
      { id: "s1", name: "Stable 1", tier: "elite", cash: 1000000, type: "npc" } as unknown as Stable,
    ];

    const stallions = generateFamousStallions(mockStables, rng);

    expect(stallions).toBeDefined();
    expect(stallions.length).toBeGreaterThan(0);

    // Check specific properties
    const stallion = stallions[0];
    expect(stallion.gender).toBe("horse");
    expect(stallion.stud?.atStud).toBe(true);
    expect(stallion.ownership.type).toBe("npc");
  });

  it("assigns appropriate stud fees based on pedigree data", () => {
    const rng = createRng("test-seed");
    const mockStables: Stable[] = [
      { id: "s1", name: "Stable 1", tier: "elite", cash: 1000000, type: "npc" } as unknown as Stable,
    ];

    const stallions = generateFamousStallions(mockStables, rng);

    // Find a stallion that we know has a high stud fee from data (or check that all have fees)
    stallions.forEach(s => {
      expect(s.stud?.standingFee).toBeDefined();
      expect(s.stud?.standingFee).toBeGreaterThanOrEqual(0);
    });
  });
});
