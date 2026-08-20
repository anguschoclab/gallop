import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RaceDecisionLog } from "@/components/race/RaceDecisionLog";
import type { RaceSnapshot, HorseSnapshot } from "@/core/race/engine/raceSnapshotTypes";

interface RunnerInfo {
  horseId: string;
  name: string;
  owned: boolean;
  runningStyle?: string;
}

function createMockSnapshots(): RaceSnapshot[] {
  return [
    {
      t: 0,
      horses: [
        { horseId: "h1", position: 0, lane: 1.0, velocity: 0 },
        { horseId: "h2", position: 0, lane: 3.0, velocity: 0 },
      ],
    },
    {
      t: 10,
      horses: [
        { horseId: "h1", position: 50, lane: 1.0, velocity: 15 },
        { horseId: "h2", position: 55, lane: 3.0, velocity: 16 },
      ],
    },
    {
      t: 20,
      horses: [
        { horseId: "h1", position: 120, lane: 2.5, velocity: 14 },
        { horseId: "h2", position: 130, lane: 3.0, velocity: 15 },
      ],
    },
    {
      t: 30,
      horses: [
        { horseId: "h1", position: 200, lane: 2.5, velocity: 13 },
        { horseId: "h2", position: 210, lane: 3.0, velocity: 12 },
      ],
    },
  ];
}

const runners: RunnerInfo[] = [
  { horseId: "h1", name: "Thunder", owned: true, runningStyle: "E" },
  { horseId: "h2", name: "Lightning", owned: false, runningStyle: "S" },
];

describe("RaceDecisionLog", () => {
  it("returns null when no snapshots provided", () => {
    const { container } = render(
      <RaceDecisionLog snapshots={[]} runners={runners} distance={1600} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders header with decision log title", () => {
    render(<RaceDecisionLog snapshots={createMockSnapshots()} runners={runners} distance={1600} />);
    expect(screen.getByText(/decision log/i)).toBeInTheDocument();
  });

  it("detects lane change events", () => {
    render(<RaceDecisionLog snapshots={createMockSnapshots()} runners={runners} distance={1600} />);
    expect(screen.getByText(/lane change/i)).toBeInTheDocument();
  });

  it("detects pace sensing events (velocity changes)", () => {
    render(<RaceDecisionLog snapshots={createMockSnapshots()} runners={runners} distance={1600} />);
    expect(screen.getByText(/pace sensing|velocity change|speed shift/i)).toBeInTheDocument();
  });

  it("shows runner names in decision entries", () => {
    render(<RaceDecisionLog snapshots={createMockSnapshots()} runners={runners} distance={1600} />);
    expect(screen.getByText("Thunder")).toBeInTheDocument();
  });

  it("highlights player-owned runner decisions", () => {
    const { container } = render(
      <RaceDecisionLog snapshots={createMockSnapshots()} runners={runners} distance={1600} />,
    );
    const ownedElements = container.querySelectorAll(".border-l-gold");
    expect(ownedElements.length).toBeGreaterThan(0);
  });

  it("detects drafting positions", () => {
    const draftingSnapshots: RaceSnapshot[] = [
      {
        t: 10,
        horses: [
          { horseId: "h1", position: 100, lane: 1.0, velocity: 15 },
          { horseId: "h2", position: 103, lane: 1.0, velocity: 15 },
        ],
      },
      {
        t: 20,
        horses: [
          { horseId: "h1", position: 200, lane: 1.0, velocity: 15 },
          { horseId: "h2", position: 203, lane: 1.0, velocity: 15 },
        ],
      },
    ];
    render(<RaceDecisionLog snapshots={draftingSnapshots} runners={runners} distance={1600} />);
    expect(screen.getAllByText(/draft/i).length).toBeGreaterThan(0);
  });
});
