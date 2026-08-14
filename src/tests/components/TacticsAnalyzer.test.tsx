import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { useGame } from "@/game/store";
import { TacticsAnalyzer } from "@/components/tactics/TacticsAnalyzer";
import type { Horse, Race } from "@/game/types";

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

import { toast } from "sonner";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    stats: {
      speed: 70,
      stamina: 65,
      acceleration: 60,
      temperament: 50,
      conformation: 50,
      consistency: 50,
    },
    ...overrides,
  }) as Horse;

const mkRace = (overrides: Partial<Race> = {}): Race =>
  ({
    id: "r1",
    name: "Test Race",
    day: 10,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 100,
    purse: 5000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    ...overrides,
  }) as Race;

describe("TacticsAnalyzer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore({ ...createDefaultGameState() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders when horse and race exist", () => {
    seedStore({
      ...createDefaultGameState(),
      horses: { h1: mkHorse() },
      races: { r1: mkRace() },
    });
    render(<TacticsAnalyzer horseId="h1" raceId="r1" />);
    expect(screen.getByText("Race Tactics")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save Tactics" })).toBeTruthy();
  });

  it("returns null when horse is missing", () => {
    seedStore({
      ...createDefaultGameState(),
      races: { r1: mkRace() },
    });
    const { container } = render(<TacticsAnalyzer horseId="h1" raceId="r1" />);
    expect(container.querySelector("[class*='border-l-cyan']")).toBeNull();
  });

  it("returns null when race is missing", () => {
    seedStore({
      ...createDefaultGameState(),
      horses: { h1: mkHorse() },
    });
    const { container } = render(<TacticsAnalyzer horseId="h1" raceId="r1" />);
    expect(container.querySelector("[class*='border-l-cyan']")).toBeNull();
  });

  it("save button calls setRaceTactics with current instructions", () => {
    seedStore({
      ...createDefaultGameState(),
      horses: { h1: mkHorse() },
      races: { r1: mkRace() },
    });
    render(<TacticsAnalyzer horseId="h1" raceId="r1" />);

    fireEvent.click(screen.getByRole("button", { name: "Save Tactics" }));

    const pendingIntents = useGame.getState().pendingIntents;
    const tacticsIntent = pendingIntents?.find(
      (i: any) => i.type === "tactics" && i.raceId === "r1" && i.horseId === "h1",
    );
    expect(tacticsIntent).toBeTruthy();
    expect((tacticsIntent as any)?.jockeyInstructions?.ridingStyle).toBe("tactical");
    expect((tacticsIntent as any)?.jockeyInstructions?.earlyPosition).toBe("midpack");
    expect((tacticsIntent as any)?.jockeyInstructions?.moveTiming).toBe("mid");
    expect((tacticsIntent as any)?.jockeyInstructions?.aggressiveness).toBe(50);
  });

  it("save button shows 'Saved!' feedback then reverts after 2 seconds", () => {
    vi.useFakeTimers();
    seedStore({
      ...createDefaultGameState(),
      horses: { h1: mkHorse() },
      races: { r1: mkRace() },
    });
    render(<TacticsAnalyzer horseId="h1" raceId="r1" />);

    fireEvent.click(screen.getByRole("button", { name: "Save Tactics" }));
    expect(screen.getByRole("button", { name: "Saved!" })).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: "Save Tactics" })).toBeTruthy();
  });

  it("save triggers toast.success", () => {
    seedStore({
      ...createDefaultGameState(),
      horses: { h1: mkHorse() },
      races: { r1: mkRace() },
    });
    render(<TacticsAnalyzer horseId="h1" raceId="r1" />);

    fireEvent.click(screen.getByRole("button", { name: "Save Tactics" }));
    expect(toast.success).toHaveBeenCalled();
  });
});
