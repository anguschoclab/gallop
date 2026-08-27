import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TacticalAnalysisPanel } from "@/components/race/TacticalAnalysisPanel";
import type { RaceRunner } from "@/core/race/types";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

function createMockRunner(overrides: Partial<RaceRunner> = {}): RaceRunner {
  return {
    horseId: "h1",
    name: "Thunder Bolt",
    silk: "red",
    ownership: makeUnowned(),
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

describe("TacticalAnalysisPanel", () => {
  it("renders panel title", () => {
    const runners = [createMockRunner()];
    render(<TacticalAnalysisPanel runners={runners} />);
    expect(screen.getByText(/tactical analysis/i)).toBeInTheDocument();
  });

  it("renders each runner name", () => {
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

  it("renders running style badge for runners with style", () => {
    const runners = [createMockRunner({ runningStyle: "E" })];
    render(<TacticalAnalysisPanel runners={runners} />);
    expect(screen.getByText("E")).toBeInTheDocument();
  });

  it("renders aggressiveness bar for runners with instructions", () => {
    const runners = [
      createMockRunner({
        jockeyInstructions: { aggressiveness: 0.8 },
      }),
    ];
    render(<TacticalAnalysisPanel runners={runners} />);
    expect(screen.getAllByText(/aggressiveness/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders fallback for runners without instructions", () => {
    const runners = [createMockRunner({ jockeyInstructions: undefined, horseId: "h2" })];
    render(<TacticalAnalysisPanel runners={runners} />);
    expect(screen.getByText(/no tactical instructions/i)).toBeInTheDocument();
  });

  it("renders jockey name for each runner", () => {
    const runners = [createMockRunner({ jockeyName: "Frankie Dettori" })];
    render(<TacticalAnalysisPanel runners={runners} />);
    expect(screen.getByText("Frankie Dettori")).toBeInTheDocument();
  });

  it("highlights player-owned runners", () => {
    const runners = [createMockRunner({ ownership: makePlayerOwned(), horseId: "h-owned" })];
    render(<TacticalAnalysisPanel runners={runners} />);
    const breakdown = screen.getByTestId("strategy-breakdown");
    expect(breakdown.className).toContain("border-l-gold");
  });
});
