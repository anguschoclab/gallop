import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompareStatBars } from "@/components/horse/CompareStatBars";
import type { Horse } from "@/game/types";

vi.mock("@/components/horse/HorseBits", () => ({
  HorseStats: ({ horse }: { horse: Horse }) => (
    <div data-testid="horse-stats" data-horse-id={horse.id}>
      <span>Speed: {horse.stats.speed}</span>
    </div>
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

describe("CompareStatBars", () => {
  it("renders 'Stats' heading", () => {
    const h1 = mkHorse({ id: "h1" });
    render(<CompareStatBars horses={[h1]} />);
    expect(screen.getByText("Stats")).toBeTruthy();
  });

  it("renders HorseStats for each horse", () => {
    const h1 = mkHorse({ id: "h1", name: "Alpha" });
    const h2 = mkHorse({ id: "h2", name: "Beta" });
    render(<CompareStatBars horses={[h1, h2]} />);
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getAllByTestId("horse-stats")).toHaveLength(2);
  });
});
