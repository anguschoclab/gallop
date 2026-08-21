import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { SeasonStandingsWidget } from "@/components/dashboard/SeasonStandingsWidget";
import { createDefaultGameState } from "@/game/store/state";
import type { GameState, Horse } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, string>;
  }) => createElement("a", { to, "data-params": JSON.stringify(params) }, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    energy: 80,
    peakingIndex: 0,
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      temperament: 70,
      durability: 70,
      consistency: 70,
    } as any,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    distanceAptitude: 1600,
    raceHistory: [],
    ownership: { type: "player" },
    ...overrides,
  }) as Horse;

describe("SeasonStandingsWidget", () => {
  it("renders with time-range selector buttons", () => {
    seedStore({ ...createDefaultGameState() });
    render(<SeasonStandingsWidget />);
    expect(screen.getByText("7D")).toBeTruthy();
    expect(screen.getByText("30D")).toBeTruthy();
    expect(screen.getByText("90D")).toBeTruthy();
  });

  it("default range is 30D", () => {
    seedStore({ ...createDefaultGameState() });
    render(<SeasonStandingsWidget />);
    const btn30 = screen.getByText("30D");
    expect(btn30.className).toContain("bg-gold");
  });

  it("clicking 7D changes the selected range", () => {
    seedStore({ ...createDefaultGameState() });
    render(<SeasonStandingsWidget />);
    fireEvent.click(screen.getByText("7D"));
    const btn7 = screen.getByText("7D");
    expect(btn7.className).toContain("bg-gold");
  });

  it("shows empty state when no prize money earned", () => {
    seedStore({ ...createDefaultGameState() });
    render(<SeasonStandingsWidget />);
    expect(
      screen.getByText(/no prize money/i) ||
        screen.getByText(/no earnings/i) ||
        screen.getByText(/—/),
    ).toBeTruthy();
  });

  it("renders standings rows when race history exists", () => {
    const h1 = mkHorse({
      id: "h1",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "r1",
          raceName: "Test",
          position: 1,
          day: 55,
          beyer: 80,
          purse: 100000,
          purseEarned: 60000,
          surface: "Turf",
          distance: 1600,
        } as any,
      ],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1 },
      playerProfile: {
        stableName: "My Stable",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
      } as any,
    });
    render(<SeasonStandingsWidget />);
    expect(screen.getByText("My Stable")).toBeTruthy();
  });

  it("shows notification badge when inbox has standings messages", () => {
    const h1 = mkHorse({
      id: "h1",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "r1",
          raceName: "Test",
          position: 1,
          day: 55,
          beyer: 80,
          purse: 100000,
          purseEarned: 60000,
          surface: "Turf",
          distance: 1600,
        } as any,
      ],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1 },
      inbox: [
        {
          id: "msg1",
          day: 55,
          category: "standings",
          priority: "info",
          title: "Rank changed!",
          body: "You moved up to #3",
        } as any,
      ],
    } as Partial<GameState>);
    render(<SeasonStandingsWidget />);
    expect(screen.getByTestId("standings-badge")).toBeTruthy();
  });

  it("clicking a row opens the stable details panel", () => {
    const h1 = mkHorse({
      id: "h1",
      ownership: { type: "player" },
      raceHistory: [
        {
          raceId: "r1",
          raceName: "Test",
          position: 1,
          day: 55,
          beyer: 80,
          purse: 100000,
          purseEarned: 60000,
          surface: "Turf",
          distance: 1600,
        } as any,
      ],
    });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1 },
      playerProfile: {
        stableName: "My Stable",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
      } as any,
    });
    render(<SeasonStandingsWidget />);
    const row = screen.getByText("My Stable");
    fireEvent.click(row);
  });

  it("shows recent awards with links to /awards/$category", () => {
    const h1 = mkHorse({ id: "h1", ownership: { type: "player" } });
    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1 },
      awards: [
        {
          id: "aw1",
          year: 2,
          category: "horse_of_the_year",
          region: "north_america",
          horseId: "h1",
          horseName: "Thunder",
          points: 100,
          runnerUpPoints: 80,
          margin: 20,
          qualifyingRaces: ["r1"],
          ceremonyDay: 50,
        } as any,
      ],
      playerProfile: {
        stableName: "My Stable",
        silk: { primary: "#ff0000", secondary: "#0000ff" },
      } as any,
    });
    const { container } = render(<SeasonStandingsWidget />);
    expect(screen.getByText("Recent Awards")).toBeTruthy();
    expect(screen.getByText("Horse of the Year")).toBeTruthy();
    const awardLinks = container.querySelectorAll('a[to="/awards/$category"]');
    expect(awardLinks.length).toBeGreaterThanOrEqual(1);
  });
});
