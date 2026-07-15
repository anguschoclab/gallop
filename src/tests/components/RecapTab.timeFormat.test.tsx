import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { RecapTab } from "@/components/briefing/RecapTab";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => children,
}));

vi.mock("@/hooks/race/useRecapData", () => ({
  useRecapData: () => ({
    localHorseMap: new Map([
      [
        "h1",
        {
          id: "h1",
          name: "Speedy",
          age: 4,
          stats: {
            speed: 60,
            stamina: 50,
            acceleration: 55,
            temperament: 40,
            conformation: 35,
            consistency: 30,
          },
        },
      ],
    ]),
    recentGradedRaces: [
      {
        id: "r1",
        name: "Test Stakes",
        day: 10,
        distance: 1600,
        purse: 50000,
        graded: { grade: "G1", track: "Test Track", surface: "Turf" },
        raceClass: "stakes",
        result: [{ horseId: "h1", time: 92.41598732105, position: 1 }],
      },
    ],
    calibratedPars: {},
  }),
}));

describe("RecapTab — finish time formatting", () => {
  it("displays finish time with 2 decimal places", () => {
    const { container } = render(<RecapTab />);
    const text = container.textContent ?? "";
    expect(text).toContain("92.42s");
    expect(text).not.toContain("92.41598732105");
  });
});
