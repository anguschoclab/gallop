import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { JockeyCard } from "@/components/jockey/JockeyCard";
import type { Jockey, Horse } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) =>
    createElement("a", props as any, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

describe("JockeyCard - Tipster Insight", () => {
  const jockey: Jockey = {
    id: "j1",
    name: "Test Jockey",
    age: 25,
    archetype: "versatile",
    stats: { pacing: 50, positioning: 50, vigor: 50, gateSkill: 50, temperament: 50 },
    potential: 50,
    traits: [],
    silk: { pattern: "solid", primary: "#fff", secondary: "#000", cap: "#fff" },
    careerStarts: 10,
    careerWins: 5,
    fame: 0,
    ridingFee: 100,
    affinityMap: {},
    stableAffinity: 0,
    isApprentice: false,
    loyalty: 50,
  };

  it("renders the jockey card without crashing", () => {
    renderWithStore(<JockeyCard jockey={jockey} />, {
      horses: {},
    });
    expect(screen.getByText("Test Jockey")).toBeTruthy();
  });

  it("renders a Tipster Insight when the jockey has one", () => {
    const horses: Record<string, Horse> = {
      h1: {
        id: "h1",
        name: "Thunder",
        raceHistory: [
          { jockeyId: "j1", position: 1 },
          { jockeyId: "j1", position: 1 },
          { jockeyId: "j1", position: 1 },
          { jockeyId: "j1", position: 2 },
          { jockeyId: "j1", position: 3 },
        ],
      } as any,
    };

    renderWithStore(<JockeyCard jockey={jockey} />, {
      horses,
    });

    expect(screen.getByText(/Tipster Insight: Favorite Mount/i)).toBeTruthy();
    expect(screen.getByText("Thunder")).toBeTruthy();
  });
});
