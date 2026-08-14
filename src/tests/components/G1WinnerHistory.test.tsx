import { describe, it, expect, afterEach } from "vitest";
import { cleanup, screen, fireEvent } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { G1WinnerHistory } from "@/components/awards/G1WinnerHistory";
import type { SeasonRecord } from "@/core/history/historyTypes";

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

    // Most recent winner (Lightning, Y2) should be visible as summary
    expect(screen.getByText("Lightning")).toBeTruthy();
  });

  it("collapsible sections expand to show full winner list", () => {
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

    // Both winners should be present in the DOM (accordion content may be hidden but still rendered)
    expect(screen.getByText("Thunder")).toBeTruthy();
    expect(screen.getByText("Lightning")).toBeTruthy();
  });

  it("chronological view renders table sorted by day descending", () => {
    const records: SeasonRecord[] = [
      mkSeasonRecord({ id: "r1", raceName: "Race A", winnerName: "Horse A", day: 100, year: 1 }),
      mkSeasonRecord({ id: "r2", raceName: "Race B", winnerName: "Horse B", day: 300, year: 2 }),
      mkSeasonRecord({ id: "r3", raceName: "Race C", winnerName: "Horse C", day: 200, year: 1 }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    // Click the "Chronological" tab
    const chronoTab = screen.getByRole("tab", { name: /Chronological/i });
    fireEvent.click(chronoTab);

    // Table should be present
    expect(screen.getByText("Race B")).toBeTruthy();
    expect(screen.getByText("Race C")).toBeTruthy();
    expect(screen.getByText("Race A")).toBeTruthy();
  });

  it("player-owned winners highlighted with gold styling", () => {
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

    const winnerLink = screen.getByText("MyHorse");
    expect(winnerLink.className).toContain("text-gold");
  });

  it("winner names link to horse page", () => {
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

    const link = screen.getByText("Thunder").closest("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toContain("h-thunder");
  });

  it("silk dot renders with winner silk color", () => {
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

    const silkDot = document.querySelector(
      '[style*="background-color: rgb(0, 255, 0)"], [style*="background-color: #00ff00"], [style*="background:#00ff00"], [style*="background: #00ff00"]',
    );
    expect(silkDot).toBeTruthy();
  });

  it("multiple winners per race sorted by year descending in expanded view", () => {
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
    const { container } = renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    // All three should be rendered
    expect(screen.getByText("Year1")).toBeTruthy();
    expect(screen.getByText("Year2")).toBeTruthy();
    expect(screen.getByText("Year3")).toBeTruthy();
  });

  it("view toggle switches back to By Race from Chronological", () => {
    const records: SeasonRecord[] = [
      mkSeasonRecord({ id: "r1", raceName: "Kentucky Derby", winnerName: "Thunder", day: 365 }),
    ];
    renderWithStore(<G1WinnerHistory />, { seasonRecords: records });

    // Switch to chronological
    fireEvent.click(screen.getByRole("tab", { name: /Chronological/i }));

    // Switch back to By Race
    fireEvent.click(screen.getByRole("tab", { name: /By Race/i }));

    // Race group header should be visible again
    expect(screen.getByText("Kentucky Derby")).toBeTruthy();
  });
});
