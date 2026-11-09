import { describe, it, expect } from "vitest";
import { detectEarlySpeed } from "./insightDetectors";
import type { Horse, HorseRaceHistoryEntry } from "./types";

describe("detectEarlySpeed", () => {
  const mockHorse = (history: Partial<HorseRaceHistoryEntry>[]): Horse =>
    ({
      raceHistory: history as HorseRaceHistoryEntry[],
    }) as Horse;

  it("returns null for less than 5 races with pace data", () => {
    expect(
      detectEarlySpeed(
        mockHorse([
          { pacePositions: [1, 1, 1] },
          { pacePositions: [2, 2, 2] },
          { pacePositions: [1, 1, 1] },
          { pacePositions: [2, 2, 2] },
        ]),
      ),
    ).toBeNull();
  });

  it("detects a Pacesetter", () => {
    const horse = mockHorse([
      { pacePositions: [1, 2] },
      { pacePositions: [2, 3] },
      { pacePositions: [1, 1] },
      { pacePositions: [2, 4] },
      { pacePositions: [1, 2] },
    ]);
    const insight = detectEarlySpeed(horse);
    expect(insight).not.toBeNull();
    expect(insight?.label).toBe("Early Speed");
  });

  it("returns null if pace tendency is not strong enough", () => {
    const horse = mockHorse([
      { pacePositions: [1, 2] },
      { pacePositions: [4, 4] },
      { pacePositions: [5, 5] },
      { pacePositions: [2, 4] },
      { pacePositions: [1, 2] },
    ]);
    expect(detectEarlySpeed(horse)).toBeNull();
  });
});
