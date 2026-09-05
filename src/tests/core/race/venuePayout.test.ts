import { describe, it, expect } from "vitest";
import { venuePayoutMultiplier, applyVenuePayout } from "@/core/race/venuePayout";
import { computePayoutSplits } from "@/game/store/helpers/raceResolution";
import { generatePrizeMoneyImpacts } from "@/core/race/impacts/prizeMoney";
import { rankedRacecourses } from "@/core/prestige";
import { PRIZE_SPLIT } from "@/constants";
import { asHorseId, asNpcStableId } from "@/core/types/branded";
import { makeNpcOwned } from "@/core/horse/ownership";
import type { Horse, Race } from "@/game/types";

const ranked = rankedRacecourses();
const best = ranked[0];
const worst = ranked[ranked.length - 1];

describe("venue payout prestige", () => {
  it("returns a neutral multiplier without a venue", () => {
    expect(venuePayoutMultiplier(undefined)).toBe(1);
    expect(venuePayoutMultiplier({})).toBe(1);
  });

  it("pays more at a prestigious course than at a minor one", () => {
    const high = venuePayoutMultiplier({ trackId: best.id });
    const low = venuePayoutMultiplier({ trackId: worst.id });
    expect(high).toBeGreaterThan(low);
    expect(applyVenuePayout(100_000, { trackId: best.id })).toBeGreaterThan(
      applyVenuePayout(100_000, { trackId: worst.id }),
    );
  });

  it("keeps the multiplier bounded", () => {
    for (const t of ranked) {
      const m = venuePayoutMultiplier({ trackId: t.id });
      expect(m).toBeGreaterThan(0.7);
      expect(m).toBeLessThan(1.3);
    }
  });

  it("leaves payout splits untouched when no venue is given", () => {
    expect(computePayoutSplits(10000, 4)).toEqual(computePayoutSplits(10000, 4, false, null));
  });

  it("scales payout splits by course prestige", () => {
    const high = computePayoutSplits(100_000, 4, false, { trackId: best.id });
    const low = computePayoutSplits(100_000, 4, false, { trackId: worst.id });
    expect(high[0]).toBeGreaterThan(low[0]);
  });

  it("scales prize money impacts by course prestige", () => {
    const horse = {
      id: asHorseId("h1"),
      ownership: makeNpcOwned(asNpcStableId("s1")),
    } as unknown as Horse;
    const make = (trackId: string) =>
      ({ id: "r1", name: "Test", purse: 100_000, trackId }) as unknown as Race;
    const rng = { next: () => 0.5 } as never;

    const high = generatePrizeMoneyImpacts(horse, 1, make(best.id), 1, rng);
    const low = generatePrizeMoneyImpacts(horse, 1, make(worst.id), 1, rng);
    const baseline = Math.round(100_000 * PRIZE_SPLIT[0]);

    expect(high?.cashImpact?.amount).toBeGreaterThan(low?.cashImpact?.amount ?? 0);
    expect(high?.cashImpact?.amount).toBeGreaterThan(baseline);
    expect(low?.cashImpact?.amount).toBeLessThan(baseline);
  });
});
