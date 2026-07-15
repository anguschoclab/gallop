import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeaderboardTable } from "@/components/history/LeaderboardTable";

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

describe("LeaderboardTable", () => {
  it("renders skeleton when leaderboard is null", () => {
    const { container } = render(
      <LeaderboardTable leaderboard={null} icon={<span />} valueFormatter={(v) => v.toString()} />,
    );
    expect(container.querySelectorAll(".w-8").length).toBe(5);
  });

  it("renders LeaderboardEmpty when rankings empty", () => {
    render(
      <LeaderboardTable
        leaderboard={{ title: "Test", rankings: [] }}
        icon={<span />}
        valueFormatter={(v) => v.toString()}
      />,
    );
    expect(screen.getByText(/No records found yet/)).toBeTruthy();
  });

  it("renders LeaderboardRow for each ranking", () => {
    render(
      <LeaderboardTable
        leaderboard={{
          title: "Top Earnings",
          rankings: [
            {
              horseId: "h1",
              horseName: "Thunder",
              rank: 1,
              value: 500000,
              sireName: "Sire A",
              metrics: { age: 4, wins: 5, starts: 10 },
            },
            {
              horseId: "h2",
              horseName: "Lightning",
              rank: 2,
              value: 300000,
              sireName: "Sire B",
              metrics: { age: 3, wins: 3, starts: 8 },
            },
          ],
        }}
        icon={<span data-testid="icon" />}
        valueFormatter={(v) => `$${v}`}
        valueLabel="Earnings"
      />,
    );
    expect(screen.getByText("Thunder")).toBeTruthy();
    expect(screen.getByText("Lightning")).toBeTruthy();
  });

  it("renders ControlsBar with sort options", () => {
    render(
      <LeaderboardTable
        leaderboard={{
          title: "Top Earnings",
          rankings: [
            {
              horseId: "h1",
              horseName: "Thunder",
              rank: 1,
              value: 500000,
              sireName: "Sire A",
              metrics: { age: 4, wins: 5, starts: 10 },
            },
          ],
        }}
        icon={<span />}
        valueFormatter={(v) => v.toString()}
      />,
    );
    expect(screen.getByText("Rank")).toBeTruthy();
    expect(screen.getByText("Wins")).toBeTruthy();
  });
});
