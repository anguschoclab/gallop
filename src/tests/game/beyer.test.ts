import { describe, it, expect } from "vitest";
import {
  beyerFigure,
  distanceBucket,
  parTime,
  expectedBeyer,
  calculateBeyerForResult,
} from "@/core/race/beyer";
import type { Horse } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "h1",
    name: "Test",
    age: 4,
    gender: "colt",
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      consistency: 70,
      temperament: 50,
      conformation: 50,
    },
    energy: 100,
    form: 0,
    potential: 80,
    raceHistory: [],
    owned: false,
    fame: 0,
    lifecycleStatus: "active" as const,
    ...overrides,
  });
}

describe("beyerFigure", () => {
  it("returns 0 for non-finite input rather than NaN", () => {
    expect(beyerFigure({ distance: 1600, finishTime: Infinity })).toBe(0);
    expect(beyerFigure({ distance: 1600, finishTime: NaN })).toBe(0);
    expect(beyerFigure({ distance: 1600, finishTime: -1 })).toBe(0);
    expect(beyerFigure({ distance: 1600, finishTime: 0 })).toBe(0);
  });

  it("clamps to the documented [30, 125] range", () => {
    expect(beyerFigure({ distance: 1600, finishTime: 5 })).toBeLessThanOrEqual(125);
    expect(beyerFigure({ distance: 1600, finishTime: 5 })).toBeGreaterThanOrEqual(30);
    expect(beyerFigure({ distance: 1600, finishTime: 600 })).toBeGreaterThanOrEqual(30);
  });

  it("a faster time produces a higher figure than a slower one at the same distance", () => {
    const fast = beyerFigure({ distance: 1600, finishTime: 90 });
    const slow = beyerFigure({ distance: 1600, finishTime: 110 });
    expect(fast).toBeGreaterThan(slow);
  });
});

describe("distanceBucket", () => {
  it("1600 → 1600", () => expect(distanceBucket(1600)).toBe(1600));
  it("1700 → 1800 (rounds to nearest 200)", () => expect(distanceBucket(1700)).toBe(1800));
  it("1500 → 1600 (rounds half-up to nearest 200)", () => expect(distanceBucket(1500)).toBe(1600));
  it("1550 → 1600 (rounds to nearest 200)", () => expect(distanceBucket(1550)).toBe(1600));
  it("100 → 200 (floor at 200)", () => expect(distanceBucket(100)).toBe(200));
  it("200 → 200", () => expect(distanceBucket(200)).toBe(200));
  it("result is always a multiple of 200", () => {
    [800, 1000, 1200, 1400, 1600, 1800, 2000, 2400].forEach((d) =>
      expect(distanceBucket(d) % 200).toBe(0),
    );
  });
});

describe("parTime", () => {
  it("no calibration → falls back to distance / 16.7", () => {
    expect(parTime(1600, {})).toBeCloseTo(1600 / 16.7, 1);
  });

  it("uses calibrated par when available", () => {
    const pars = { 1600: 90 };
    expect(parTime(1600, pars)).toBeCloseTo(90, 1);
  });

  it("blends from neighbor bucket when direct bucket missing", () => {
    const pars = { 1400: 84 }; // neighbor of 1600
    const t = parTime(1600, pars);
    expect(t).toBeGreaterThan(0);
    expect(Number.isFinite(t)).toBe(true);
  });
});

describe("expectedBeyer", () => {
  it("returns a finite number in [30, 125]", () => {
    const h = mkHorse();
    const fig = expectedBeyer(h, 1600, 0);
    expect(Number.isFinite(fig)).toBe(true);
    expect(fig).toBeGreaterThanOrEqual(30);
    expect(fig).toBeLessThanOrEqual(125);
  });

  it("higher speed → higher expected Beyer (other factors equal)", () => {
    const fastH = mkHorse({
      stats: {
        speed: 90,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
    });
    const slowH = mkHorse({
      stats: {
        speed: 40,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
    });
    expect(expectedBeyer(fastH, 1600)).toBeGreaterThan(expectedBeyer(slowH, 1600));
  });

  it("class bonus increases the figure", () => {
    const h = mkHorse();
    expect(expectedBeyer(h, 1600, 8)).toBeGreaterThan(expectedBeyer(h, 1600, 0));
  });
});

describe("calculateBeyerForResult", () => {
  it("delegates to beyerFigure — same result for same inputs", () => {
    expect(calculateBeyerForResult(1600, 95, 0)).toBe(
      beyerFigure({ distance: 1600, finishTime: 95, classBonus: 0 }),
    );
    expect(calculateBeyerForResult(2000, 120, 5)).toBe(
      beyerFigure({ distance: 2000, finishTime: 120, classBonus: 5 }),
    );
  });

  it("non-finite finishTime → 0", () => {
    expect(calculateBeyerForResult(1600, Infinity)).toBe(0);
    expect(calculateBeyerForResult(1600, 0)).toBe(0);
  });
});
