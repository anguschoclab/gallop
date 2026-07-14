import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/core/race/headToHead", () => ({
  calculateHeadToHeadOdds: vi.fn(() => [
    { horseId: "h1", winPct: 0.6, projectedBeyer: 85, projectedFinishTime: 95 },
    { horseId: "h2", winPct: 0.4, projectedBeyer: 78, projectedFinishTime: 98 },
  ]),
  runHeadToHeadSimulation: vi.fn(() => [
    { horseId: "h1", winPct: 0.58, avgFinishPosition: 1.4, avgFinishTime: 96, beyerRange: [80, 90], finishTimeRange: [93, 99] },
    { horseId: "h2", winPct: 0.42, avgFinishPosition: 1.6, avgFinishTime: 97, beyerRange: [73, 83], finishTimeRange: [94, 100] },
  ]),
}));

import { HorseCompare } from "@/components/horse/HorseCompare";
import type { Horse } from "@/game/types";

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
    stats: { speed: 70, stamina: 70, acceleration: 70, temperament: 70, durability: 70, consistency: 70 } as any,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    distanceAptitude: 1600,
    raceHistory: [],
    owned: true,
    silk: { primary: "#ff0000", secondary: "#00ff00" } as any,
    ...overrides,
  }) as Horse;

describe("HorseCompare responsive layout", () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    allHorses: [],
  };

  function getDialogContent() {
    return document.querySelector("[role='dialog']") as HTMLElement;
  }

  it("DialogContent has w-[95vw] class for mobile width", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const dialog = getDialogContent();
    expect(dialog).toBeTruthy();
    expect(dialog.className).toContain("w-[95vw]");
  });

  it("header row grid has responsive breakpoint for 2 horses", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const dialog = getDialogContent();
    const headerGrid = dialog.querySelector(".grid.border-b");
    expect(headerGrid).toBeTruthy();
    expect(headerGrid!.className).toContain("grid-cols-1");
    expect(headerGrid!.className).toContain("sm:grid-cols-[1fr_1fr]");
  });

  it("header row grid has responsive breakpoint for 3 horses", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const h3 = mkHorse({ id: "h3" });
    render(<HorseCompare horses={[h1, h2, h3]} {...baseProps} />);
    const dialog = getDialogContent();
    const headerGrid = dialog.querySelector(".grid.border-b");
    expect(headerGrid).toBeTruthy();
    expect(headerGrid!.className).toContain("grid-cols-1");
    expect(headerGrid!.className).toContain("sm:grid-cols-[1fr_1fr_1fr]");
  });

  it("horse name spans have truncate class", () => {
    const h1 = mkHorse({ id: "h1", name: "Thunder" });
    const h2 = mkHorse({ id: "h2", name: "Lightning" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const dialog = getDialogContent();
    const headerGrid = dialog.querySelector(".grid.border-b");
    const nameSpans = headerGrid!.querySelectorAll("span.font-bold");
    expect(nameSpans.length).toBeGreaterThanOrEqual(2);
    nameSpans.forEach((span) => {
      expect(span.className).toContain("truncate");
    });
  });

  it("horse name container divs have min-w-0 class", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const dialog = getDialogContent();
    const headerGrid = dialog.querySelector(".grid.border-b");
    const columnDivs = headerGrid!.querySelectorAll(".space-y-1");
    expect(columnDivs.length).toBeGreaterThanOrEqual(2);
    columnDivs.forEach((div) => {
      expect(div.className).toContain("min-w-0");
    });
  });

  it("metric table wrapper has overflow-x-auto class", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const dialog = getDialogContent();
    const tableWrapper = dialog.querySelector(".rounded.border");
    expect(tableWrapper).toBeTruthy();
    expect(tableWrapper!.className).toContain("overflow-x-auto");
  });

  it("metric label th has responsive width", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const table = screen.getByRole("table");
    const ths = table.querySelectorAll("th");
    const metricTh = ths[0];
    expect(metricTh.className).toContain("w-28");
    expect(metricTh.className).toContain("sm:w-40");
  });

  it("surface aptitude grid has responsive breakpoints", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const dialog = getDialogContent();
    const grids = dialog.querySelectorAll(".grid");
    const surfaceGrid = Array.from(grids).find((g) =>
      g.className.includes("grid-cols-1") && g.className.includes("sm:grid-cols-2") && g.querySelector(".text-xs.font-medium"),
    );
    expect(surfaceGrid).toBeTruthy();
    expect(surfaceGrid!.className).toContain("grid-cols-1");
    expect(surfaceGrid!.className).toContain("sm:grid-cols-2");
  });

  it("stats grid has responsive breakpoints", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const dialog = getDialogContent();
    // The Stats section has an h4 with "Stats" text, followed by the grid
    const headings = dialog.querySelectorAll("h4");
    const statsHeading = Array.from(headings).find((h) => h.textContent?.includes("Stats"));
    expect(statsHeading).toBeTruthy();
    const statsGrid = statsHeading!.nextElementSibling;
    expect(statsGrid).toBeTruthy();
    expect(statsGrid!.className).toContain("grid-cols-1");
    expect(statsGrid!.className).toContain("sm:grid-cols-2");
  });

  it("head-to-head odds grid has responsive breakpoints", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const h2h = screen.getByTestId("head-to-head-section");
    const grids = h2h.querySelectorAll(".grid");
    const oddsGrid = Array.from(grids).find((g) => g.textContent?.includes("Win %"));
    expect(oddsGrid).toBeTruthy();
    expect(oddsGrid!.className).toContain("grid-cols-1");
    expect(oddsGrid!.className).toContain("sm:grid-cols-2");
  });

  it("head-to-head sim results grid has responsive breakpoints", async () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const h2h = screen.getByTestId("head-to-head-section");
    // The sim results grid only renders after clicking "Run Simulation"
    const runButton = h2h.querySelector("button");
    expect(runButton).toBeTruthy();
    fireEvent.click(runButton!);
    // After sim runs (async via setTimeout), the sim results grid should appear
    await waitFor(() => {
      const grids = h2h.querySelectorAll(".grid");
      const simGrid = Array.from(grids).find((g) => g.textContent?.includes("Sim Win %"));
      expect(simGrid).toBeTruthy();
      expect(simGrid!.className).toContain("grid-cols-1");
      expect(simGrid!.className).toContain("sm:grid-cols-2");
    });
  });
});
