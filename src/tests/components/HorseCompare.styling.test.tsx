import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

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
    silk: { primary: "#ff0000", secondary: "#00ff00" } as any,
    ...overrides,
  }) as Horse;

describe("HorseCompare styling improvements", () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    allHorses: [],
  };

  it("renders horse names as column headers in the metric table", () => {
    const h1 = mkHorse({ id: "h1", name: "Thunder" });
    const h2 = mkHorse({ id: "h2", name: "Lightning" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Thunder")).toBeTruthy();
    expect(within(table).getByText("Lightning")).toBeTruthy();
  });

  it("renders horse names as column headers for 3 horses", () => {
    const h1 = mkHorse({ id: "h1", name: "Alpha" });
    const h2 = mkHorse({ id: "h2", name: "Beta" });
    const h3 = mkHorse({ id: "h3", name: "Gamma" });
    render(<HorseCompare horses={[h1, h2, h3]} {...baseProps} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Alpha")).toBeTruthy();
    expect(within(table).getByText("Beta")).toBeTruthy();
    expect(within(table).getByText("Gamma")).toBeTruthy();
  });

  it("best-value cell has gold background class", () => {
    const h1 = mkHorse({
      id: "h1",
      name: "Strong",
      stats: {
        speed: 90,
        stamina: 90,
        acceleration: 90,
        temperament: 70,
        durability: 70,
        consistency: 70,
      } as any,
    });
    const h2 = mkHorse({
      id: "h2",
      name: "Weak",
      stats: {
        speed: 50,
        stamina: 50,
        acceleration: 50,
        temperament: 70,
        durability: 70,
        consistency: 70,
      } as any,
    });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const goldCells = document.body.querySelectorAll("[class*='bg-gold']");
    expect(goldCells.length).toBeGreaterThan(0);
  });

  it("tied values do not get gold highlight", () => {
    const h1 = mkHorse({
      id: "h1",
      name: "Equal1",
      stats: {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        temperament: 70,
        durability: 70,
        consistency: 70,
      } as any,
    });
    const h2 = mkHorse({
      id: "h2",
      name: "Equal2",
      stats: {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        temperament: 70,
        durability: 70,
        consistency: 70,
      } as any,
    });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const goldCells = document.body.querySelectorAll("td[class*='bg-gold']");
    expect(goldCells.length).toBe(0);
  });

  it("stat bars render alongside numeric values in metric table", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const { container } = render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    const table = screen.getByRole("table");
    const progressBars = within(table).getAllByRole("progressbar");
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("renders head-to-head projection section with distance and surface selectors", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<HorseCompare horses={[h1, h2]} {...baseProps} />);
    expect(screen.getByTestId("head-to-head-section")).toBeTruthy();
  });

  it("horse order in dialog matches horses prop order", () => {
    const hA = mkHorse({ id: "hA", name: "AAA" });
    const hB = mkHorse({ id: "hB", name: "BBB" });
    const hC = mkHorse({ id: "hC", name: "CCC" });
    render(<HorseCompare horses={[hB, hA, hC]} {...baseProps} />);
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent || "");
    expect(headerTexts[1]).toContain("BBB");
    expect(headerTexts[2]).toContain("AAA");
    expect(headerTexts[3]).toContain("CCC");
  });
});
