import { describe, it, expect } from "vitest";
import {
  canUpgradeFacility,
  canAccessSale,
  canReceiveAtLargeInvite,
} from "@/core/reputation/reputationGating";

describe("reputationGating", () => {
  describe("canUpgradeFacility", () => {
    it("blocks basic->standard when unknown", () => {
      const r = canUpgradeFacility("basic", "unknown");
      expect(r.allowed).toBe(false);
      expect(r.requiredTier).toBe("local");
    });
    it("allows basic->standard when local", () => {
      expect(canUpgradeFacility("basic", "local").allowed).toBe(true);
    });
    it("blocks standard->premium when local", () => {
      const r = canUpgradeFacility("standard", "local");
      expect(r.allowed).toBe(false);
      expect(r.requiredTier).toBe("regional");
    });
    it("allows standard->premium when regional", () => {
      expect(canUpgradeFacility("standard", "regional").allowed).toBe(true);
    });
    it("blocks premium->elite when regional", () => {
      const r = canUpgradeFacility("premium", "regional");
      expect(r.allowed).toBe(false);
      expect(r.requiredTier).toBe("national");
    });
    it("allows premium->elite when national", () => {
      expect(canUpgradeFacility("premium", "national").allowed).toBe(true);
    });
    it("allows elite regardless of tier (max level)", () => {
      expect(canUpgradeFacility("elite", "unknown").allowed).toBe(true);
    });
    it("allows upgrades for higher tiers than required", () => {
      expect(canUpgradeFacility("basic", "legendary").allowed).toBe(true);
      expect(canUpgradeFacility("standard", "legendary").allowed).toBe(true);
      expect(canUpgradeFacility("premium", "legendary").allowed).toBe(true);
    });
  });

  describe("canAccessSale", () => {
    it("blocks 2yo_training when local", () => {
      const r = canAccessSale("2yo_training", "local");
      expect(r.allowed).toBe(false);
      expect(r.requiredTier).toBe("regional");
    });
    it("allows 2yo_training when regional", () => {
      expect(canAccessSale("2yo_training", "regional").allowed).toBe(true);
    });
    it("blocks broodmare when unknown", () => {
      const r = canAccessSale("broodmare", "unknown");
      expect(r.allowed).toBe(false);
      expect(r.requiredTier).toBe("local");
    });
    it("allows broodmare when local", () => {
      expect(canAccessSale("broodmare", "local").allowed).toBe(true);
    });
    const openKinds = [
      "weanling",
      "yearling",
      "weanling_south",
      "yearling_south",
      "mixed",
      "racing_age",
      "liquidation",
    ] as const;
    for (const kind of openKinds) {
      it(`allows ${kind} when unknown (open access)`, () => {
        expect(canAccessSale(kind, "unknown").allowed).toBe(true);
      });
    }
    it("allows 2yo_training when legendary", () => {
      expect(canAccessSale("2yo_training", "legendary").allowed).toBe(true);
    });
  });

  describe("canReceiveAtLargeInvite", () => {
    it("blocks G1 when local", () => {
      const r = canReceiveAtLargeInvite("G1", "local");
      expect(r.allowed).toBe(false);
      expect(r.requiredTier).toBe("regional");
    });
    it("allows G1 when regional", () => {
      expect(canReceiveAtLargeInvite("G1", "regional").allowed).toBe(true);
    });
    it("blocks G2 when local", () => {
      const r = canReceiveAtLargeInvite("G2", "local");
      expect(r.allowed).toBe(false);
      expect(r.requiredTier).toBe("regional");
    });
    it("allows G2 when regional", () => {
      expect(canReceiveAtLargeInvite("G2", "regional").allowed).toBe(true);
    });
    it("blocks G3 when unknown", () => {
      const r = canReceiveAtLargeInvite("G3", "unknown");
      expect(r.allowed).toBe(false);
      expect(r.requiredTier).toBe("local");
    });
    it("allows G3 when local", () => {
      expect(canReceiveAtLargeInvite("G3", "local").allowed).toBe(true);
    });
    it("allows G1 when legendary", () => {
      expect(canReceiveAtLargeInvite("G1", "legendary").allowed).toBe(true);
    });
    it("allows unknown grades (no gate)", () => {
      expect(canReceiveAtLargeInvite("Maiden", "unknown").allowed).toBe(true);
    });
  });
});
