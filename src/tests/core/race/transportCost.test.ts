import { describe, it, expect } from "vitest";
import { getTransportCostForRace } from "@/core/race/transportCost";
import type { Race } from "@/game/types";

describe("getTransportCostForRace", () => {
  it("returns 150 for non-graded races", () => {
    const race = { graded: undefined } as Race;
    expect(getTransportCostForRace(race)).toBe(150);
  });

  it("returns 500 for G1 races", () => {
    const race = { graded: { grade: "G1" } } as Race;
    expect(getTransportCostForRace(race)).toBe(500);
  });

  it("returns 400 for G2 races", () => {
    const race = { graded: { grade: "G2" } } as Race;
    expect(getTransportCostForRace(race)).toBe(400);
  });

  it("returns 300 for G3 races", () => {
    const race = { graded: { grade: "G3" } } as Race;
    expect(getTransportCostForRace(race)).toBe(300);
  });

  it("returns 200 for other graded races", () => {
    const race = { graded: { grade: "Listed" } } as unknown as Race;
    expect(getTransportCostForRace(race)).toBe(200);
  });
});
