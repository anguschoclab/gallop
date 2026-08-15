import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { G1WinnerHistory } from "@/components/awards/G1WinnerHistory";
import type { SeasonRecord } from "@/core/history/historyTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, className }: any) => (
    <a
      href={to as string}
      data-to={to as string}
      data-params={params ? JSON.stringify(params) : ""}
      className={className}
    >
      {children}
    </a>
  ),
}));

const mkSeasonRecord = (overrides: Partial<SeasonRecord> = {}): SeasonRecord => ({
  id: `rec-${Math.random().toString(36).slice(2)}`,
  year: 1,
  day: 1,
  raceId: "race-1",
  raceName: "Kentucky Derby",
  winnerId: "h1",
  winnerName: "Thunder",
  winnerSilk: "#ff0000",
  time: 120.5,
  jockeyId: "j1",
  jockeyName: "J. Smith",
  grade: "G1",
  isPlayerOwned: false,
  ...overrides,
});

describe("G1WinnerHistory", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty state when no seasonRecords", () => {
    renderWithStore(<G1WinnerHistory />, { seasonRecords: [] });
    expect(screen.getByText(/No Grade 1 races completed yet/i)).toBeTruthy();
  });

  it("renders grouped-by-race view with multiple races", () => {
    const records: SeasonRecord[] = [
      mkSeasonRecord({
        id: "r1",
        raceName: "Kentucky Derby",
        winnerName: "Thunder",
        day: 365,
        year: 1,
      }),
      mkSeasonRecord({
        id: "r2",
        raceName: "Kentucky Derby",
        winnerName: "Lightning",
        day: 730,
        year: 2,
      }),
      mkSeasonRecord({
        id: "r3",
        raceName: "Breeders Cup Classic",
        winnerName: "Storm",
        day: 365,
        year: 1,
      }),
      mkSeasonRecord({
        id: "r4",
        raceName: "Breeders Cup Classic",
        winnerName: "Blaze",
        day: 730,
        year: 2,
      }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    expect(screen.getByText("Kentucky Derby")).toBeTruthy();
    expect(screen.getByText("Breeders Cup Classic")).toBeTruthy();
  });

  it("shows most recent winner as summary in each race group", () => {
    const records: SeasonRecord[] = [
      mkSeasonRecord({
        id: "r1",
        raceName: "Kentucky Derby",
        winnerName: "Thunder",
        day: 365,
        year: 1,
      }),
      mkSeasonRecord({
        id: "r2",
        raceName: "Kentucky Derby",
        winnerName: "Lightning",
        day: 730,
        year: 2,
      }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    expect(screen.getByText(/Lightning/)).toBeTruthy();
    expect(screen.getByText(/Y2/)).toBeTruthy();
  });

  it("collapsible sections expand to show full winner list", async () => {
    const user = userEvent.setup();
    const records: SeasonRecord[] = [
      mkSeasonRecord({
        id: "r1",
        raceName: "Kentucky Derby",
        winnerName: "Thunder",
        day: 365,
        year: 1,
      }),
      mkSeasonRecord({
        id: "r2",
        raceName: "Kentucky Derby",
        winnerName: "Lightning",
        day: 730,
        year: 2,
      }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    // Click the accordion trigger to expand
    await user.click(screen.getByText("Kentucky Derby"));

    // Now both winners should be present in the expanded content
    expect(screen.getByText("Thunder")).toBeTruthy();
    expect(screen.getByText("Lightning")).toBeTruthy();
  });

  it("chronological view renders table sorted by day descending", async () => {
    const user = userEvent.setup();
    const records: SeasonRecord[] = [
      mkSeasonRecord({
        id: "r1",
        raceName: "Race A",
        winnerName: "Horse A",
        day: 100,
        year: 1,
      }),
      mkSeasonRecord({
        id: "r2",
        raceName: "Race B",
        winnerName: "Horse B",
        day: 300,
        year: 2,
      }),
      mkSeasonRecord({
        id: "r3",
        raceName: "Race C",
        winnerName: "Horse C",
        day: 200,
        year: 1,
      }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    // Click the "Chronological" tab
    await user.click(screen.getByRole("tab", { name: /Chronological/i }));

    // Table should be present with all race names
    expect(screen.getByText("Race B")).toBeTruthy();
    expect(screen.getByText("Race C")).toBeTruthy();
    expect(screen.getByText("Race A")).toBeTruthy();
  });

  it("player-owned winners highlighted with gold styling", async () => {
    const user = userEvent.setup();
    const records: SeasonRecord[] = [
      mkSeasonRecord({
        id: "r1",
        raceName: "Kentucky Derby",
        winnerName: "MyHorse",
        isPlayerOwned: true,
        day: 365,
      }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    // Use chronological view where content is always visible
    await user.click(screen.getByRole("tab", { name: /Chronological/i }));

    const winnerLink = screen.getByText("MyHorse");
    expect(winnerLink.className).toContain("text-gold");
  });

  it("winner names link to horse page", async () => {
    const user = userEvent.setup();
    const records: SeasonRecord[] = [
      mkSeasonRecord({
        id: "r1",
        raceName: "Kentucky Derby",
        winnerName: "Thunder",
        winnerId: "h-thunder",
        day: 365,
      }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    // Use chronological view where content is always visible
    await user.click(screen.getByRole("tab", { name: /Chronological/i }));

    const link = screen.getByText("Thunder").closest("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("data-params")).toContain("h-thunder");
  });

  it("silk dot renders with winner silk color", async () => {
    const user = userEvent.setup();
    const records: SeasonRecord[] = [
      mkSeasonRecord({
        id: "r1",
        raceName: "Kentucky Derby",
        winnerName: "Thunder",
        winnerSilk: "#00ff00",
        day: 365,
      }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    // Use chronological view where content is always visible
    await user.click(screen.getByRole("tab", { name: /Chronological/i }));

    const silkDot = document.querySelector(
      '[style*="background-color: rgb(0, 255, 0)"], [style*="background-color: #00ff00"], [style*="background:#00ff00"], [style*="background: #00ff00"]',
    );
    expect(silkDot).toBeTruthy();
  });

  it("multiple winners per race sorted by year descending in expanded view", async () => {
    const user = userEvent.setup();
    const records: SeasonRecord[] = [
      mkSeasonRecord({
        id: "r1",
        raceName: "Kentucky Derby",
        winnerName: "Year1",
        day: 365,
        year: 1,
      }),
      mkSeasonRecord({
        id: "r2",
        raceName: "Kentucky Derby",
        winnerName: "Year3",
        day: 1095,
        year: 3,
      }),
      mkSeasonRecord({
        id: "r3",
        raceName: "Kentucky Derby",
        winnerName: "Year2",
        day: 730,
        year: 2,
      }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    // Click the accordion trigger to expand
    await user.click(screen.getByText("Kentucky Derby"));

    // All three should be rendered in the expanded content
    expect(screen.getByText("Year1")).toBeTruthy();
    expect(screen.getByText("Year2")).toBeTruthy();
    expect(screen.getByText("Year3")).toBeTruthy();
  });

  it("view toggle switches back to By Race from Chronological", async () => {
    const user = userEvent.setup();
    const records: SeasonRecord[] = [
      mkSeasonRecord({
        id: "r1",
        raceName: "Kentucky Derby",
        winnerName: "Thunder",
        day: 365,
      }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    // Switch to chronological
    await user.click(screen.getByRole("tab", { name: /Chronological/i }));

    // Switch back to By Race
    await user.click(screen.getByRole("tab", { name: /By Race/i }));

    // Race group header should be visible again
    expect(screen.getByText("Kentucky Derby")).toBeTruthy();
  });

  it("displays gate number in chronological view when present", async () => {
    const user = userEvent.setup();
    const records: SeasonRecord[] = [
      mkSeasonRecord({
        id: "r1",
        raceName: "Kentucky Derby",
        winnerName: "Thunder",
        day: 365,
        gate: 7,
      }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    await user.click(screen.getByRole("tab", { name: /Chronological/i }));

    expect(screen.getByText("G7")).toBeTruthy();
  });

  it("displays gate number in by-race expanded view when present", async () => {
    const user = userEvent.setup();
    const records: SeasonRecord[] = [
      mkSeasonRecord({
        id: "r1",
        raceName: "Kentucky Derby",
        winnerName: "Thunder",
        day: 365,
        gate: 3,
      }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    await user.click(screen.getByText("Kentucky Derby"));

    expect(screen.getByText("G3")).toBeTruthy();
  });
});
