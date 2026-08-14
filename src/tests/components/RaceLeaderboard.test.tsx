import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Leaderboard } from "@/components/race/Leaderboard";

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input data-testid="search-input" {...props} />,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({ value, onValueChange, ...props }: any) => (
    <input
      type="range"
      data-testid="slider"
      value={value?.[0] ?? 0}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/JargonTooltip", () => ({
  JargonTooltip: ({ children }: any) => <span>{children}</span>,
}));

const mockRunner = (overrides: any = {}) => ({
  r: {
    horseId: "h1",
    name: "Thunder",
    silk: "#ff0000",
    owned: false,
    finishTime: 72.5,
    ...overrides,
  },
  beyer: 95,
});

describe("Race Leaderboard", () => {
  it("renders LeaderboardEmpty when no runners match filters", () => {
    render(
      <Leaderboard
        sorted={[]}
        positionRank={new Map()}
        runnerOdds={new Map()}
        filter="all"
        sortBy="position"
        minBeyer={0}
        lastUpdatedAt={Date.now()}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
      />,
    );
    expect(screen.getByText("No runners match the current filters.")).toBeTruthy();
  });

  it("renders runner name and odds", () => {
    render(
      <Leaderboard
        sorted={[mockRunner()]}
        positionRank={new Map([["h1", 1]])}
        runnerOdds={new Map([["h1", "3/1"]])}
        filter="all"
        sortBy="position"
        minBeyer={0}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
      />,
    );
    expect(screen.getByText("Thunder")).toBeTruthy();
    expect(screen.getByText("3/1")).toBeTruthy();
  });

  it("renders ControlsBar with sort and filter options", () => {
    render(
      <Leaderboard
        sorted={[mockRunner()]}
        positionRank={new Map([["h1", 1]])}
        runnerOdds={new Map([["h1", "3/1"]])}
        filter="all"
        sortBy="position"
        minBeyer={0}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
      />,
    );
    expect(screen.getByText("Position")).toBeTruthy();
    expect(screen.getByText("Proj. Beyer")).toBeTruthy();
    expect(screen.getByText("All runners")).toBeTruthy();
  });

  it("calls onSortByChange when sort changes", () => {
    const onSortByChange = vi.fn();
    render(
      <Leaderboard
        sorted={[mockRunner()]}
        positionRank={new Map([["h1", 1]])}
        runnerOdds={new Map([["h1", "3/1"]])}
        filter="all"
        sortBy="position"
        minBeyer={0}
        onFilterChange={() => {}}
        onSortByChange={onSortByChange}
        onMinBeyerChange={() => {}}
      />,
    );
    const selects = screen.getAllByTestId("select");
    fireEvent.change(selects[0], { target: { value: "beyer" } });
    expect(onSortByChange).toHaveBeenCalledWith("beyer");
  });

  it("renders a live freshness indicator with a pulsing dot", () => {
    render(
      <Leaderboard
        sorted={[mockRunner()]}
        positionRank={new Map([["h1", 1]])}
        runnerOdds={new Map([["h1", "3/1"]])}
        filter="all"
        sortBy="position"
        minBeyer={0}
        lastUpdatedAt={Date.now()}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
      />,
    );
    expect(screen.getByText(/Live/)).toBeTruthy();
    expect(document.querySelector("[class*='animate-ping']")).toBeTruthy();
  });
});
