/**
 * InRunningSnapshotDialog.test.tsx
 *
 * Tests for the InRunningSnapshotDialog component verifying:
 * - Rendering dialog title, frozen timestamp, and live simulation progress indicator
 * - Field overview with runner rankings, silks, tactical badges, and condition badges
 * - Interactive runner selection and detailed condition cards display
 * - Multi-snapshot tab switching
 * - Clear snapshots and close actions
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InRunningSnapshotDialog } from "@/components/race/InRunningSnapshotDialog";
import type { InRunningSnapshot } from "@/hooks/race/useInRunningSnapshots";

function createMockSnapshot(overrides: Partial<InRunningSnapshot> = {}): InRunningSnapshot {
  return {
    id: "snap-1",
    simTime: 14.5,
    tick: 29,
    capturedAt: new Date("2026-08-14T17:00:00Z").getTime(),
    distance: 1600,
    leaderPos: 650,
    runners: [
      {
        horseId: "h1",
        name: "Thunderbolt",
        position: 650,
        velocity: 16.8,
        lane: 0,
        gate: 1,
        silk: "#ff0000",
        owned: true,
        finishTime: null,
        rank: 1,
        conditions: [
          {
            id: "flying",
            label: "Flying",
            tone: "positive",
            detail: "Travelling well clear of the field average and still on the bridle.",
            emphatic: true,
          },
        ],
        mood: {
          score: 85,
          face: "happy",
          label: "Happy",
          signals: [{ label: "Handy on the pace", contribution: 15 }],
        },
        tacticalBadge: "RAIL",
        distanceCoveredPct: 40.6,
      },
      {
        horseId: "h2",
        name: "Shadowfax",
        position: 630,
        velocity: 15.9,
        lane: 1,
        gate: 2,
        silk: "#0000ff",
        owned: false,
        finishTime: null,
        rank: 2,
        conditions: [
          {
            id: "battling",
            label: "Battling",
            tone: "caution",
            detail: "Head-to-head with Thunderbolt — neither giving an inch.",
            emphatic: true,
          },
        ],
        mood: {
          score: 55,
          face: "neutral",
          label: "Coping",
          signals: [],
        },
        tacticalBadge: "SAVING",
        distanceCoveredPct: 39.4,
      },
    ],
    ...overrides,
  };
}

describe("InRunningSnapshotDialog", () => {
  it("renders frozen snapshot metadata and live race status indicator", () => {
    const snapshot = createMockSnapshot();
    render(
      <InRunningSnapshotDialog
        open={true}
        onOpenChange={vi.fn()}
        snapshots={[snapshot]}
        selectedSnapshot={snapshot}
        onSelectSnapshot={vi.fn()}
        onClearSnapshots={vi.fn()}
        currentSimTime={28.0}
      />,
    );

    expect(screen.getByText("In-Running Condition Snapshot")).toBeInTheDocument();
    expect(screen.getAllByText("14.5s").length).toBeGreaterThan(0);
    expect(screen.getByText(/Live Race:/)).toBeInTheDocument();
    expect(screen.getByText("28.0s")).toBeInTheDocument();
    expect(screen.getByText("650m / 1600m (41%)")).toBeInTheDocument();
  });

  it("renders runner rankings and active condition badges in the field list", () => {
    const snapshot = createMockSnapshot();
    render(
      <InRunningSnapshotDialog
        open={true}
        onOpenChange={vi.fn()}
        snapshots={[snapshot]}
        selectedSnapshot={snapshot}
        onSelectSnapshot={vi.fn()}
        onClearSnapshots={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Thunderbolt").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Shadowfax").length).toBeGreaterThan(0);
    expect(screen.getAllByText("RAIL").length).toBeGreaterThan(0);
    expect(screen.getByText("SAVING")).toBeInTheDocument();
    expect(screen.getAllByText("Flying").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Battling").length).toBeGreaterThan(0);
  });

  it("shows detailed condition descriptions for the inspected runner", () => {
    const snapshot = createMockSnapshot();
    render(
      <InRunningSnapshotDialog
        open={true}
        onOpenChange={vi.fn()}
        snapshots={[snapshot]}
        selectedSnapshot={snapshot}
        onSelectSnapshot={vi.fn()}
        onClearSnapshots={vi.fn()}
      />,
    );

    // Default inspected runner is Rank #1 (Thunderbolt)
    expect(
      screen.getByText("Travelling well clear of the field average and still on the bridle."),
    ).toBeInTheDocument();
    expect(screen.getByText("Handy on the pace")).toBeInTheDocument();

    // Select Rank #2 (Shadowfax)
    fireEvent.click(screen.getByText("Shadowfax"));

    expect(
      screen.getByText("Head-to-head with Thunderbolt — neither giving an inch."),
    ).toBeInTheDocument();
  });

  it("supports switching snapshots when multiple snapshots exist", () => {
    const snap1 = createMockSnapshot({ id: "snap-1", simTime: 10.0 });
    const snap2 = createMockSnapshot({ id: "snap-2", simTime: 20.0 });
    const onSelectSnapshot = vi.fn();

    render(
      <InRunningSnapshotDialog
        open={true}
        onOpenChange={vi.fn()}
        snapshots={[snap1, snap2]}
        selectedSnapshot={snap1}
        onSelectSnapshot={onSelectSnapshot}
        onClearSnapshots={vi.fn()}
      />,
    );

    const snap2Button = screen.getByText("#2 (20.0s)");
    expect(snap2Button).toBeInTheDocument();

    fireEvent.click(snap2Button);
    expect(onSelectSnapshot).toHaveBeenCalledWith("snap-2");
  });

  it("triggers onClearSnapshots and onOpenChange correctly", () => {
    const snapshot = createMockSnapshot();
    const onClearSnapshots = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <InRunningSnapshotDialog
        open={true}
        onOpenChange={onOpenChange}
        snapshots={[snapshot]}
        selectedSnapshot={snapshot}
        onSelectSnapshot={vi.fn()}
        onClearSnapshots={onClearSnapshots}
      />,
    );

    fireEvent.click(screen.getByText("Clear Snapshots"));
    expect(onClearSnapshots).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Close Inspector (Resume Viewing Live)"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
