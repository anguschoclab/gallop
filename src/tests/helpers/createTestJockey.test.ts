import { describe, it, expect } from "vitest";
import { createTestJockey, createTestJockeys } from "@/tests/helpers";
import type { Jockey } from "@/core/jockey/types";

describe("createTestJockey", () => {
  it("returns a fully-typed Jockey with all required fields", () => {
    const jockey = createTestJockey();

    expect(jockey.id).toBeDefined();
    expect(typeof jockey.name).toBe("string");
    expect(typeof jockey.age).toBe("number");
    expect(jockey.archetype).toBeDefined();
    expect(jockey.stats).toBeDefined();
    expect(typeof jockey.potential).toBe("number");
    expect(Array.isArray(jockey.traits)).toBe(true);
    expect(jockey.silk).toBeDefined();
    expect(typeof jockey.careerStarts).toBe("number");
    expect(typeof jockey.careerWins).toBe("number");
    expect(typeof jockey.fame).toBe("number");
    expect(typeof jockey.ridingFee).toBe("number");
    expect(typeof jockey.affinityMap).toBe("object");
    expect(typeof jockey.stableAffinity).toBe("number");
    expect(typeof jockey.isApprentice).toBe("boolean");
    expect(typeof jockey.loyalty).toBe("number");
  });

  it("applies overrides correctly", () => {
    const jockey = createTestJockey({ name: "Custom Name", fame: 99 });

    expect(jockey.name).toBe("Custom Name");
    expect(jockey.fame).toBe(99);
  });

  it("preserves defaults for non-overridden fields", () => {
    const jockey = createTestJockey({ name: "Override Only" });

    expect(jockey.age).toBe(25);
    expect(jockey.archetype).toBe("versatile");
    expect(jockey.loyalty).toBe(50);
  });
});

describe("createTestJockeys", () => {
  it("creates an array of the specified length", () => {
    const jockeys = createTestJockeys(5);
    expect(jockeys).toHaveLength(5);
  });

  it("assigns sequential IDs", () => {
    const jockeys = createTestJockeys(3);
    expect(jockeys[0].id).toBe("test-jockey-1");
    expect(jockeys[1].id).toBe("test-jockey-2");
    expect(jockeys[2].id).toBe("test-jockey-3");
  });

  it("assigns sequential names", () => {
    const jockeys = createTestJockeys(2);
    expect(jockeys[0].name).toBe("Test Jockey 1");
    expect(jockeys[1].name).toBe("Test Jockey 2");
  });

  it("defaults to 10 jockeys", () => {
    const jockeys = createTestJockeys();
    expect(jockeys).toHaveLength(10);
  });
});
