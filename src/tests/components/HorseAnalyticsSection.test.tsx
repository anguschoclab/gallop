import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { HorseAnalyticsSection } from "@/components/horse/HorseAnalyticsSection";
import type { Horse } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

function createHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
    energy: 80,
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      temperament: 50,
      conformation: 50,
      consistency: 50,
    },
    potential: 70,
    raceHistory: [],
    owned: true,
    healthStatus: "healthy",
    lifecycleStatus: "active",
    racingViable: true,
    courseVisits: {},
    ...overrides,
  } as Horse;
}

describe("HorseAnalyticsSection — Tipster Insight", () => {
  it("renders insight when horse has a 3-race win streak", () => {
    const horse = createHorse({
      raceHistory: [
        {
          raceId: "r1",
          raceName: "Race 1",
          position: 1,
          day: 1,
          distance: 1200,
          surface: "Turf",
          beyer: 80,
          purse: 1000,
        },
        {
          raceId: "r2",
          raceName: "Race 2",
          position: 1,
          day: 2,
          distance: 1200,
          surface: "Turf",
          beyer: 85,
          purse: 1000,
        },
        {
          raceId: "r3",
          raceName: "Race 3",
          position: 1,
          day: 3,
          distance: 1200,
          surface: "Turf",
          beyer: 90,
          purse: 1000,
        },
      ],
    });
    renderWithStore(<HorseAnalyticsSection horse={horse} peakingMultiplier={1.0} />);
    expect(screen.getByText(/Tipster Insight: Red Hot/i)).toBeTruthy();
    expect(screen.getByText(/3 Race Win Streak/i)).toBeTruthy();
  });

  it("does not render insight section when horse has fewer than 3 races", () => {
    const horse = createHorse({
      raceHistory: [
        {
          raceId: "r1",
          raceName: "Race 1",
          position: 1,
          day: 1,
          distance: 1200,
          surface: "Turf",
          beyer: 80,
          purse: 1000,
        },
        {
          raceId: "r2",
          raceName: "Race 2",
          position: 2,
          day: 2,
          distance: 1200,
          surface: "Turf",
          beyer: 75,
          purse: 1000,
        },
      ],
    });
    const { container } = renderWithStore(
      <HorseAnalyticsSection horse={horse} peakingMultiplier={1.0} />,
    );
    expect(container.textContent).not.toContain("Tipster Insight");
  });

  it("displays the correct value and context for a distance specialist", () => {
    const horse = createHorse({
      raceHistory: [
        {
          raceId: "r1",
          raceName: "Race 1",
          position: 2,
          day: 1,
          distance: 1200,
          surface: "Turf",
          beyer: 80,
          purse: 1000,
        },
        {
          raceId: "r2",
          raceName: "Race 2",
          position: 2,
          day: 2,
          distance: 1200,
          surface: "Turf",
          beyer: 85,
          purse: 1000,
        },
        {
          raceId: "r3",
          raceName: "Race 3",
          position: 2,
          day: 3,
          distance: 1200,
          surface: "Turf",
          beyer: 90,
          purse: 1000,
        },
      ],
    });
    renderWithStore(<HorseAnalyticsSection horse={horse} peakingMultiplier={1.0} />);
    expect(screen.getByText(/Tipster Insight: Distance Specialist/i)).toBeTruthy();
    expect(screen.getAllByText(/1200m/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Best performance average/i)).toBeTruthy();
  });
});
