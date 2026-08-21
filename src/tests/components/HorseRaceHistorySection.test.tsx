import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { HorseRaceHistorySection } from "@/components/horse/HorseRaceHistorySection";
import type { Horse } from "@/game/types";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

function createHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
    energy: 80,
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      temperament: 50,
      conformation: 50,
      consistency: 50,
    },
    potential: 70,
    raceHistory: [],
    ownership: { type: "player" },
    healthStatus: "healthy",
    lifecycleStatus: "active",
    racingViable: true,
    courseVisits: {},
    ...overrides,
  } as Horse;
}

describe("HorseRaceHistorySection", () => {
  it("shows no race records message when raceHistory is empty", () => {
    renderWithStore(
      <HorseRaceHistorySection
        horse={createHorse()}
        raceHistoryLimit={10}
        onLimitChange={() => {}}
      />,
    );
    expect(screen.getByText(/No race records on file/i)).toBeTruthy();
  });

  it("renders race history entries sorted by day descending", () => {
    const horse = createHorse({
      raceHistory: [
        { raceId: "r1", raceName: "Early Race", position: 1, day: 10 },
        { raceId: "r2", raceName: "Late Race", position: 3, day: 50 },
        { raceId: "r3", raceName: "Mid Race", position: 2, day: 30 },
      ],
    });
    renderWithStore(
      <HorseRaceHistorySection horse={horse} raceHistoryLimit={10} onLimitChange={() => {}} />,
    );
    const names = screen.getAllByText(/Early Race|Late Race|Mid Race/);
    expect(names[0].textContent).toBe("Late Race");
    expect(names[1].textContent).toBe("Mid Race");
    expect(names[2].textContent).toBe("Early Race");
  });

  it("displays position, race name, and day", () => {
    const horse = createHorse({
      raceHistory: [{ raceId: "r1", raceName: "Derby", position: 1, day: 25 }],
    });
    renderWithStore(
      <HorseRaceHistorySection horse={horse} raceHistoryLimit={10} onLimitChange={() => {}} />,
    );
    expect(screen.getByText("Derby")).toBeTruthy();
    expect(screen.getByText("Day 25")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("displays grade badge for graded races", () => {
    const horse = createHorse({
      raceHistory: [{ raceId: "r1", raceName: "Derby", position: 1, day: 25, grade: "G1" }],
    });
    renderWithStore(
      <HorseRaceHistorySection horse={horse} raceHistoryLimit={10} onLimitChange={() => {}} />,
    );
    expect(screen.getAllByText("G1").length).toBeGreaterThanOrEqual(1);
  });

  it("displays beyer figure when present", () => {
    const horse = createHorse({
      raceHistory: [{ raceId: "r1", raceName: "Derby", position: 1, day: 25, beyer: 92 }],
    });
    renderWithStore(
      <HorseRaceHistorySection horse={horse} raceHistoryLimit={10} onLimitChange={() => {}} />,
    );
    expect(screen.getByText("92")).toBeTruthy();
  });

  it("displays surface when present", () => {
    const horse = createHorse({
      raceHistory: [{ raceId: "r1", raceName: "Derby", position: 1, day: 25, surface: "Turf" }],
    });
    renderWithStore(
      <HorseRaceHistorySection horse={horse} raceHistoryLimit={10} onLimitChange={() => {}} />,
    );
    expect(screen.getByText("Turf")).toBeTruthy();
  });

  it("respects raceHistoryLimit prop", () => {
    const horse = createHorse({
      raceHistory: Array.from({ length: 15 }, (_, i) => ({
        raceId: `r${i}`,
        raceName: `Race ${i}`,
        position: i + 1,
        day: i + 1,
      })),
    });
    renderWithStore(
      <HorseRaceHistorySection horse={horse} raceHistoryLimit={5} onLimitChange={() => {}} />,
    );
    const races = screen.getAllByText(/Race \d+/);
    expect(races.length).toBe(5);
  });

  it("displays gate when present in race history entry", () => {
    const horse = createHorse({
      raceHistory: [{ raceId: "r1", raceName: "Derby", position: 1, day: 25, gate: 3 }],
    });
    renderWithStore(
      <HorseRaceHistorySection horse={horse} raceHistoryLimit={10} onLimitChange={() => {}} />,
    );
    expect(screen.getAllByText(/G3/).length).toBeGreaterThan(0);
  });
});
