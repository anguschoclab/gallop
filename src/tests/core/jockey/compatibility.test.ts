import { describe, it, expect } from "vitest";
import { getCompatibility } from "@/core/jockey/compatibility";
import { createTestHorse, createTestJockey } from "@/tests/helpers";
import type { Jockey, JockeyTrait } from "@/core/jockey/types";
import type { Horse } from "@/game/types";

function mkJockey(overrides: Partial<Jockey> = {}): Jockey {
  return createTestJockey({ id: "j1", archetype: "versatile", traits: [], ...overrides });
}

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({ id: "h1", runningStyle: "P", ...overrides });
}

describe("getCompatibility — archetype-only (no regression)", () => {
  it("versatile archetype always returns High", () => {
    const h = mkHorse({ runningStyle: "E" });
    const j = mkJockey({ archetype: "versatile" });
    expect(getCompatibility(h, j)).toBe("High");
  });

  it("clinical archetype always returns High", () => {
    const h = mkHorse({ runningStyle: "S" });
    const j = mkJockey({ archetype: "clinical" });
    expect(getCompatibility(h, j)).toBe("High");
  });

  it("front_runner + E returns High", () => {
    const h = mkHorse({ runningStyle: "E" });
    const j = mkJockey({ archetype: "front_runner" });
    expect(getCompatibility(h, j)).toBe("High");
  });

  it("closer + S returns High", () => {
    const h = mkHorse({ runningStyle: "S" });
    const j = mkJockey({ archetype: "closer" });
    expect(getCompatibility(h, j)).toBe("High");
  });

  it("closer + E returns Poor", () => {
    const h = mkHorse({ runningStyle: "E" });
    const j = mkJockey({ archetype: "closer" });
    expect(getCompatibility(h, j)).toBe("Poor");
  });

  it("front_runner + S returns Poor", () => {
    const h = mkHorse({ runningStyle: "S" });
    const j = mkJockey({ archetype: "front_runner" });
    expect(getCompatibility(h, j)).toBe("Poor");
  });

  it("finisher + P returns Good", () => {
    const h = mkHorse({ runningStyle: "P" });
    const j = mkJockey({ archetype: "finisher" });
    expect(getCompatibility(h, j)).toBe("Good");
  });
});

describe("getCompatibility — trait-aware", () => {
  it("gate_master + E horse returns High even if archetype is closer", () => {
    const h = mkHorse({ runningStyle: "E" });
    const j = mkJockey({
      archetype: "closer",
      traits: ["gate_master"] as JockeyTrait[],
    });
    // Archetype says Poor (closer + E), but trait upgrades to High
    expect(getCompatibility(h, j)).toBe("High");
  });

  it("closer_instinct + S horse returns High even if archetype is front_runner", () => {
    const h = mkHorse({ runningStyle: "S" });
    const j = mkJockey({
      archetype: "front_runner",
      traits: ["closer_instinct"] as JockeyTrait[],
    });
    // Archetype says Poor (front_runner + S), but trait upgrades to High
    expect(getCompatibility(h, j)).toBe("High");
  });

  it("pace_presser + EP horse returns at least Good", () => {
    const h = mkHorse({ runningStyle: "EP" });
    const j = mkJockey({
      archetype: "finisher",
      traits: ["pace_presser"] as JockeyTrait[],
    });
    // Archetype: finisher + EP = Neutral, trait upgrades to Good
    expect(["Good", "High"]).toContain(getCompatibility(h, j));
  });

  it("closer_instinct + E horse downgrades to Poor", () => {
    const h = mkHorse({ runningStyle: "E" });
    const j = mkJockey({
      archetype: "versatile",
      traits: ["closer_instinct"] as JockeyTrait[],
    });
    // Archetype: versatile + E = High, but trait mismatch downgrades
    expect(getCompatibility(h, j)).toBe("Poor");
  });

  it("pace_presser + S horse downgrades to Poor", () => {
    const h = mkHorse({ runningStyle: "S" });
    const j = mkJockey({
      archetype: "versatile",
      traits: ["pace_presser"] as JockeyTrait[],
    });
    // Archetype: versatile + S = High, but trait mismatch downgrades
    expect(getCompatibility(h, j)).toBe("Poor");
  });

  it("non-matching traits do not change archetype result", () => {
    const h = mkHorse({ runningStyle: "P" });
    const j = mkJockey({
      archetype: "closer",
      traits: ["sprint_specialist"] as JockeyTrait[],
    });
    // closer + P = Good, sprint_specialist doesn't match style → stays Good
    expect(getCompatibility(h, j)).toBe("Good");
  });
});
