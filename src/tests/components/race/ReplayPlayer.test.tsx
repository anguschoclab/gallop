import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReplayPlayer } from "@/components/race/ReplayPlayer";
import type { Race } from "@/game/types";

vi.mock("@/game/store", () => ({
  useGameWithShallow: vi.fn(),
  useGame: vi.fn(),
}));

import { useGame } from "@/game/store";

function makeRace(overrides: Partial<Race> & { id: string }): Race {
  return {
    name: "Test Race",
    day: 10,
    distance: 1200,
    entries: [],
    resolved: false,
    surface: "Turf",
    ...overrides,
  } as Race;
}

describe("ReplayPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null when no race exists", () => {
    vi.mocked(useGame).mockReturnValue(undefined);
    const { container } = render(<ReplayPlayer raceId="race-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when race is not resolved", () => {
    vi.mocked(useGame).mockReturnValue(makeRace({ id: "race-1", resolved: false }));
    const { container } = render(<ReplayPlayer raceId="race-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when race has no snapshots", () => {
    vi.mocked(useGame).mockReturnValue(
      makeRace({ id: "race-1", resolved: true, snapshots: [], result: [] }),
    );
    const { container } = render(<ReplayPlayer raceId="race-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders replay viewer when race has snapshots", () => {
    vi.mocked(useGame).mockReturnValue(
      makeRace({
        id: "race-1",
        resolved: true,
        snapshots: [{ t: 0, horses: [{ horseId: "h1", position: 0, lane: 1, velocity: 0 }] }],
        result: [{ horseId: "h1", position: 1, time: 60 }],
      }),
    );
    render(<ReplayPlayer raceId="race-1" />);
    expect(screen.getByText(/Replay Available/i)).toBeInTheDocument();
  });

  it("displays replay metadata (day, distance, snapshots)", () => {
    vi.mocked(useGame).mockReturnValue(
      makeRace({
        id: "race-1",
        day: 42,
        distance: 1400,
        resolved: true,
        snapshots: [
          { t: 0, horses: [{ horseId: "h1", position: 0, lane: 1, velocity: 0 }] },
          { t: 1, horses: [{ horseId: "h1", position: 5, lane: 1, velocity: 15 }] },
        ],
        result: [{ horseId: "h1", position: 1, time: 60 }],
      }),
    );
    render(<ReplayPlayer raceId="race-1" />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/1,400m/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // snapshot count
  });

  it("shows final positions table when race has results", () => {
    vi.mocked(useGame).mockReturnValue(
      makeRace({
        id: "race-1",
        day: 10,
        distance: 1200,
        resolved: true,
        snapshots: [{ t: 0, horses: [{ horseId: "h1", position: 0, lane: 1, velocity: 0 }] }],
        result: [
          { horseId: "h1", position: 1, time: 60.5 },
          { horseId: "h2", position: 2, time: 62.3 },
        ],
      }),
    );
    render(<ReplayPlayer raceId="race-1" />);
    expect(screen.getByText("60.50s")).toBeInTheDocument();
    expect(screen.getByText("62.30s")).toBeInTheDocument();
  });
});
