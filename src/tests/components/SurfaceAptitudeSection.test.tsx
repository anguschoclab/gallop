import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SurfaceAptitudeSection } from "@/components/horse/SurfaceAptitudeSection";
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
      conformation: 70,
      consistency: 70,
    } as any,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    distanceAptitude: 1600,
    raceHistory: [],
    ownership: makePlayerOwned(),
    silk: "#ff0000",
    ...overrides,
  }) as unknown as Horse;

describe("SurfaceAptitudeSection", () => {
  it("renders 'Surface aptitude' heading", () => {
    const h1 = mkHorse({ id: "h1" });
    render(<SurfaceAptitudeSection horses={[h1]} />);
    expect(screen.getByText("Surface aptitude")).toBeTruthy();
  });

  it("renders 3 surface labels per horse", () => {
    const h1 = mkHorse({ id: "h1" });
    render(<SurfaceAptitudeSection horses={[h1]} />);
    expect(screen.getByText("Turf")).toBeTruthy();
    expect(screen.getByText("Dirt")).toBeTruthy();
    expect(screen.getByText("Synthetic")).toBeTruthy();
  });

  it("renders progress bar per surface per horse", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    render(<SurfaceAptitudeSection horses={[h1, h2]} />);
    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars.length).toBe(6);
  });

  it("rounds surface aptitude to percentage", () => {
    const h1 = mkHorse({
      id: "h1",
      surfaceAptitude: { Turf: 0.856, Dirt: 0.5, Synthetic: 0.333 },
    });
    render(<SurfaceAptitudeSection horses={[h1]} />);
    expect(screen.getByText("86%")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("33%")).toBeTruthy();
  });
});
