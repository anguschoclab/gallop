import { describe, it, expect, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RaceWinsTable } from "@/components/portfolio/RaceWinsTable";
import type { PlayerRaceWinRecord } from "@/core/stable/raceWins";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, unknown>;
  }) =>
    createElement(
      "a",
      { ...props, href: props.to, "data-params": JSON.stringify(props.params ?? {}) },
      children,
    ),
}));

const mockWins: PlayerRaceWinRecord[] = [
  {
    id: "win-1",
    day: 30,
    raceId: "race-g1",
    raceName: "Breeders Cup Classic",
    horseId: "horse-1",
    horseName: "Secretariat II",
    payout: 3000000,
    purse: 5000000,
    grade: "G1",
    distance: 2000,
    surface: "Dirt",
    track: "Santa Anita",
    beyer: 110,
    jockeyId: "j-1",
    jockeyName: "Mike Smith",
  },
  {
    id: "win-2",
    day: 20,
    raceId: "race-allowance",
    raceName: "Spring Allowance",
    horseId: "horse-2",
    horseName: "Velvet Flash",
    payout: 50000,
    raceClass: "Allowance",
    distance: 1400,
    surface: "Turf",
    beyer: 85,
  },
  {
    id: "win-3",
    day: 10,
    raceId: "race-g3",
    raceName: "Autumn Mile",
    horseId: "horse-1",
    horseName: "Secretariat II",
    payout: 150000,
    grade: "G3",
    distance: 1600,
    surface: "Turf",
    track: "Belmont",
    beyer: 96,
  },
];

describe("RaceWinsTable", () => {
  it("renders empty state message when there are no wins", () => {
    render(<RaceWinsTable wins={[]} />);
    expect(screen.getByText(/You haven't won any races yet/i)).toBeInTheDocument();
  });

  it("renders summary stat cards with correct metrics", () => {
    render(<RaceWinsTable wins={mockWins} />);

    // Total Wins: 3
    expect(screen.getByText("Races Won")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2 graded stakes")).toBeInTheDocument();

    // Total Racing Earnings: $3,200,000
    expect(screen.getByText("Racing Earnings")).toBeInTheDocument();
    expect(screen.getByText("$3,200,000")).toBeInTheDocument();

    // Top Payout: $3,000,000 (present in stat card and table row)
    expect(screen.getByText("Top Payout")).toBeInTheDocument();
    expect(screen.getAllByText("$3,000,000")).toHaveLength(2);

    // Average Payout: $1,066,667
    expect(screen.getByText("Average Payout")).toBeInTheDocument();
    expect(screen.getByText("$1,066,667")).toBeInTheDocument();
  });

  it("renders table rows with race, horse, conditions, jockey, and payout", () => {
    render(<RaceWinsTable wins={mockWins} />);

    expect(screen.getByText("Breeders Cup Classic")).toBeInTheDocument();
    expect(screen.getAllByText("G1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Secretariat II")).toHaveLength(2);
    expect(screen.getByText("Ridden by Mike Smith")).toBeInTheDocument();
    expect(screen.getByText("2000m · Dirt · Santa Anita")).toBeInTheDocument();
    expect(screen.getByText("110")).toBeInTheDocument();
    expect(screen.getByText("of $5,000,000 purse")).toBeInTheDocument();

    expect(screen.getByText("Spring Allowance")).toBeInTheDocument();
    expect(screen.getByText("Allowance")).toBeInTheDocument();
    expect(screen.getByText("Velvet Flash")).toBeInTheDocument();
    expect(screen.getByText("1400m · Turf")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("filters rows by search text (race name, horse name)", () => {
    render(<RaceWinsTable wins={mockWins} />);

    const searchInput = screen.getByLabelText("Search race wins");
    fireEvent.change(searchInput, { target: { value: "Velvet" } });

    expect(screen.getByText("Spring Allowance")).toBeInTheDocument();
    expect(screen.queryByText("Breeders Cup Classic")).not.toBeInTheDocument();
    expect(screen.queryByText("Autumn Mile")).not.toBeInTheDocument();
  });

  it("filters rows by grade (e.g. G1)", () => {
    render(<RaceWinsTable wins={mockWins} />);

    const g1Button = screen.getByRole("button", { name: "G1" });
    fireEvent.click(g1Button);

    expect(screen.getByText("Breeders Cup Classic")).toBeInTheDocument();
    expect(screen.queryByText("Spring Allowance")).not.toBeInTheDocument();
    expect(screen.queryByText("Autumn Mile")).not.toBeInTheDocument();
  });

  it("filters rows by ungraded", () => {
    render(<RaceWinsTable wins={mockWins} />);

    const ungradedButton = screen.getByRole("button", { name: "ungraded" });
    fireEvent.click(ungradedButton);

    expect(screen.getByText("Spring Allowance")).toBeInTheDocument();
    expect(screen.queryByText("Breeders Cup Classic")).not.toBeInTheDocument();
    expect(screen.queryByText("Autumn Mile")).not.toBeInTheDocument();
  });

  it("shows filter empty message when no records match", () => {
    render(<RaceWinsTable wins={mockWins} />);

    const searchInput = screen.getByLabelText("Search race wins");
    fireEvent.change(searchInput, { target: { value: "NonExistentRace" } });

    expect(screen.getByText("No race wins match your filter criteria.")).toBeInTheDocument();
  });

  it("sorts rows when column headers are clicked", () => {
    render(<RaceWinsTable wins={mockWins} />);

    // Click Payout header
    const payoutButton = screen.getByRole("button", { name: /Payout/i });
    fireEvent.click(payoutButton);

    // Should sort by payout desc first: Breeders Cup ($3M) -> Autumn Mile ($150k) -> Spring Allowance ($50k)
    const rows = screen.getAllByRole("row");
    // header row is rows[0], data rows start at rows[1]
    expect(rows[1]).toHaveTextContent("Breeders Cup Classic");
    expect(rows[2]).toHaveTextContent("Autumn Mile");
    expect(rows[3]).toHaveTextContent("Spring Allowance");

    // Click again for asc: Spring Allowance ($50k) -> Autumn Mile ($150k) -> Breeders Cup ($3M)
    fireEvent.click(payoutButton);
    const rowsAsc = screen.getAllByRole("row");
    expect(rowsAsc[1]).toHaveTextContent("Spring Allowance");
    expect(rowsAsc[2]).toHaveTextContent("Autumn Mile");
    expect(rowsAsc[3]).toHaveTextContent("Breeders Cup Classic");
  });
});
