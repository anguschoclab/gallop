import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AreaTrend } from "@/components/charts";

vi.mock("@/components/charts", () => ({
  AreaTrend: vi.fn(() => null),
  formatCurrencyCompact: (n: number) => `$${n.toLocaleString()}`,
}));

import { EntityDetailPanel } from "@/components/dashboard/EntityDetailPanel";
import type { RegionRunRow } from "@/core/analytics/regionalTrends";

const makeRun = (
  horseId: string,
  jockeyId: string,
  day: number,
  position: number,
  earned: number,
  isG1 = false,
): RegionRunRow => ({
  horseId,
  horseName: `Horse ${horseId}`,
  entry: {
    raceId: `r-${day}`,
    raceName: `Race Day ${day}`,
    position,
    day,
    purseEarned: earned,
    grade: isG1 ? "G1" : "G2",
    jockeyId,
    stableId: "player",
  },
  region: "usa",
  isG1,
});

const lookups = {
  jockeyNames: new Map([["j1", "Jockey One"]]),
  stableNames: new Map([["player", "My Stable"]]),
  trainerByStable: new Map<string, { id: string; name: string }>([
    ["player", { id: "t1", name: "Trainer One" }],
  ]),
};

describe("EntityDetailPanel", () => {
  it("renders runs log with race name, day, and position", () => {
    const runs = [
      makeRun("h1", "j1", 100, 1, 50000, true),
      makeRun("h1", "j1", 95, 3, 10000),
    ];
    render(
      <EntityDetailPanel
        entityId="j1"
        kind="jockeys"
        runsA={runs}
        lookups={lookups}
        day={100}
        weeks={4}
      />,
    );
    expect(screen.getByText(/Race Day 100/)).toBeDefined();
    expect(screen.getByText(/Race Day 95/)).toBeDefined();
  });

  it("filters runs to only those matching entityId and kind", () => {
    const runs = [
      makeRun("h1", "j1", 100, 1, 50000),
      makeRun("h2", "j2", 99, 2, 20000),
    ];
    render(
      <EntityDetailPanel
        entityId="j1"
        kind="jockeys"
        runsA={runs}
        lookups={lookups}
        day={100}
        weeks={4}
      />,
    );
    expect(screen.getByText(/Race Day 100/)).toBeDefined();
    expect(screen.queryByText(/Race Day 99/)).toBeNull();
  });

  it("shows summary line with starts, wins, top-3, and earnings", () => {
    const runs = [
      makeRun("h1", "j1", 100, 1, 50000),
      makeRun("h1", "j1", 95, 3, 10000),
    ];
    render(
      <EntityDetailPanel
        entityId="j1"
        kind="jockeys"
        runsA={runs}
        lookups={lookups}
        day={100}
        weeks={4}
      />,
    );
    expect(screen.getByText(/2 starts/)).toBeDefined();
    expect(screen.getByText(/1 wins/)).toBeDefined();
    expect(screen.getByText(/2 top-3/)).toBeDefined();
  });

  it("renders AreaTrend chart for weekly earnings", () => {
    const runs = [makeRun("h1", "j1", 100, 1, 50000)];
    render(
      <EntityDetailPanel
        entityId="j1"
        kind="jockeys"
        runsA={runs}
        lookups={lookups}
        day={100}
        weeks={4}
      />,
    );
    expect(AreaTrend).toHaveBeenCalled();
  });

  it("shows window B runs with B badge in compare mode", () => {
    const runsA = [makeRun("h1", "j1", 100, 1, 50000)];
    const runsB = [makeRun("h1", "j1", 80, 2, 20000)];
    const { container } = render(
      <EntityDetailPanel
        entityId="j1"
        kind="jockeys"
        runsA={runsA}
        runsB={runsB}
        lookups={lookups}
        day={100}
        weeks={4}
        weeksB={8}
      />,
    );
    expect(screen.getByText(/Race Day 80/)).toBeDefined();
    expect(container.textContent).toContain("B");
  });

  it("shows empty state when no runs match the entity", () => {
    render(
      <EntityDetailPanel
        entityId="j99"
        kind="jockeys"
        runsA={[makeRun("h1", "j1", 100, 1, 50000)]}
        lookups={lookups}
        day={100}
        weeks={4}
      />,
    );
    expect(screen.getByText(/No runs/)).toBeDefined();
  });
});
