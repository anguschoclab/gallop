/**
 * uuidRegistry.test.ts
 *
 * Tests for UUID registry system including collision detection,
 * registration, and validation functionality.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registry, UUIDRegistry } from "@/core/uuidRegistry";

describe("UUIDRegistry", () => {
  beforeEach(() => {
    registry.clear();
  });

  describe("register", () => {
    it("should register a new UUID", () => {
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      expect(registry.isRegistered("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("should throw error when registering duplicate UUID", () => {
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      expect(() => {
        registry.register("550e8400-e29b-41d4-a716-446655440000", "race");
      }).toThrow("UUID collision detected");
    });

    it("should allow registering same UUID with same entity type", () => {
      // This should still throw - UUIDs must be unique regardless of type
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      expect(() => {
        registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      }).toThrow("UUID collision detected");
    });
  });

  describe("isRegistered", () => {
    it("should return false for unregistered UUID", () => {
      expect(registry.isRegistered("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
    });

    it("should return true for registered UUID", () => {
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      expect(registry.isRegistered("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });
  });

  describe("getEntityType", () => {
    it("should return undefined for unregistered UUID", () => {
      expect(registry.getEntityType("550e8400-e29b-41d4-a716-446655440000")).toBeUndefined();
    });

    it("should return entity type for registered UUID", () => {
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      expect(registry.getEntityType("550e8400-e29b-41d4-a716-446655440000")).toBe("horse");
    });
  });

  describe("getUUIDsByType", () => {
    it("should return empty set for unregistered entity type", () => {
      const uuids = registry.getUUIDsByType("horse");
      expect(uuids.size).toBe(0);
    });

    it("should return UUIDs for registered entity type", () => {
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      registry.register("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "horse");
      registry.register("6ba7b810-9dad-11d1-80b4-00c04fd430c9", "race");

      const horseUUIDs = registry.getUUIDsByType("horse");
      expect(horseUUIDs.size).toBe(2);
      expect(horseUUIDs.has("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(horseUUIDs.has("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
    });
  });

  describe("getCount", () => {
    it("should return 0 for empty registry", () => {
      expect(registry.getCount()).toBe(0);
    });

    it("should return correct count after registrations", () => {
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      registry.register("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "race");
      expect(registry.getCount()).toBe(2);
    });
  });

  describe("getCountByType", () => {
    it("should return 0 for unregistered entity type", () => {
      expect(registry.getCountByType("horse")).toBe(0);
    });

    it("should return correct count for entity type", () => {
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      registry.register("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "horse");
      registry.register("6ba7b810-9dad-11d1-80b4-00c04fd430c9", "race");
      expect(registry.getCountByType("horse")).toBe(2);
      expect(registry.getCountByType("race")).toBe(1);
    });
  });

  describe("clear", () => {
    it("should clear all registered UUIDs", () => {
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      registry.register("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "race");

      registry.clear();

      expect(registry.getCount()).toBe(0);
      expect(registry.isRegistered("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
    });
  });

  describe("export", () => {
    it("should export registry state", () => {
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      registry.register("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "race");

      const exported = registry.export();

      expect(exported["550e8400-e29b-41d4-a716-446655440000"]).toBe("horse");
      expect(exported["6ba7b810-9dad-11d1-80b4-00c04fd430c8"]).toBe("race");
    });

    it("should return empty object for empty registry", () => {
      const exported = registry.export();
      expect(Object.keys(exported).length).toBe(0);
    });
  });

  describe("import", () => {
    it("should import registry state", () => {
      const data = {
        "550e8400-e29b-41d4-a716-446655440000": "horse",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8": "race",
      };

      registry.import(data);

      expect(registry.getCount()).toBe(2);
      expect(registry.getEntityType("550e8400-e29b-41d4-a716-446655440000")).toBe("horse");
      expect(registry.getEntityType("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe("race");
    });

    it("should throw error when importing duplicate UUID", () => {
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");

      const data = {
        "550e8400-e29b-41d4-a716-446655440000": "race",
      };

      expect(() => {
        registry.import(data);
      }).toThrow("UUID collision detected");
    });
  });

  describe("getStats", () => {
    it("should return statistics for empty registry", () => {
      const stats = registry.getStats();
      expect(stats.total).toBe(0);
      expect(Object.keys(stats.byType).length).toBe(0);
    });

    it("should return statistics with multiple entity types", () => {
      registry.register("550e8400-e29b-41d4-a716-446655440000", "horse");
      registry.register("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "horse");
      registry.register("6ba7b810-9dad-11d1-80b4-00c04fd430c9", "race");
      registry.register("6ba7b810-9dad-11d1-80b4-00c04fd430ca", "jockey");

      const stats = registry.getStats();

      expect(stats.total).toBe(4);
      expect(stats.byType.horse).toBe(2);
      expect(stats.byType.race).toBe(1);
      expect(stats.byType.jockey).toBe(1);
    });
  });
});

describe("UUIDRegistry class (direct instantiation)", () => {
  it("should allow creating separate registry instances", () => {
    const registry1 = new UUIDRegistry();
    const registry2 = new UUIDRegistry();

    registry1.register("550e8400-e29b-41d4-a716-446655440000", "horse");

    expect(registry1.isRegistered("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(registry2.isRegistered("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
  });
});
