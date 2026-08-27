import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/core/race/headToHead", () => ({
  calculateHeadToHeadOdds: vi.fn(() => [
    { horseId: "h1", winPct: 0.6, projectedBeyer: 85, projectedFinishTime: 95 },
    { horseId: "h2", winPct: 0.4, projectedBeyer: 78, projectedFinishTime: 98 },
  ]),
  runHeadToHeadSimulation: vi.fn(() => [
    {
      horseId: "h1",
      winPct: 0.58,
      avgFinishPosition: 1.4,
      avgFinishTime: 96,
      beyerRange: [80, 90],
      finishTimeRange: [93, 99],
    },
    {
      horseId: "h2",
      winPct: 0.42,
      avgFinishPosition: 1.6,
      avgFinishTime: 97,
      beyerRange: [73, 83],
      finishTimeRange: [94, 100],
    },
  ]),
}));

import { HeadToHeadSection } from "@/components/horse/HeadToHeadSection";
import type { Horse } from "@/game/types";
import { makePlayerOwned } from "@/core/horse/ownership";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    energy: 80,
    peakingIndex: 0,
    form: 50,
    potential: 75,
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
    ownership: makePlayerOwned(),
    silk: { primary: "#ff0000", secondary: "#00ff00" } as any,
    ...overrides,
  }) as unknown as Horse;

describe("HeadToHeadSection", () => {
  it("renders with data-testid head-to-head-section", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HeadToHeadSection horses={[h1, h2]} />);
    expect(screen.getByTestId("head-to-head-section")).toBeTruthy();
  });

  it("renders distance and surface selectors", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HeadToHeadSection horses={[h1, h2]} />);
    expect(screen.getByText("Distance")).toBeTruthy();
    expect(screen.getByText("Surface")).toBeTruthy();
  });

  it("renders odds grid with Win %", () => {
    const h1 = mkHorse({ id: "h1", name: "Thunder" });
    const h2 = mkHorse({ id: "h2", name: "Lightning" });
    render(<HeadToHeadSection horses={[h1, h2]} />);
    expect(screen.getAllByText("Win %").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Run Simulation (50×) button", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HeadToHeadSection horses={[h1, h2]} />);
    expect(screen.getByText("Run Simulation (50×)")).toBeTruthy();
  });

  it("clicking Run Simulation shows sim results", async () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HeadToHeadSection horses={[h1, h2]} />);
    const runButton = screen.getByText("Run Simulation (50×)");
    fireEvent.click(runButton);
    await waitFor(() => {
      expect(screen.getAllByText("Sim Win %").length).toBeGreaterThanOrEqual(1);
    });
  });
});
