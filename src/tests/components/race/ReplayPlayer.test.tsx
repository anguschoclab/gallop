import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReplayPlayer } from "@/components/race/ReplayPlayer";
import type { RaceReplay } from "@/core/replays/replayTypes";

vi.mock("@/game/store", () => ({
  useGameWithShallow: vi.fn(),
  useGame: vi.fn(),
}));

import { useGameWithShallow } from "@/game/store";

describe("ReplayPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null when no replay exists for race", () => {
    vi.mocked(useGameWithShallow).mockReturnValue(undefined);
    const { container } = render(<ReplayPlayer raceId="race-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders replay viewer when replay exists", () => {
    const replay: RaceReplay = {
      id: "replay-1",
      raceId: "race-1",
      day: 10,
      checkpoints: [
        [
          { horseId: "h1", position: 1, distance: 10, time: 1, speed: 15 },
          { horseId: "h2", position: 2, distance: 8, time: 1, speed: 12 },
        ],
      ],
      winner: "h1",
      finalPositions: [
        { horseId: "h1", position: 1, time: 60 },
        { horseId: "h2", position: 2, time: 62 },
      ],
      trackId: "track-1",
      distance: 1200,
    };
    vi.mocked(useGameWithShallow).mockReturnValue(replay);

    render(<ReplayPlayer raceId="race-1" />);

    expect(screen.getByText(/Replay Available/i)).toBeInTheDocument();
  });

  it("displays replay metadata (day, distance, winner)", () => {
    const replay: RaceReplay = {
      id: "replay-1",
      raceId: "race-1",
      day: 42,
      checkpoints: [],
      winner: "h1",
      finalPositions: [{ horseId: "h1", position: 1, time: 60 }],
      trackId: "track-1",
      distance: 1400,
    };
    vi.mocked(useGameWithShallow).mockReturnValue(replay);

    render(<ReplayPlayer raceId="race-1" />);

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/1,400m/i)).toBeInTheDocument();
  });

  it("shows final positions table when replay has results", () => {
    const replay: RaceReplay = {
      id: "replay-1",
      raceId: "race-1",
      day: 10,
      checkpoints: [],
      winner: "h1",
      finalPositions: [
        { horseId: "h1", position: 1, time: 60.5 },
        { horseId: "h2", position: 2, time: 62.3 },
      ],
      trackId: "track-1",
      distance: 1200,
    };
    vi.mocked(useGameWithShallow).mockReturnValue(replay);

    render(<ReplayPlayer raceId="race-1" />);

    expect(screen.getByText("60.50s")).toBeInTheDocument();
    expect(screen.getByText("62.30s")).toBeInTheDocument();
  });
});
