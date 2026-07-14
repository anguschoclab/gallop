import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { DamsireLeaderboardTab } from "@/components/breeding/DamsireLeaderboardTab";

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

const mockDamsireLeaderboard = (rankings: any[] = []) => ({
  title: "Broodmare Sire Rankings",
  description: "Daughters' produce",
  type: "damsire_rankings" as const,
  rankings,
});

describe("DamsireLeaderboardTab", () => {
  it("renders skeleton when damsireLeaderboard is null", () => {
    const state = createDefaultGameState();
    seedStore({ ...state, damsireLeaderboard: undefined });
    const { container } = render(<DamsireLeaderboardTab />);
    expect(container.querySelectorAll(".w-8").length).toBe(5);
  });

  it("renders LeaderboardEmpty when rankings empty", () => {
    const state = createDefaultGameState();
    seedStore({
      ...state,
      damsireLeaderboard: mockDamsireLeaderboard([]) as any,
    });
    render(<DamsireLeaderboardTab />);
    expect(screen.getByText("No broodmare sire data available yet.")).toBeTruthy();
  });

  it("renders rows with correct name from DamsireRanking", () => {
    const state = createDefaultGameState();
    seedStore({
      ...state,
      damsireLeaderboard: mockDamsireLeaderboard([
        {
          damsireId: "d1",
          damsireName: "Storm Cat",
          rank: 1,
          value: 88.5,
          metrics: {
            daughtersBred: 20,
            totalFoals: 40,
            stakesFoals: 5,
            g1Foals: 2,
            totalEarnings: 5_000_000,
            avgEarningsPerFoal: 125000,
            blueHenScore: 60,
          },
        },
      ]) as any,
    });
    render(<DamsireLeaderboardTab />);
    expect(screen.getByText("Storm Cat")).toBeTruthy();
  });

  it("renders ControlsBar", () => {
    const state = createDefaultGameState();
    seedStore({
      ...state,
      damsireLeaderboard: mockDamsireLeaderboard([
        {
          damsireId: "d1",
          damsireName: "Storm Cat",
          rank: 1,
          value: 88.5,
          metrics: {
            daughtersBred: 20,
            totalFoals: 40,
            stakesFoals: 5,
            g1Foals: 2,
            totalEarnings: 5_000_000,
            avgEarningsPerFoal: 125000,
            blueHenScore: 60,
          },
        },
      ]) as any,
    });
    render(<DamsireLeaderboardTab />);
    expect(screen.getByText("Stakes Foals")).toBeTruthy();
    expect(screen.getByText("Daughters Bred")).toBeTruthy();
  });
});
