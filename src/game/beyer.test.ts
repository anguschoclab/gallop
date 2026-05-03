import { describe, it, expect } from "vitest";
import { beyerFigure } from "./beyer";

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
