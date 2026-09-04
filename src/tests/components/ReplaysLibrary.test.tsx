import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { ReplaysLibrary } from "@/components/replays/ReplaysLibrary";
import type { Race } from "@/game/types";
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

function makeRace(overrides: Partial<Race> & { id: string }): Race {
  return {
    name: "Test Race",
    day: 10,
    distance: 1600,
    entries: [],
    resolved: false,
    surface: "Turf",
    ...overrides,
  } as Race;
}

function makeSnapshots(): RaceSnapshot[] {
  return [
    { t: 0, horses: [{ horseId: "h-1", position: 0, lane: 1, velocity: 0 }] },
    { t: 1, horses: [{ horseId: "h-1", position: 5, lane: 1, velocity: 15 }] },
  ];
}

describe("ReplaysLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no resolved races with snapshots", () => {
    renderWithStore(<ReplaysLibrary />, { races: {} });
    expect(screen.getByText(/no replays/i)).toBeInTheDocument();
  });

  it("renders list of resolved races with snapshots", () => {
    const r1 = makeRace({
      id: "r-1",
      name: "Spring Stakes",
      day: 10,
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
    });
    renderWithStore(<ReplaysLibrary />, {
      races: { "r-1": r1 },
    });

    expect(screen.getByText("Spring Stakes")).toBeInTheDocument();
  });

  it("shows race day and distance for each replay", () => {
    const r1 = makeRace({
      id: "r-1",
      name: "Spring Stakes",
      day: 42,
      distance: 1800,
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
    });
    renderWithStore(<ReplaysLibrary />, { races: { "r-1": r1 } });

    // Day 42 appears in the card
    const dayElements = screen.getAllByText(/42/);
    expect(dayElements.length).toBeGreaterThanOrEqual(1);
    // Distance 1,800m
    const distElements = screen.getAllByText(/1,800/);
    expect(distElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows highlight reel section for wins and graded placings", () => {
    const r1 = makeRace({
      id: "r-1",
      name: "Championship G1",
      day: 10,
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
      entries: [{ horseId: "h-1" } as any],
      graded: { key: "g1-test", grade: "G1", track: "Test Track", trackId: "t-1", surface: "Turf" },
    });
    renderWithStore(<ReplaysLibrary />, { races: { "r-1": r1 } });

    expect(screen.getByText(/highlight/i)).toBeInTheDocument();
    // Race name appears in both highlight and all-replays sections
    const raceElements = screen.getAllByText("Championship G1");
    expect(raceElements.length).toBeGreaterThanOrEqual(1);
  });

  it("filters replays by horse ID", () => {
    const r1 = makeRace({
      id: "r-1",
      name: "Race A",
      day: 10,
      resolved: true,
      result: [{ horseId: "h-1", position: 1, time: 95.5 }],
      snapshots: makeSnapshots(),
      entries: [{ horseId: "h-1" } as any],
    });
    const r2 = makeRace({
      id: "r-2",
      name: "Race B",
      day: 20,
      resolved: true,
      result: [{ horseId: "h-2", position: 1, time: 90.0 }],
      snapshots: makeSnapshots(),
      entries: [{ horseId: "h-2" } as any],
    });
    renderWithStore(<ReplaysLibrary />, { races: { "r-1": r1, "r-2": r2 } });

    // Both visible initially (may appear multiple times if in highlights)
    expect(screen.getAllByText("Race A").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Race B").length).toBeGreaterThanOrEqual(1);

    // Filter by horse h-1
    const filter = screen.getByPlaceholderText(/filter by horse/i);
    fireEvent.change(filter, { target: { value: "h-1" } });

    expect(screen.getAllByText("Race A").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Race B")).not.toBeInTheDocument();
  });
});
