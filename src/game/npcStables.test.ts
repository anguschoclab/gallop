import { describe, it, expect } from "vitest";
import { getMajorStables, getStablesByTier, getStableById } from "./npcStables";
import type { Stable } from "./types";

function mkStable(overrides: Partial<Stable> = {}): Stable {
  return {
    id: "s1",
    name: "Test Stable",
    owner: "Owner",
    tier: "mid",
    reputation: 50,
    founded: 0,
    cash: 10000,
    horses: [],
    isMajor: true,
    colors: { primary: "black", secondary: "white" },
    personality: "balanced",
    ...overrides,
  };
}

describe("npcStables queries", () => {
  const stables = [
    mkStable({ id: "s1", tier: "elite" }),
    mkStable({ id: "s2", tier: "major" }),
    mkStable({ id: "s3", tier: "mid" }),
    mkStable({ id: "s4", tier: "low" }),
    mkStable({ id: "s5", tier: "budget" }),
  ];

  describe("getMajorStables", () => {
    it("returns only stables marked with elite or major tier", () => {
      const result = getMajorStables(stables);
      expect(result).toHaveLength(2);
      expect(result.map(s => s.id)).toEqual(["s1", "s2"]);
    });

    it("returns empty array if no elite or major stables exist", () => {
      const allMinor = [
        mkStable({ tier: "mid" }),
        mkStable({ tier: "budget" })
      ];
      expect(getMajorStables(allMinor)).toEqual([]);
    });
  });

  describe("getStablesByTier", () => {
    it("returns stables of the specified tier", () => {
      const result = getStablesByTier(stables, "mid");
      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual("s3");
    });

    it("returns empty array if tier not found", () => {
      const noMidStables = [
        mkStable({ tier: "elite" }),
        mkStable({ tier: "major" })
      ];
      expect(getStablesByTier(noMidStables, "mid")).toEqual([]);
    });
  });

  describe("getStableById", () => {
    it("finds a stable by its id", () => {
      const result = getStableById(stables, "s3");
      expect(result).toBeDefined();
      expect(result?.id).toBe("s3");
    });

    it("returns undefined if stable not found", () => {
      const result = getStableById(stables, "s99");
      expect(result).toBeUndefined();
    });
  });
});
