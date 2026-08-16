import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaceMap } from "@/components/race/PaceMap";
import type { PaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";

function createMockPaceSnapshot(overrides: Partial<PaceSnapshot> = {}): PaceSnapshot {
  return {
    progress: 0.25,
    paceRating: 1.0,
    leaderVelocity: 16.5,
    leadGroupCount: 3,
    pacePressure: 0.5,
    leaderHorseId: "horse-1",
    ...overrides,
  };
}

describe("PaceMap", () => {
  it("renders empty state when no pace snapshots", () => {
    render(<PaceMap snapshots={[]} runners={[]} />);
    expect(screen.getByText(/no pace data/i)).toBeInTheDocument();
  });

  it("renders pace snapshot milestones", () => {
    const snapshots = [
      createMockPaceSnapshot({ progress: 0.25, paceRating: 1.1 }),
      createMockPaceSnapshot({ progress: 0.5, paceRating: 0.95 }),
      createMockPaceSnapshot({ progress: 0.75, paceRating: 0.85 }),
    ];
    render(<PaceMap snapshots={snapshots} runners={[]} />);
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("displays pace rating labels", () => {
    const snapshots = [
      createMockPaceSnapshot({ progress: 0.25, paceRating: 1.15 }),
      createMockPaceSnapshot({ progress: 0.5, paceRating: 0.9 }),
      createMockPaceSnapshot({ progress: 0.75, paceRating: 0.8 }),
    ];
    render(<PaceMap snapshots={snapshots} runners={[]} />);
    expect(screen.getByText(/fast/i)).toBeInTheDocument();
    expect(screen.getByText(/slow/i)).toBeInTheDocument();
  });

  it("shows leader horse name when available", () => {
    const snapshots = [createMockPaceSnapshot({ progress: 0.25, leaderHorseId: "horse-1" })];
    const runners = [{ horseId: "horse-1", name: "Thunder Bolt", silk: "red", owned: true }];
    render(<PaceMap snapshots={snapshots} runners={runners} />);
    expect(screen.getByText("Thunder Bolt")).toBeInTheDocument();
  });

  it("shows lead group count", () => {
    const snapshots = [createMockPaceSnapshot({ progress: 0.25, leadGroupCount: 4 })];
    render(<PaceMap snapshots={snapshots} runners={[]} />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
