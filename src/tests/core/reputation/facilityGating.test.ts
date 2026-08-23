import { describe, it, expect } from "vitest";
import { canUpgradeFacility } from "@/core/reputation/reputationGating";
import { getReputationTier } from "@/core/reputation/reputationTypes";
import type { FacilityLevel } from "@/core/facilities";

describe("facility gating integration", () => {
  // Simulates the check that facilitySlice will perform
  function checkUpgrade(
    level: FacilityLevel,
    reputationScore: number,
    cash: number,
    upgradeCost: number,
  ): { ok: boolean; reason?: string } {
    const tier = getReputationTier(reputationScore);
    const gate = canUpgradeFacility(level, tier);
    if (!gate.allowed) {
      return { ok: false, reason: `Reputation too low. Requires ${gate.requiredTier} reputation.` };
    }
    if (cash < upgradeCost) {
      return { ok: false, reason: "Insufficient cash." };
    }
    return { ok: true };
  }

  it("blocks upgrade when reputation insufficient", () => {
    const result = checkUpgrade("basic", 0, 100000, 5000);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Reputation too low");
    expect(result.reason).toContain("local");
  });

  it("blocks upgrade when cash insufficient but reputation ok", () => {
    const result = checkUpgrade("basic", 150, 100, 5000);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Insufficient cash");
  });

  it("allows upgrade when both reputation and cash sufficient", () => {
    const result = checkUpgrade("basic", 150, 100000, 5000);
    expect(result.ok).toBe(true);
  });

  it("blocks standard->premium when reputation is local", () => {
    const result = checkUpgrade("standard", 150, 100000, 15000);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("regional");
  });

  it("allows standard->premium when reputation is regional", () => {
    const result = checkUpgrade("standard", 300, 100000, 15000);
    expect(result.ok).toBe(true);
  });

  it("blocks premium->elite when reputation is regional", () => {
    const result = checkUpgrade("premium", 300, 100000, 50000);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("national");
  });

  it("allows premium->elite when reputation is national", () => {
    const result = checkUpgrade("premium", 450, 100000, 50000);
    expect(result.ok).toBe(true);
  });

  it("skips reputation check for elite (max level)", () => {
    const result = checkUpgrade("elite", 0, 0, 0);
    expect(result.ok).toBe(true);
  });

  it("reputation check happens before cash check", () => {
    const result = checkUpgrade("basic", 0, 0, 5000);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Reputation");
  });
});
