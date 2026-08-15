import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JockeyStandingsTable } from "@/components/jockey/JockeyStandingsTable";
import type { Jockey } from "@/core/jockey/types";
import { createTestJockey } from "@/tests/helpers/createTestJockey";

vi.mock("@/components/leaderboard/LeaderboardPrimitives", () => ({
  LeaderboardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
  LeaderboardControlsBar: ({
    sortOptions,
    sortValue,
    onSortChange,
  }: {
    sortOptions: { value: string; label: string }[];
    sortValue: string;
    onSortChange: (v: string) => void;
  }) => (
    <div data-testid="controls">
      <select
        data-testid="sort-select"
        value={sortValue}
        onChange={(e) => onSortChange(e.target.value)}
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span data-testid="current-sort">{sortValue}</span>
    </div>
  ),
  LeaderboardEmpty: ({ message }: { message: string }) => <div data-testid="empty">{message}</div>,
  LeaderboardRow: ({
    rank,
    name,
    value,
  }: {
    rank: number;
    name: React.ReactNode;
    value: React.ReactNode;
  }) => (
    <div data-testid="row">
      <span data-testid="rank">{rank}</span>
      <span data-testid="name">{name}</span>
      <span data-testid="value">{value}</span>
    </div>
  ),
}));

function makeJockeys(): Jockey[] {
  return [
    createTestJockey({ id: "j1", name: "Alice", careerWins: 30, careerStarts: 100, tier: "elite" }),
    createTestJockey({ id: "j2", name: "Bob", careerWins: 10, careerStarts: 50, tier: "budget" }),
    createTestJockey({ id: "j3", name: "Charlie", careerWins: 20, careerStarts: 80, tier: "mid" }),
  ];
}

describe("JockeyStandingsTable", () => {
  it("renders empty state when no jockeys", () => {
    render(<JockeyStandingsTable jockeys={[]} />);
    expect(screen.getByTestId("empty")).toBeTruthy();
  });

  it("renders rows when jockeys provided", () => {
    render(<JockeyStandingsTable jockeys={makeJockeys()} />);
    expect(screen.getAllByTestId("row").length).toBe(3);
  });

  it("defaults to sorting by wins (descending)", () => {
    render(<JockeyStandingsTable jockeys={makeJockeys()} />);
    const names = screen.getAllByTestId("name").map((el) => el.textContent);
    expect(names).toEqual(["Alice", "Charlie", "Bob"]);
  });

  it("sorts by tier using rank order (elite > mid > budget), not alphabetical", () => {
    render(<JockeyStandingsTable jockeys={makeJockeys()} />);
    fireEvent.change(screen.getByTestId("sort-select"), { target: { value: "tier" } });
    expect(screen.getByTestId("current-sort").textContent).toBe("tier");
    const names = screen.getAllByTestId("name").map((el) => el.textContent);
    expect(names).toEqual(["Alice", "Charlie", "Bob"]);
  });

  it("sorts by name alphabetically", () => {
    render(<JockeyStandingsTable jockeys={makeJockeys()} />);
    fireEvent.change(screen.getByTestId("sort-select"), { target: { value: "name" } });
    const names = screen.getAllByTestId("name").map((el) => el.textContent);
    expect(names).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("sorts by archetype using ARCHETYPES order, not alphabetical", () => {
    const jockeys = [
      createTestJockey({ id: "j1", name: "Versatile", archetype: "versatile" }),
      createTestJockey({ id: "j2", name: "FrontRunner", archetype: "front_runner" }),
      createTestJockey({ id: "j3", name: "Closer", archetype: "closer" }),
    ];
    render(<JockeyStandingsTable jockeys={jockeys} />);
    fireEvent.change(screen.getByTestId("sort-select"), { target: { value: "archetype" } });
    const names = screen.getAllByTestId("name").map((el) => el.textContent);
    expect(names).toEqual(["FrontRunner", "Closer", "Versatile"]);
  });
});
