import { describe, it, expect } from "vitest";
import {
  getStableReputationTier,
  getStableReputationTierMeta,
  stableStandingAskReaction,
  stableStandingBidReaction,
  STABLE_REPUTATION_TIERS,
} from "@/core/stable/stableReputationTier";

describe("getStableReputationTier", () => {
  it("bands reputation into named tiers", () => {
    expect(getStableReputationTier(95)).toBe("elite");
    expect(getStableReputationTier(72)).toBe("classic");
    expect(getStableReputationTier(55)).toBe("established");
    expect(getStableReputationTier(35)).toBe("provincial");
    expect(getStableReputationTier(5)).toBe("backyard");
  });

  it("falls back to a mid tier for non-finite input", () => {
    expect(getStableReputationTier(Number.NaN)).toBe("established");
  });

  it("sensitivity increases with tier prestige", () => {
    const order = ["backyard", "provincial", "established", "classic", "elite"];
    const sens = order.map(
      (t) => STABLE_REPUTATION_TIERS.find((m) => m.tier === t)!.standingSensitivity,
    );
    for (let i = 1; i < sens.length; i++) expect(sens[i]).toBeGreaterThan(sens[i - 1]);
  });
});

describe("stableStandingBidReaction", () => {
  it("elite yards lowball unknown managers harder than backyard yards", () => {
    const elite = stableStandingBidReaction(95, 0);
    const backyard = stableStandingBidReaction(5, 0);
    expect(elite.factor).toBeLessThan(backyard.factor);
    expect(elite.factor).toBeLessThan(1);
    expect(elite.stableTier).toBe("elite");
    expect(elite.playerTier).toBe("unknown");
    expect(elite.note).toContain("Elite");
  });

  it("elite yards pay a bigger premium to a legendary manager", () => {
    const elite = stableStandingBidReaction(95, 1000);
    const backyard = stableStandingBidReaction(5, 1000);
    expect(elite.factor).toBeGreaterThan(backyard.factor);
    expect(backyard.factor).toBeGreaterThan(1);
  });

  it("is neutral at the reference standing tier for every stable", () => {
    const nationalScore = 400;
    for (const meta of STABLE_REPUTATION_TIERS) {
      const r = stableStandingBidReaction(meta.minReputation, nationalScore);
      if (r.baseFactor === 1) expect(r.factor).toBeCloseTo(1, 6);
    }
  });
});

describe("stableStandingAskReaction", () => {
  it("quotes unknown buyers up and caps the premium by tier", () => {
    const elite = stableStandingAskReaction(95, 0);
    const backyard = stableStandingAskReaction(5, 0);
    expect(elite.factor).toBeGreaterThan(1);
    expect(elite.factor).toBeGreaterThan(backyard.factor);
    expect(elite.factor - 1).toBeLessThanOrEqual(
      getStableReputationTierMeta(95).maxAskPremium + 1e-9,
    );
    expect(backyard.factor - 1).toBeLessThanOrEqual(
      getStableReputationTierMeta(5).maxAskPremium + 1e-9,
    );
  });

  it("shades the price for a highly regarded buyer", () => {
    const elite = stableStandingAskReaction(95, 1000);
    expect(elite.factor).toBeLessThan(1);
    expect(elite.note).toContain("off");
  });
});
