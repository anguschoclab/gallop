import { describe, it, expect } from "vitest";
import { computePrivateSaleDecision, buildPrivateSaleDecisionTrace } from "@/core/horse/privateSaleDecision";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Stable, StablePersonality } from "@/game/types";
import { makeNpcOwned } from "@/core/horse/ownership";
import { ACCEPT_THRESHOLDS, COUNTER_THRESHOLDS } from "@/constants/privateSaleConstants";

describe("privateSaleDecision", () => {
  const setup = (personality: StablePersonality, cash: number) => {
    const stable: Stable = { id: "s1", personality, cash, horses: ["h1"], type: "npc" } as any;
    const horse = createTestHorse({ id: "h1", ownership: makeNpcOwned("s1") });
    const attachment = { score: 10, tier: "available" as const, label: "", askMultiplier: 1.0, signals: [], blurb: "" };
    return { stable, horse, attachment };
  };

  it("accepts when offer ratio >= softened accept threshold", () => {
    const { stable, horse, attachment } = setup("trader", 10_000_000);
    const result = computePrivateSaleDecision({ stable, horse, offer: { amount: 80_000 }, valuation: 100_000, attachment });

    expect(result.decision).toBe("accepted");
    expect(result.offerRatio).toBeCloseTo(0.8);
  });

  it("counters when offer ratio >= softened counter threshold but < accept", () => {
    const { stable, horse, attachment } = setup("trader", 10_000_000);
    const result = computePrivateSaleDecision({ stable, horse, offer: { amount: 70_000 }, valuation: 100_000, attachment });

    expect(result.decision).toBe("countered");
    expect(result.counterAmount).toBe(110_000);
  });

  it("declines when offer ratio < softened counter threshold", () => {
    const { stable, horse, attachment } = setup("trader", 10_000_000);
    const result = computePrivateSaleDecision({ stable, horse, offer: { amount: 50_000 }, valuation: 100_000, attachment });

    expect(result.decision).toBe("declined");
    expect(result.counterAmount).toBeUndefined();
  });

  it("softens thresholds when cash pressure is high", () => {
    const { stable, horse, attachment } = setup("prestige", 1000);
    const result = computePrivateSaleDecision({ stable, horse, offer: { amount: 85_000 }, valuation: 100_000, attachment });

    expect(result.cashPressure.pressure).toBeCloseTo(1.0);
    expect(result.decision).toBe("countered");
    expect(result.softenedAcceptThreshold).toBeLessThan(ACCEPT_THRESHOLDS.prestige);
    expect(result.softenedCounterThreshold).toBeLessThan(COUNTER_THRESHOLDS.prestige);
  });

  it("builds a correct trace and handles zero valuation", () => {
    const { stable, horse, attachment } = setup("conservative", 10_000_000);
    const trace = buildPrivateSaleDecisionTrace({ stable, horse, offer: { amount: 120_000 }, valuation: 100_000, attachment });
    expect(trace.decision).toBe("accepted");
    expect(trace.pressure).toBe(0);

    const zeroResult = computePrivateSaleDecision({ stable, horse, offer: { amount: 10_000 }, valuation: 0, attachment });
    expect(zeroResult.offerRatio).toBe(0);
    expect(zeroResult.decision).toBe("declined");
  });
});
