/**
 * backstories.test.ts - New game backstory configuration tests
 *
 * Tests for getBackstory lookup and BACKSTORIES alias invariants.
 */

import { describe, it, expect } from "vitest";
import { getBackstory, BACKSTORIES } from "@/shared/common/backstories";
import type { BackstoryDifficulty } from "@/shared/common/backstories";
import type { BackstoryId } from "@/domains/stable/simulation/types";

describe("getBackstory", () => {
  it.each<[BackstoryId, number, BackstoryDifficulty]>([
    ["inheritor", 250_000, "easy"],
    ["bloodstock_heir", 60_000, "standard"],
    ["claiming_trainer", 30_000, "standard"],
    ["bootstrapper", 8_000, "very_hard"],
  ])("returns the %s configuration", (id, startingCash, difficulty) => {
    const backstory = getBackstory(id);
    expect(backstory.id).toBe(id);
    expect(backstory.startingCash).toBe(startingCash);
    expect(backstory.difficulty).toBe(difficulty);
  });

  it("throws for an unknown backstory id", () => {
    expect(() => getBackstory("nonexistent" as BackstoryId)).toThrow(
      "Unknown backstory: nonexistent",
    );
  });
});

describe("BACKSTORIES", () => {
  it("keeps facilities/reputation aliases in sync with the canonical fields", () => {
    for (const backstory of BACKSTORIES) {
      expect(backstory.facilities).toBe(backstory.facilityUpgrades);
      expect(backstory.reputation).toBe(backstory.reputationScore);
    }
  });

  it("has unique ids", () => {
    const ids = BACKSTORIES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
