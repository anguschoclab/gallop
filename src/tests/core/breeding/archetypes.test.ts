import { describe, it, expect } from "vitest";
import {
  getArchetypeById,
  getArchetypesBySurface,
  getArchetypeForTripleCrownKey,
  getTripleCrownKeysForArchetype,
  ALL_ARCHETYPES,
  TRIPLE_CROWN_ARCHETYPES,
  ORIGINAL_ARCHETYPES,
} from "@/core/breeding/archetypes";

describe("archetypes", () => {
  it("exports ALL_ARCHETYPES combining original and triple crown archetypes", () => {
    expect(ALL_ARCHETYPES.length).toBe(ORIGINAL_ARCHETYPES.length + TRIPLE_CROWN_ARCHETYPES.length);
  });

  describe("getArchetypeById", () => {
    it("returns the archetype matching the given ID", () => {
      const archetype = getArchetypeById("elite-turf-stayer");
      expect(archetype).toBeDefined();
      expect(archetype?.id).toBe("elite-turf-stayer");
      expect(archetype?.name).toBe("Elite Turf Stayer");
    });

    it("returns undefined for an unknown ID", () => {
      expect(getArchetypeById("unknown-id")).toBeUndefined();
    });
  });

  describe("getArchetypesBySurface", () => {
    it("returns archetypes matching the given surface", () => {
      const turfArchetypes = getArchetypesBySurface("Turf");
      expect(turfArchetypes.length).toBeGreaterThan(0);
      turfArchetypes.forEach((a) => {
        expect(a.targetPhenotype.surface).toBe("Turf");
      });
    });

    it("returns empty array for an unknown surface (if types were bypassed)", () => {
      const invalidArchetypes = getArchetypesBySurface("Water" as any);
      expect(invalidArchetypes).toEqual([]);
    });
  });

  describe("getArchetypeForTripleCrownKey", () => {
    it("returns the archetype ID for a given triple crown key", () => {
      expect(getArchetypeForTripleCrownKey("usa-tc")).toBe("triple-crown-usa");
      expect(getArchetypeForTripleCrownKey("japan-tiara")).toBe("triple-tiara-turf");
    });

    it("returns undefined for an unknown triple crown key", () => {
      expect(getArchetypeForTripleCrownKey("unknown-tc")).toBeUndefined();
    });
  });

  describe("getTripleCrownKeysForArchetype", () => {
    it("returns the triple crown keys for a given archetype ID", () => {
      const keys = getTripleCrownKeysForArchetype("triple-crown-european-turf");
      expect(keys).toContain("ireland-tc");
      expect(keys).toContain("france-tc");
      expect(keys).toContain("germany-tc");
      expect(keys).toContain("italy-tc");
    });

    it("returns an empty array for an archetype with no mapped keys", () => {
      expect(getTripleCrownKeysForArchetype("elite-turf-stayer")).toEqual([]);
    });
  });
});
