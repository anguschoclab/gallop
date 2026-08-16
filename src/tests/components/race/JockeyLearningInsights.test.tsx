import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { JockeyLearningInsights } from "@/components/race/JockeyLearningInsights";

vi.mock("@/lib/cn", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("JockeyLearningInsights", () => {
  const mockInsights = {
    totalRaces: 15,
    avgPosition: 3.2,
    styleUsage: { E: 5, EP: 3, P: 4, S: 3 },
    avgAggressiveness: 0.65,
  };

  it("renders nothing when insights is null", () => {
    const { container } = render(
      <JockeyLearningInsights insights={null} jockeyName="Test Jockey" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders jockey name and total races", () => {
    render(<JockeyLearningInsights insights={mockInsights} jockeyName="Frankie Dettori" />);
    expect(screen.getByText(/Frankie Dettori/)).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("displays average position", () => {
    render(<JockeyLearningInsights insights={mockInsights} jockeyName="Jockey" />);
    expect(screen.getByText(/3\.2/)).toBeInTheDocument();
  });

  it("displays style usage breakdown", () => {
    render(<JockeyLearningInsights insights={mockInsights} jockeyName="Jockey" />);
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.getByText("EP")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("displays aggressiveness bar", () => {
    render(<JockeyLearningInsights insights={mockInsights} jockeyName="Jockey" />);
    expect(screen.getByText(/65%/)).toBeInTheDocument();
  });

  it("handles zero races gracefully", () => {
    const emptyInsights = {
      totalRaces: 0,
      avgPosition: 5,
      styleUsage: { E: 0, EP: 0, P: 0, S: 0 },
      avgAggressiveness: 0.5,
    };
    render(<JockeyLearningInsights insights={emptyInsights} jockeyName="New Jockey" />);
    expect(screen.getByText(/New Jockey/)).toBeInTheDocument();
    expect(screen.getByText(/0 recorded/)).toBeInTheDocument();
  });
});
