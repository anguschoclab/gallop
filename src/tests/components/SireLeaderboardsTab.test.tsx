import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { SireLeaderboardsTab } from "@/components/breeding/SireLeaderboardsTab";

// Mock Select to avoid Radix portal complexity
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

const mockSireRanking = (overrides: any = {}) => ({
  stallionId: "s1",
  stallionName: "Thunder",
  rank: 1,
  value: 95.5,
  metrics: {
    aei: 2.5,
    ci: 3.0,
    classification: "elite",
    surfaceBias: 0,
    distancePreference: "middle",
    progenyWinPercentage: 0.3,
    lifetimeFoals: 50,
    lifetimeStakesFoals: 10,
    lifetimeG1Foals: 3,
    standingFee: 50000,
  },
  ...overrides,
});

const mockLeaderboard = (rankings: any[] = []) => ({
  title: "Overall Sire Rankings",
  description: "All-around sire performance",
  type: "overall" as const,
  rankings,
});

describe("SireLeaderboardsTab", () => {
  it("renders skeleton when sireLeaderboards is null", () => {
    const state = createDefaultGameState();
    seedStore({ ...state, sireLeaderboards: undefined });
    const { container } = render(<SireLeaderboardsTab />);
    // Skeleton renders rows with w-8 class
    const rankBlocks = container.querySelectorAll(".w-8");
    expect(rankBlocks.length).toBe(5);
  });

  it("renders LeaderboardEmpty when leaderboard has empty rankings", () => {
    const state = createDefaultGameState();
    seedStore({
      ...state,
      sireLeaderboards: {
        overall: mockLeaderboard([]),
      } as any,
    });
    render(<SireLeaderboardsTab />);
    expect(screen.getByText("No rankings available yet.")).toBeTruthy();
  });

  it("renders LeaderboardRow for each ranking when data exists", () => {
    const state = createDefaultGameState();
    seedStore({
      ...state,
      sireLeaderboards: {
        overall: mockLeaderboard([
          mockSireRanking({ stallionId: "s1", stallionName: "Thunder", rank: 1 }),
          mockSireRanking({ stallionId: "s2", stallionName: "Lightning", rank: 2 }),
        ]),
      } as any,
    });
    render(<SireLeaderboardsTab />);
    expect(screen.getByText("Thunder")).toBeTruthy();
    expect(screen.getByText("Lightning")).toBeTruthy();
  });

  it("renders ControlsBar with sort options", () => {
    const state = createDefaultGameState();
    seedStore({
      ...state,
      sireLeaderboards: {
        overall: mockLeaderboard([mockSireRanking()]),
      } as any,
    });
    render(<SireLeaderboardsTab />);
    // "Score" appears as both a sort option and the valueLabel
    expect(screen.getAllByText("Score").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("AEI")).toBeTruthy();
    expect(screen.getByText("CI")).toBeTruthy();
  });

  it("TabsList has overflow-x-auto for mobile scroll", () => {
    const state = createDefaultGameState();
    seedStore({
      ...state,
      sireLeaderboards: {
        overall: mockLeaderboard([mockSireRanking()]),
      } as any,
    });
    const { container } = render(<SireLeaderboardsTab />);
    const tabsList = container.querySelector('[role="tablist"]');
    expect(tabsList?.className).toContain("overflow-x-auto");
  });
});
