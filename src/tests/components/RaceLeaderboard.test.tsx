import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Leaderboard } from "@/components/race/Leaderboard";
import { TIE_BREAK_HINT_TEXT } from "@/constants/raceBroadcastConstants";

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
        hasTies={false}
        tiedHorseIds={new Set()}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
        lastUpdatedAt={Date.now()}
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
        hasTies={false}
        tiedHorseIds={new Set()}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
        lastUpdatedAt={Date.now()}
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
        hasTies={false}
        tiedHorseIds={new Set()}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
        lastUpdatedAt={Date.now()}
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
        hasTies={false}
        tiedHorseIds={new Set()}
        onFilterChange={() => {}}
        onSortByChange={onSortByChange}
        onMinBeyerChange={() => {}}
        lastUpdatedAt={Date.now()}
      />,
    );
    const selects = screen.getAllByTestId("select");
    fireEvent.change(selects[0], { target: { value: "beyer" } });
    expect(onSortByChange).toHaveBeenCalledWith("beyer");
  });

  it("hides finish time on mobile (hidden sm:inline)", () => {
    const { container } = render(
      <Leaderboard
        sorted={[mockRunner()]}
        positionRank={new Map([["h1", 1]])}
        runnerOdds={new Map([["h1", "3/1"]])}
        filter="all"
        sortBy="position"
        minBeyer={0}
        hasTies={false}
        tiedHorseIds={new Set()}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
        lastUpdatedAt={Date.now()}
      />,
    );
    const finishTimeSpan = container.querySelector(".hidden.sm\\:inline");
    expect(finishTimeSpan).toBeTruthy();
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
        hasTies={false}
        tiedHorseIds={new Set()}
        lastUpdatedAt={Date.now()}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
      />,
    );
    expect(screen.getByText(/Live ·/)).toBeTruthy();
    expect(document.querySelector("[class*='animate-ping']")).toBeTruthy();
  });
});

describe("Race Leaderboard tie-break hint", () => {
  it("does not render hint text when hasTies is false", () => {
    render(
      <Leaderboard
        sorted={[mockRunner()]}
        positionRank={new Map([["h1", 1]])}
        runnerOdds={new Map([["h1", "3/1"]])}
        filter="all"
        sortBy="position"
        minBeyer={0}
        hasTies={false}
        tiedHorseIds={new Set()}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
      />,
    );
    expect(screen.queryByText(TIE_BREAK_HINT_TEXT)).toBeNull();
  });

  it("renders hint text when hasTies is true and sortBy is position", () => {
    render(
      <Leaderboard
        sorted={[mockRunner()]}
        positionRank={new Map([["h1", 1]])}
        runnerOdds={new Map([["h1", "3/1"]])}
        filter="all"
        sortBy="position"
        minBeyer={0}
        hasTies={true}
        tiedHorseIds={new Set(["h1"])}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
      />,
    );
    expect(screen.getByText(TIE_BREAK_HINT_TEXT)).toBeTruthy();
  });

  it("does not render hint text when hasTies is true but sortBy is beyer", () => {
    render(
      <Leaderboard
        sorted={[mockRunner()]}
        positionRank={new Map([["h1", 1]])}
        runnerOdds={new Map([["h1", "3/1"]])}
        filter="all"
        sortBy="beyer"
        minBeyer={0}
        hasTies={true}
        tiedHorseIds={new Set(["h1"])}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
      />,
    );
    expect(screen.queryByText(TIE_BREAK_HINT_TEXT)).toBeNull();
  });

  it("renders marker for tied rows", () => {
    const { container } = render(
      <Leaderboard
        sorted={[mockRunner()]}
        positionRank={new Map([["h1", 1]])}
        runnerOdds={new Map([["h1", "3/1"]])}
        filter="all"
        sortBy="position"
        minBeyer={0}
        hasTies={true}
        tiedHorseIds={new Set(["h1"])}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
      />,
    );
    const marker = container.querySelector('[data-testid="tie-marker"]');
    expect(marker).toBeTruthy();
  });

  it("does not render marker for non-tied rows", () => {
    const { container } = render(
      <Leaderboard
        sorted={[
          { r: { ...mockRunner().r, horseId: "h1" }, beyer: 95 },
          { r: { ...mockRunner().r, horseId: "h2", name: "Lightning" }, beyer: 90 },
        ]}
        positionRank={
          new Map([
            ["h1", 1],
            ["h2", 2],
          ])
        }
        runnerOdds={
          new Map([
            ["h1", "3/1"],
            ["h2", "5/1"],
          ])
        }
        filter="all"
        sortBy="position"
        minBeyer={0}
        hasTies={true}
        tiedHorseIds={new Set(["h2"])}
        onFilterChange={() => {}}
        onSortByChange={() => {}}
        onMinBeyerChange={() => {}}
      />,
    );
    const markers = container.querySelectorAll('[data-testid="tie-marker"]');
    expect(markers).toHaveLength(1);
  });
});
