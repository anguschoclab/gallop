import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CompareMetricTable } from "@/components/horse/CompareMetricTable";
import type { Horse } from "@/game/types";
import type { RowData } from "@/hooks/horse/useHorseCompareRows";

vi.mock("@/components/SilkDot", () => ({
  SilkDot: ({ color }: { color: string }) => (
    <span data-testid="silk-dot" data-color={color} />
  ),
}));

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
      conformation: 70,
      consistency: 70,
    } as any,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    distanceAptitude: 1600,
    raceHistory: [],
    owned: true,
    silk: "#ff0000",
    ...overrides,
  }) as unknown as Horse;

describe("CompareMetricTable", () => {
  const sampleRows: RowData[] = [
    {
      label: "OVR",
      values: [90, 70],
      numeric: [90, 70],
      higherIsBetter: true,
      barValues: [90, 70],
    },
    {
      label: "Valuation",
      values: ["$90,000", "$70,000"],
      numeric: [90000, 70000],
      higherIsBetter: true,
    },
  ];

  it("renders table with metric column header", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<CompareMetricTable horses={[h1, h2]} rows={sampleRows} />);
    const table = screen.getByRole("table");
    const ths = table.querySelectorAll("th");
    const metricTh = ths[0];
    expect(metricTh.className).toContain("w-28");
    expect(metricTh.className).toContain("sm:w-40");
  });

  it("renders horse name in column headers", () => {
    const h1 = mkHorse({ id: "h1", name: "Alpha" });
    const h2 = mkHorse({ id: "h2", name: "Beta" });
    render(<CompareMetricTable horses={[h1, h2]} rows={sampleRows} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Alpha")).toBeTruthy();
    expect(within(table).getByText("Beta")).toBeTruthy();
  });

  it("highlights winner cell with gold class", () => {
    const h1 = mkHorse({ id: "h1", name: "Strong" });
    const h2 = mkHorse({ id: "h2", name: "Weak" });
    render(<CompareMetricTable horses={[h1, h2]} rows={sampleRows} />);
    const goldCells = document.body.querySelectorAll("td[class*='bg-gold']");
    expect(goldCells.length).toBeGreaterThan(0);
  });

  it("does not highlight when values are tied", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const tiedRows: RowData[] = [
      {
        label: "OVR",
        values: [70, 70],
        numeric: [70, 70],
        higherIsBetter: true,
        barValues: [70, 70],
      },
    ];
    render(<CompareMetricTable horses={[h1, h2]} rows={tiedRows} />);
    const goldCells = document.body.querySelectorAll("td[class*='bg-gold']");
    expect(goldCells.length).toBe(0);
  });

  it("renders progress bars for rows with barValues", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<CompareMetricTable horses={[h1, h2]} rows={sampleRows} />);
    const table = screen.getByRole("table");
    const progressBars = within(table).getAllByRole("progressbar");
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("does not render progress bars for rows without barValues", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const noBarRows: RowData[] = [
      {
        label: "Valuation",
        values: ["$90,000", "$70,000"],
        numeric: [90000, 70000],
        higherIsBetter: true,
      },
    ];
    render(<CompareMetricTable horses={[h1, h2]} rows={noBarRows} />);
    const table = screen.getByRole("table");
    const progressBars = within(table).queryAllByRole("progressbar");
    expect(progressBars.length).toBe(0);
  });
});
