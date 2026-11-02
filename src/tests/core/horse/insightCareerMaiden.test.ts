import { describe, it, expect } from "vitest";
import { detectCareerMaiden } from "@/domains/horse/simulation/insightDetectors";
import type { Horse } from "@/domains/horse/simulation/types";

const winless = (starts: number, placings = 0) => ({
  raceHistory: Array.from({ length: starts }, (_, i) => ({
    position: i < placings ? 2 : 5,
    day: i + 1,
    beyer: 60,
  })),
});

describe("detectCareerMaiden", () => {
  it("returns null below the 10-start threshold", () => {
    const horse = winless(9) as unknown as Horse;
    expect(detectCareerMaiden(horse)).toBeNull();
  });

  it("detects a career maiden at 10+ winless starts", () => {
    const horse = winless(10) as unknown as Horse;
    const insight = detectCareerMaiden(horse);
    expect(insight?.label).toBe("Career Maiden");
    expect(insight?.value).toBe("Still Seeking a Win");
    expect(insight?.type).toBe("negative");
    expect(insight?.context).toContain("10 career starts");
  });

  it("mentions placings when the maiden has hit the board", () => {
    const horse = winless(12, 3) as unknown as Horse;
    const insight = detectCareerMaiden(horse);
    expect(insight?.context).toContain("hitting the board 3 times");
  });

  it("returns null once the horse has won", () => {
    const history = winless(11) as { raceHistory: { position: number }[] };
    history.raceHistory[0].position = 1;
    const horse = history as unknown as Horse;
    expect(detectCareerMaiden(horse)).toBeNull();
  });
});
