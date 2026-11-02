import { describe, it, expect } from "vitest";
import { detectBoomOrBust } from "@/domains/horse/simulation/insightDetectors";
import type { Horse } from "@/domains/horse/simulation/types";

const history = (positions: number[]) => ({
  raceHistory: positions.map((position, i) => ({ position, day: i + 1 })),
});

describe("detectBoomOrBust", () => {
  it("returns null with fewer than 6 starts", () => {
    const horse = history([1, 4, 1, 5, 6]) as unknown as Horse;
    expect(detectBoomOrBust(horse)).toBeNull();
  });

  it("detects an all-or-nothing profile", () => {
    const horse = history([1, 4, 1, 5, 6, 7]) as unknown as Horse;
    const insight = detectBoomOrBust(horse);
    expect(insight?.label).toBe("Boom or Bust");
    expect(insight?.value).toBe("All or Nothing");
    expect(insight?.type).toBe("neutral");
    expect(insight?.context).toBe(
      "Either wins or finishes off the board (2 wins, 4 unplaced, 0 minor placings)",
    );
  });

  it("returns null when minor placings dilute the pattern below 0.8", () => {
    const horse = history([1, 2, 1, 3, 4, 5]) as unknown as Horse;
    expect(detectBoomOrBust(horse)).toBeNull();
  });

  it("returns null with fewer than 2 wins", () => {
    const horse = history([1, 4, 4, 5, 6, 7]) as unknown as Horse;
    expect(detectBoomOrBust(horse)).toBeNull();
  });

  it("uses singular 'placing' when exactly one minor placing", () => {
    const horse = history([1, 1, 2, 4, 5, 6]) as unknown as Horse;
    const insight = detectBoomOrBust(horse);
    expect(insight?.context).toBe(
      "Either wins or finishes off the board (2 wins, 3 unplaced, 1 minor placing)",
    );
  });
});
