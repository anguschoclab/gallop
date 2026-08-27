import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompareHeaderRow } from "@/components/horse/CompareHeaderRow";
import type { Horse } from "@/game/types";
import { makePlayerOwned } from "@/core/horse/ownership";

vi.mock("@/components/SilkDot", () => ({
  SilkDot: ({ color }: { color: string }) => <span data-testid="silk-dot" data-color={color} />,
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
    ownership: makePlayerOwned(),
    silk: "#ff0000",
    lifecycleStatus: "active",
    ...overrides,
  }) as unknown as Horse;

describe("CompareHeaderRow", () => {
  it("renders silk + name for each horse", () => {
    const h1 = mkHorse({ id: "h1", name: "Alpha" });
    const h2 = mkHorse({ id: "h2", name: "Beta" });
    render(<CompareHeaderRow horses={[h1, h2]} />);
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getAllByTestId("silk-dot")).toHaveLength(2);
  });

  it("shows age/gender badge", () => {
    const h1 = mkHorse({ id: "h1", age: 5, gender: "mare" });
    const h2 = mkHorse({ id: "h2", age: 3, gender: "colt" });
    render(<CompareHeaderRow horses={[h1, h2]} />);
    expect(screen.getByText("5Y mare")).toBeTruthy();
    expect(screen.getByText("3Y colt")).toBeTruthy();
  });

  it("shows Injured badge when activeInjury", () => {
    const h1 = mkHorse({
      id: "h1",
      activeInjury: { type: "tendon", severity: "moderate", recoveryDays: 30, onsetDay: 1 } as any,
    });
    const h2 = mkHorse({ id: "h2" });
    render(<CompareHeaderRow horses={[h1, h2]} />);
    expect(screen.getByText("Injured")).toBeTruthy();
  });

  it("shows Retired badge when lifecycleStatus is 'retired'", () => {
    const h1 = mkHorse({ id: "h1", lifecycleStatus: "retired" });
    const h2 = mkHorse({ id: "h2" });
    render(<CompareHeaderRow horses={[h1, h2]} />);
    expect(screen.getByText("Retired")).toBeTruthy();
  });

  it("applies 2-column grid for 2 horses", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const { container } = render(<CompareHeaderRow horses={[h1, h2]} />);
    const grid = container.querySelector(".grid.border-b");
    expect(grid).toBeTruthy();
    expect(grid!.className).toContain("sm:grid-cols-[1fr_1fr]");
  });

  it("applies 3-column grid for 3 horses", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const h3 = mkHorse({ id: "h3" });
    const { container } = render(<CompareHeaderRow horses={[h1, h2, h3]} />);
    const grid = container.querySelector(".grid.border-b");
    expect(grid).toBeTruthy();
    expect(grid!.className).toContain("sm:grid-cols-[1fr_1fr_1fr]");
  });

  it("name spans have truncate class", () => {
    const h1 = mkHorse({ id: "h1", name: "Alpha" });
    const h2 = mkHorse({ id: "h2", name: "Beta" });
    const { container } = render(<CompareHeaderRow horses={[h1, h2]} />);
    const grid = container.querySelector(".grid.border-b");
    const nameSpans = grid!.querySelectorAll("span.font-bold");
    expect(nameSpans.length).toBeGreaterThanOrEqual(2);
    nameSpans.forEach((span) => {
      expect(span.className).toContain("truncate");
    });
  });

  it("column divs have min-w-0 class", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const { container } = render(<CompareHeaderRow horses={[h1, h2]} />);
    const grid = container.querySelector(".grid.border-b");
    const columnDivs = grid!.querySelectorAll(".space-y-1");
    expect(columnDivs.length).toBeGreaterThanOrEqual(2);
    columnDivs.forEach((div) => {
      expect(div.className).toContain("min-w-0");
    });
  });
});
