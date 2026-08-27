import { describe, it, expect } from "vitest";
import { rankedRacecourses, getRacecoursePrestigeByName, getHouseForSaleKind, racecoursePrestigeMultiplier } from "@/core/prestige";

describe("venue prestige", () => {
  it("ranks major courses above minor ones", () => {
    const top = rankedRacecourses().slice(0, 5).map((t) => t.name);
    console.log(top, rankedRacecourses().slice(-3));
    expect(getRacecoursePrestigeByName(top[0])).toBeGreaterThan(70);
  });
  it("multiplier is bounded", () => {
    const m = racecoursePrestigeMultiplier(undefined, "Nowhere Park");
    expect(m).toBeGreaterThan(0.7);
    expect(m).toBeLessThan(1.3);
  });
  it("assigns a house to each sale kind", () => {
    expect(getHouseForSaleKind("yearling")?.id).toBe("house-crownhill");
  });
});
