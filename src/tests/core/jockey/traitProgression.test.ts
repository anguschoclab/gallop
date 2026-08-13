import { describe, it, expect } from "vitest";
import {
  awardTraitXp,
  checkTraitUnlock,
  checkTraitAtrophy,
  trainTrait,
  TRAIT_XP_UNLOCK_THRESHOLD,
  TRAIT_XP_MAINTENANCE_THRESHOLD,
} from "@/core/jockey/traitProgression";
import { createTestJockey } from "@/tests/helpers/createTestJockey";
import type { Jockey } from "@/core/jockey/types";

describe("awardTraitXp", () => {
  it("adds XP to correct trait key", () => {
    const jockey = createTestJockey();
    const updated = awardTraitXp(jockey, "gate_master", 20);
    expect(updated.traitProgression?.xp["gate_master"]).toBe(20);
  });

  it("accumulates XP across multiple calls", () => {
    let jockey = createTestJockey();
    jockey = awardTraitXp(jockey, "hill_specialist", 30);
    jockey = awardTraitXp(jockey, "hill_specialist", 25);
    expect(jockey.traitProgression?.xp["hill_specialist"]).toBe(55);
  });

  it("initializes traitProgression if undefined", () => {
    const jockey = createTestJockey();
    expect(jockey.traitProgression).toBeUndefined();
    const updated = awardTraitXp(jockey, "gate_master", 10);
    expect(updated.traitProgression).toBeDefined();
    expect(updated.traitProgression?.xp).toBeDefined();
    expect(updated.traitProgression?.unlockedAt).toBeDefined();
  });

  it("handles multiple trait keys independently", () => {
    let jockey = createTestJockey();
    jockey = awardTraitXp(jockey, "gate_master", 15);
    jockey = awardTraitXp(jockey, "hill_specialist", 25);
    expect(jockey.traitProgression?.xp["gate_master"]).toBe(15);
    expect(jockey.traitProgression?.xp["hill_specialist"]).toBe(25);
  });

  it("does not crash with empty jockey", () => {
    const jockey = createTestJockey();
    const updated = awardTraitXp(jockey, "gate_master", 10);
    expect(updated.traitProgression?.xp["gate_master"]).toBe(10);
  });
});

describe("checkTraitUnlock", () => {
  it("unlocks trait when XP crosses threshold", () => {
    let jockey = createTestJockey();
    jockey = awardTraitXp(jockey, "gate_master", TRAIT_XP_UNLOCK_THRESHOLD);
    jockey = checkTraitUnlock(jockey, 1);
    expect(jockey.traits).toContain("gate_master");
  });

  it("does NOT unlock trait when XP below threshold", () => {
    let jockey = createTestJockey();
    jockey = awardTraitXp(jockey, "gate_master", TRAIT_XP_UNLOCK_THRESHOLD - 1);
    jockey = checkTraitUnlock(jockey, 1);
    expect(jockey.traits).not.toContain("gate_master");
  });

  it("adds unlocked trait to jockey.traits array", () => {
    let jockey = createTestJockey({ traits: [] });
    jockey = awardTraitXp(jockey, "bullring_expert", TRAIT_XP_UNLOCK_THRESHOLD);
    jockey = checkTraitUnlock(jockey, 5);
    expect(jockey.traits).toContain("bullring_expert");
  });

  it("does not add duplicate traits", () => {
    let jockey = createTestJockey({ traits: ["gate_master"] });
    jockey = awardTraitXp(jockey, "gate_master", TRAIT_XP_UNLOCK_THRESHOLD + 50);
    jockey = checkTraitUnlock(jockey, 5);
    const gateCount = jockey.traits.filter((t) => t === "gate_master").length;
    expect(gateCount).toBe(1);
  });

  it("records unlock day in unlockedAt", () => {
    let jockey = createTestJockey();
    jockey = awardTraitXp(jockey, "gate_master", TRAIT_XP_UNLOCK_THRESHOLD);
    jockey = checkTraitUnlock(jockey, 42);
    expect(jockey.traitProgression?.unlockedAt["gate_master"]).toBe(42);
  });

  it("does not crash with no traitProgression", () => {
    const jockey = createTestJockey();
    const updated = checkTraitUnlock(jockey, 1);
    expect(updated).toBeDefined();
  });
});

describe("checkTraitAtrophy", () => {
  it("removes trait when XP falls below maintenance threshold", () => {
    let jockey = createTestJockey({ traits: ["gate_master"] });
    jockey = awardTraitXp(jockey, "gate_master", TRAIT_XP_MAINTENANCE_THRESHOLD - 1);
    jockey = checkTraitAtrophy(jockey);
    expect(jockey.traits).not.toContain("gate_master");
  });

  it("does NOT remove trait when XP above maintenance threshold", () => {
    let jockey = createTestJockey({ traits: ["gate_master"] });
    jockey = awardTraitXp(jockey, "gate_master", TRAIT_XP_MAINTENANCE_THRESHOLD + 10);
    jockey = checkTraitAtrophy(jockey);
    expect(jockey.traits).toContain("gate_master");
  });

  it("removes atrophied trait from jockey.traits array", () => {
    let jockey = createTestJockey({ traits: ["hill_specialist", "gate_master"] });
    jockey = awardTraitXp(jockey, "hill_specialist", 0);
    jockey = awardTraitXp(jockey, "gate_master", TRAIT_XP_MAINTENANCE_THRESHOLD + 20);
    jockey = checkTraitAtrophy(jockey);
    expect(jockey.traits).not.toContain("hill_specialist");
    expect(jockey.traits).toContain("gate_master");
  });
});

describe("trainTrait", () => {
  it("adds XP to specified trait", () => {
    let jockey = createTestJockey();
    jockey = trainTrait(jockey, "gate_master", 15);
    expect(jockey.traitProgression?.xp["gate_master"]).toBe(15);
  });

  it("accumulates XP across multiple training sessions", () => {
    let jockey = createTestJockey();
    jockey = trainTrait(jockey, "gate_master", 10);
    jockey = trainTrait(jockey, "gate_master", 20);
    expect(jockey.traitProgression?.xp["gate_master"]).toBe(30);
  });

  it("training XP is capped at max cap", () => {
    let jockey = createTestJockey();
    jockey = trainTrait(jockey, "gate_master", 999);
    // Should be capped at some reasonable max
    expect(jockey.traitProgression?.xp["gate_master"]).toBeLessThanOrEqual(500);
  });
});
