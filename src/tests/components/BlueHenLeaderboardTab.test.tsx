import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { BlueHenLeaderboardTab } from "@/components/breeding/BlueHenLeaderboardTab";

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

const mockBlueHenLeaderboard = (rankings: any[] = []) => ({
  title: "Blue Hen Mare Rankings",
  description: "Broodmare produce record",
  type: "blue_hen" as const,
  rankings,
});

describe("BlueHenLeaderboardTab", () => {
  it("renders skeleton when blueHenLeaderboard is null", () => {
    const state = createDefaultGameState();
    seedStore({ ...state, blueHenLeaderboard: undefined });
    const { container } = render(<BlueHenLeaderboardTab />);
    expect(container.querySelectorAll(".w-8").length).toBe(5);
  });

  it("renders LeaderboardEmpty when rankings empty", () => {
    const state = createDefaultGameState();
    seedStore({
      ...state,
      blueHenLeaderboard: mockBlueHenLeaderboard([]) as any,
    });
    render(<BlueHenLeaderboardTab />);
    expect(screen.getByText("No broodmare data available yet.")).toBeTruthy();
  });

  it("renders Blue Hen badge for isBlueHen mares", () => {
    const state = createDefaultGameState();
    seedStore({
      ...state,
      blueHenLeaderboard: mockBlueHenLeaderboard([
        {
          mareId: "m1",
          mareName: "Special Mare",
          rank: 1,
          value: 92.0,
          metrics: {
            foalsProduced: 10,
            stakesWinnersProduced: 3,
            g1WinnersProduced: 1,
            totalFoalEarnings: 3_000_000,
            avgFoalEarnings: 300000,
            blueHenScore: 80,
            isBlueHen: true,
          },
        },
      ]) as any,
    });
    render(<BlueHenLeaderboardTab />);
    expect(screen.getByText("Special Mare")).toBeTruthy();
    expect(screen.getByText("Blue Hen")).toBeTruthy();
  });

  it("renders ControlsBar", () => {
    const state = createDefaultGameState();
    seedStore({
      ...state,
      blueHenLeaderboard: mockBlueHenLeaderboard([
        {
          mareId: "m1",
          mareName: "Special Mare",
          rank: 1,
          value: 92.0,
          metrics: {
            foalsProduced: 10,
            stakesWinnersProduced: 3,
            g1WinnersProduced: 1,
            totalFoalEarnings: 3_000_000,
            avgFoalEarnings: 300000,
            blueHenScore: 80,
            isBlueHen: true,
          },
        },
      ]) as any,
    });
    render(<BlueHenLeaderboardTab />);
    expect(screen.getByText("Foals Produced")).toBeTruthy();
    expect(screen.getByText("Blue Hen Only")).toBeTruthy();
  });
});
