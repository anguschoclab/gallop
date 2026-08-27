import { describe, it, expect } from "vitest";
import {
  computePremiumBuyout,
  computeDiplomaticPressure,
} from "@/core/horse/overrideNegotiation";
import type { HorseAttachment, AttachmentTier } from "@/core/horse/attachment";

function mkAttachment(tier: AttachmentTier, score: number): HorseAttachment {
  return {
    score,
    tier,
    label: tier,
    askMultiplier: 1.05,
    signals: [],
    blurb: "",
  };
}

const TIER_SCORES: { tier: AttachmentTier; score: number }[] = [
  { tier: "available", score: 10 },
  { tier: "valued", score: 35 },
  { tier: "protected", score: 60 },
  { tier: "untouchable", score: 85 },
];

describe("overrideNegotiation", () => {
  describe("computePremiumBuyout", () => {
    it("premium buyout cost >= ask for protected tier", () => {
      const att = mkAttachment("protected", 60);
      const ask = 50000;
      const result = computePremiumBuyout(att, ask);
      expect(result.cost).toBeGreaterThanOrEqual(ask);
    });

    it("premium buyout cost >= ask for untouchable tier", () => {
      const att = mkAttachment("untouchable", 85);
      const ask = 50000;
      const result = computePremiumBuyout(att, ask);
      expect(result.cost).toBeGreaterThanOrEqual(ask);
    });

    it("premium buyout cost = ask * 1.5 for protected", () => {
      const att = mkAttachment("protected", 60);
      const ask = 50000;
      const result = computePremiumBuyout(att, ask);
      expect(result.cost).toBe(Math.round(ask * 1.5));
    });

    it("premium buyout cost = ask * 2.0 for untouchable", () => {
      const att = mkAttachment("untouchable", 85);
      const ask = 50000;
      const result = computePremiumBuyout(att, ask);
      expect(result.cost).toBe(Math.round(ask * 2.0));
    });
  });

  describe("computeDiplomaticPressure odds", () => {
    it("odds in [0, 1] for all tier/friction combos", () => {
      const frictions = [-100, 0, 50, 100];
      for (const { tier, score } of TIER_SCORES) {
        const att = mkAttachment(tier, score);
        for (const friction of frictions) {
          const result = computeDiplomaticPressure(att, 50000, friction, 50);
          expect(result.odds).toBeGreaterThanOrEqual(0);
          expect(result.odds).toBeLessThanOrEqual(1);
        }
      }
    });

    it("odds decrease with higher attachment tier (same friction)", () => {
      const friction = 0;
      const odds = TIER_SCORES.map(({ tier, score }) =>
        computeDiplomaticPressure(mkAttachment(tier, score), 50000, friction, 50).odds,
      );
      expect(odds[0]).toBeGreaterThan(odds[1]);
      expect(odds[1]).toBeGreaterThan(odds[2]);
      expect(odds[2]).toBeGreaterThan(odds[3]);
    });

    it("odds increase with high friction (same tier)", () => {
      const att = mkAttachment("protected", 60);
      const lowFriction = computeDiplomaticPressure(att, 50000, 0, 50).odds;
      const highFriction = computeDiplomaticPressure(att, 50000, 80, 50).odds;
      expect(highFriction).toBeGreaterThan(lowFriction);
    });

    it("success cost = round(ask * 1.1)", () => {
      const att = mkAttachment("protected", 60);
      const ask = 50000;
      const result = computeDiplomaticPressure(att, ask, 0, 50);
      expect(result.successCost).toBe(Math.round(ask * 1.1));
    });

    it("failure penalty describes friction increase", () => {
      const att = mkAttachment("protected", 60);
      const result = computeDiplomaticPressure(att, 50000, 0, 50);
      expect(result.failurePenalty.toLowerCase()).toContain("relationship");
    });
  });
});
