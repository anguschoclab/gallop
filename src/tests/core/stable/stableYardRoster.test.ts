import { describe, it, expect } from "vitest";
import { resolveStableYard, formatYard } from "@/core/stable/stableYard";
import { rosterSummary, type RosterEntry } from "@/core/stable/stableRoster";
import type { Stable } from "@/core/stable/types";
import { asStableId } from "@/core/types/branded";

function stable(overrides: Partial<Stable> = {}): Stable {
  return {
    id: asStableId("npc-1"),
    name: "Ballydoyle Bloodstock",
    owner: "M. Carrick",
    tier: "elite",
    reputation: 80,
    founded: 1,
    cash: 500000,
    horses: [],
    isMajor: true,
    colors: { primary: "#fff", secondary: "#000" },
    country: "Ireland",
    personality: "prestige",
    staff: {
      trainer: null,
      groom: null,
      nutritionist: null,
      farrier: null,
      veterinarian: null,
    },
    outposts: [],
    ...overrides,
  } as Stable;
}

describe("stable yards", () => {
  it("is deterministic for the same stable", () => {
    const a = resolveStableYard(stable());
    const b = resolveStableYard(stable());
    expect(a).toEqual(b);
    expect(a.name.length).toBeGreaterThan(3);
  });

  it("uses a town from the stable's country", () => {
    const yard = resolveStableYard(stable());
    expect(["The Curragh", "Fethard", "Naas", "Gowran", "Tipperary"]).toContain(yard.town);
    expect(formatYard(yard)).toContain(yard.town);
  });

  it("gives elite yards more boxes than budget yards", () => {
    const elite = resolveStableYard(stable({ tier: "elite" }));
    const budget = resolveStableYard(stable({ tier: "budget", id: asStableId("npc-2") }));
    expect(elite.boxes).toBeGreaterThan(budget.boxes);
  });

  it("prefers a stored yard when present", () => {
    const yard = { name: "Custom Barn", town: "Nowhere", region: "X", boxes: 5 };
    expect(resolveStableYard(stable({ yard }))).toEqual(yard);
  });
});

describe("rosterSummary", () => {
  const entry = (over: Partial<RosterEntry>): RosterEntry => ({
    id: "h",
    name: "Sunlit Way",
    age: 4,
    gender: "colt",
    rating: 70,
    value: 100000,
    starts: 5,
    wins: 2,
    retired: false,
    ...over,
  });

  it("describes an empty yard", () => {
    expect(rosterSummary([])).toMatch(/No horses/i);
  });

  it("counts in-work and retired horses and names the top horse", () => {
    const summary = rosterSummary([
      entry({ id: "a", name: "Sunlit Way" }),
      entry({ id: "b", retired: true }),
    ]);
    expect(summary).toContain("1 in work");
    expect(summary).toContain("1 retired");
    expect(summary).toContain("Top: Sunlit Way");
  });
});
