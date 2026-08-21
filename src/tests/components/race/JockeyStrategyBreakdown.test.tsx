import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JockeyStrategyBreakdown } from "@/components/race/JockeyStrategyBreakdown";
import { TacticalAnalysisPanel } from "@/components/race/TacticalAnalysisPanel";
import type { RaceRunner } from "@/core/race/types";

function createMockRunner(overrides: Partial<RaceRunner> = {}): RaceRunner {
  return {
    horseId: "h1",
    name: "Thunder Bolt",
    silk: "red",
    ownership: { type: "unowned" },
    jockeyId: "j1",
    jockeyName: "Mike Smith",
    gate: 1,
    lane: 0,
    runningStyle: "S",
    jockeyInstructions: {
      ridingStyle: "closer",
      earlyPosition: "midpack",
      moveTiming: "late",
      aggressiveness: 0.7,
    },
    ...overrides,
  };
}

describe("JockeyStrategyBreakdown", () => {
  it("renders runner name", () => {
    const runner = createMockRunner();
    render(<JockeyStrategyBreakdown runner={runner} />);
    expect(screen.getByText("Thunder Bolt")).toBeInTheDocument();
  });

  it("renders jockey name", () => {
    const runner = createMockRunner();
    render(<JockeyStrategyBreakdown runner={runner} />);
    expect(screen.getByText("Mike Smith")).toBeInTheDocument();
  });

  it("renders running style", () => {
    const runner = createMockRunner();
    render(<JockeyStrategyBreakdown runner={runner} />);
    expect(screen.getByText(/running style/i)).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders riding style from instructions", () => {
    const runner = createMockRunner();
    render(<JockeyStrategyBreakdown runner={runner} />);
    expect(screen.getAllByText(/closer/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders aggressiveness bar", () => {
    const runner = createMockRunner();
    render(<JockeyStrategyBreakdown runner={runner} />);
    expect(screen.getAllByText(/aggressiveness/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders explanation text", () => {
    const runner = createMockRunner();
    render(<JockeyStrategyBreakdown runner={runner} />);
    expect(screen.getByText(/approach/i)).toBeInTheDocument();
  });

  it("renders fallback when no instructions", () => {
    const runner = createMockRunner({ jockeyInstructions: undefined });
    render(<JockeyStrategyBreakdown runner={runner} />);
    expect(screen.getByText(/no tactical instructions/i)).toBeInTheDocument();
  });
});

describe("TacticalAnalysisPanel", () => {
  it("renders panel title", () => {
    const runners = [createMockRunner()];
    render(<TacticalAnalysisPanel runners={runners} />);
    expect(screen.getByText(/tactical analysis/i)).toBeInTheDocument();
  });

  it("renders each runner", () => {
    const runners = [
      createMockRunner({ name: "Horse A", horseId: "h1" }),
      createMockRunner({ name: "Horse B", horseId: "h2" }),
    ];
    render(<TacticalAnalysisPanel runners={runners} />);
    expect(screen.getByText("Horse A")).toBeInTheDocument();
    expect(screen.getByText("Horse B")).toBeInTheDocument();
  });

  it("renders empty state when no runners", () => {
    render(<TacticalAnalysisPanel runners={[]} />);
    expect(screen.getByText(/no tactical data/i)).toBeInTheDocument();
  });
});
