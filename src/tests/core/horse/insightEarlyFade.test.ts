import { describe, it, expect } from "vitest";
import { detectEarlyFade } from "@/domains/horse/simulation/insightDetectors";

describe("detectEarlyFade", () => {
  it("returns null if horse has fewer than 3 races", () => {
    const horse = {
      raceHistory: [
        { position: 4, pacePositions: [1, 2, 3] },
        { position: 5, pacePositions: [2, 3, 4] },
      ],
    } as any;
    expect(detectEarlyFade(horse)).toBeNull();
  });

  it("returns the insight if horse fades in >=75% of early speed races", () => {
    const horse = {
      raceHistory: [
        { position: 4, pacePositions: [1, 2, 3] },
        { position: 5, pacePositions: [2, 3, 4] },
        { position: 6, pacePositions: [1, 3, 5] },
        { position: 1, pacePositions: [8, 4, 1] }, // Off the pace win, doesn't count
      ],
    } as any;
    expect(detectEarlyFade(horse)).toEqual({
      label: "Early Fade",
      value: "Struggles to Finish",
      context: "Faded out of the money in 3 of 3 races where they contested the early lead",
      type: "negative",
    });
  });

  it("returns null if fade rate is < 75%", () => {
    const horse = {
      raceHistory: [
        { position: 4, pacePositions: [1, 2, 3] },
        { position: 1, pacePositions: [1, 1, 1] },
        { position: 2, pacePositions: [2, 2, 2] },
        { position: 3, pacePositions: [2, 3, 3] },
      ],
    } as any;
    expect(detectEarlyFade(horse)).toBeNull();
  });
});
