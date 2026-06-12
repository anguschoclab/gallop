import { describe, it, expect } from "vitest";
import { calculateJockeyRating, getJockeyAbility } from "@/core/jockey/stats";
import { createTestJockey } from "@/tests/helpers";

function mkJockey(
  pacing: number,
  positioning: number,
  vigor: number,
  gateSkill: number,
  temperament: number,
  potential = 80,
) {
  return createTestJockey({
    stats: { pacing, positioning, vigor, gateSkill, temperament },
    potential,
  });
}

describe("calculateJockeyRating", () => {
  it("all-60 → 60", () => expect(calculateJockeyRating(mkJockey(60, 60, 60, 60, 60))).toBe(60));
  it("50+60+70+80+90 = 350/5 = 70", () =>
    expect(calculateJockeyRating(mkJockey(50, 60, 70, 80, 90))).toBe(70));
  it("rounds correctly — 61+62+63+64+65 = 315/5 = 63", () =>
    expect(calculateJockeyRating(mkJockey(61, 62, 63, 64, 65))).toBe(63));
  it("all-100 → 100", () =>
    expect(calculateJockeyRating(mkJockey(100, 100, 100, 100, 100))).toBe(100));
  it("all-1 → 1", () => expect(calculateJockeyRating(mkJockey(1, 1, 1, 1, 1))).toBe(1));
});

describe("getJockeyAbility", () => {
  it("returns current = rating and potential = jockey.potential when potential >= current", () => {
    const j = mkJockey(70, 70, 70, 70, 70, 80);
    const { current, potential } = getJockeyAbility(j);
    expect(current).toBe(calculateJockeyRating(j));
    expect(potential).toBe(80);
  });

  it("bumps potential to current when potential < current", () => {
    const j = mkJockey(80, 80, 80, 80, 80, 50);
    const { current, potential } = getJockeyAbility(j);
    expect(current).toBe(80);
    expect(potential).toBe(80);
  });

  it("never returns potential < current", () => {
    for (let p = 10; p <= 100; p += 10) {
      for (let s = 10; s <= 100; s += 10) {
        const j = mkJockey(s, s, s, s, s, p);
        const { current, potential } = getJockeyAbility(j);
        expect(potential).toBeGreaterThanOrEqual(current);
      }
    }
  });
});
