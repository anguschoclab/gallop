import { describe, it, expect } from "vitest";
import { recommendedMaxOffer } from "@/core/stable/recommendedMaxOffer";
import { createTestStable } from "@/tests/helpers";
import { ACCEPT_THRESHOLDS, COUNTER_MULTIPLIERS } from "@/constants/privateSaleConstants";
import type { StablePersonality } from "@/game/types";

const horses = Array.from({ length: 10 }, (_, i) => `h${i}`) as unknown as never[];

describe("recommendedMaxOffer", () => {
  it("returns acceptThreshold equal to baseAcceptThreshold for a rich (pressure 0) stable", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    const result = recommendedMaxOffer(stable);
    expect(result.acceptThreshold).toBeCloseTo(ACCEPT_THRESHOLDS.aggressive, 10);
    expect(result.baseAcceptThreshold).toBeCloseTo(ACCEPT_THRESHOLDS.aggressive, 10);
    expect(result.softeningPoints).toBeCloseTo(0, 5);
  });

  it("returns a lower acceptThreshold for a desperate stable (cash near 0)", () => {
    const stable = createTestStable({
      cash: 100,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    const result = recommendedMaxOffer(stable);
    expect(result.acceptThreshold).toBeLessThan(result.baseAcceptThreshold);
    expect(result.softeningPoints).toBeGreaterThan(0);
  });

  it("returns counterMultiplier matching the softened counter multiplier", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "conservative" as StablePersonality,
    });
    const result = recommendedMaxOffer(stable);
    expect(result.counterMultiplier).toBeCloseTo(COUNTER_MULTIPLIERS.conservative, 10);
  });

  it("computes maxOfferAmount and likelyCounterAmount when ask is provided", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    const ask = 100_000;
    const result = recommendedMaxOffer(stable, { ask });
    expect(result.maxOfferAmount).toBe(Math.round(ask * result.acceptThreshold));
    expect(result.likelyCounterAmount).toBe(Math.round(ask * result.counterMultiplier));
  });

  it("computes shortfall and projectedOutcome when ask + offerAmount are provided", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    const ask = 100_000;
    const lowOffer = 40_000;
    const result = recommendedMaxOffer(stable, { ask, offerAmount: lowOffer });
    expect(result.shortfallAmount).toBeGreaterThan(0);
    expect(result.shortfallPercent).toBeGreaterThan(0);
    expect(result.projectedOutcome).toBe("declined");
  });

  it("returns shortfall 0 and accepted outcome when offer exceeds threshold", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    const ask = 100_000;
    const goodOffer = 120_000;
    const result = recommendedMaxOffer(stable, { ask, offerAmount: goodOffer });
    expect(result.shortfallAmount).toBe(0);
    expect(result.projectedOutcome).toBe("accepted");
  });

  it("returns countered outcome when offer is between counter and accept thresholds", () => {
    const stable = createTestStable({
      cash: 10_000_000,
      horses,
      personality: "aggressive" as StablePersonality,
    });
    const ask = 100_000;
    // aggressive: accept=0.7, counter=0.5 — offer at 0.6 should counter
    const midOffer = 60_000;
    const result = recommendedMaxOffer(stable, { ask, offerAmount: midOffer });
    expect(result.projectedOutcome).toBe("countered");
  });
});
