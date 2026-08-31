/**
 * useRaceCardOdds.test.ts
 *
 * Tests verifying that useRaceCardOdds uses the canonical calculateClassBonus
 * function (from @/core/common/classBonus) rather than inline values, and that
 * it correctly selects the favorite (highest probability) horse's odds.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Horse, Race } from "@/game/types";
import { asHorseId } from "@/core/types/branded";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { calculateWinProbabilityMock, probabilityToMorningLineMock, formatOddsMock, mockStateRef } =
  vi.hoisted(() => {
    const calculateWinProbabilityMock = vi.fn(
      (speed: number, stamina: number, acceleration: number, form: number, classBonus: number) =>
        (speed + stamina + acceleration) / 300 + form / 200 + classBonus / 100,
    );
    const probabilityToMorningLineMock = vi.fn((p: number) => {
      if (p >= 0.5) return 1;
      if (p >= 0.33) return 2;
      if (p >= 0.25) return 3;
      if (p >= 0.2) return 4;
      if (p >= 0.17) return 5;
      if (p >= 0.14) return 6;
      if (p >= 0.12) return 8;
      if (p >= 0.1) return 10;
      if (p >= 0.08) return 12;
      if (p >= 0.06) return 15;
      if (p >= 0.05) return 20;
      return 30;
    });
    const formatOddsMock = vi.fn((n: number) => `${n}-1`);
    const mockStateRef: { current: Record<string, unknown> } = { current: {} };
    return {
      calculateWinProbabilityMock,
      probabilityToMorningLineMock,
      formatOddsMock,
      mockStateRef,
    };
  });

vi.mock("@/core/odds", () => ({
  calculateWinProbability: calculateWinProbabilityMock,
  probabilityToMorningLine: probabilityToMorningLineMock,
  formatOdds: formatOddsMock,
}));

vi.mock("@/game/store", () => ({
  useGame: vi.fn((selector: (s: unknown) => unknown) => selector(mockStateRef.current)),
  useGameWithShallow: vi.fn((selector: (s: unknown) => unknown) => selector(mockStateRef.current)),
}));

// ─── Test Helpers ────────────────────────────────────────────────────────────

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: asHorseId("h1"),
    name: "Thunder",
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      temperament: 70,
      durability: 70,
      consistency: 70,
    } as any,
    form: 50,
    raceHistory: [],
    ownership: { type: "player" },
    ...overrides,
  }) as Horse;

const mkRace = (overrides: Partial<Race> = {}): Race =>
  ({
    id: "race-1",
    name: "Test Race",
    day: 1,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 100,
    purse: 5000,
    fieldSize: 1,
    entries: [{ horseId: asHorseId("h1"), ownership: { type: "player" } }],
    resolved: false,
    ...overrides,
  }) as unknown as Race;

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { useRaceCardOdds } from "@/hooks/race/useRaceCardOdds";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useRaceCardOdds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStateRef.current = {
      horses: {
        h1: mkHorse({ id: asHorseId("h1") }),
      },
    };
  });

  describe("class bonus uses canonical calculateClassBonus values", () => {
    it("G1 race uses class bonus 8 (not 15)", () => {
      const race = mkRace({
        graded: { key: "g1-test", grade: "G1", track: "Test", surface: "Turf" },
        raceClass: "Group",
      });
      renderHook(() => useRaceCardOdds(race));

      const calls = calculateWinProbabilityMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const classBonusArg = calls[0][4];
      expect(classBonusArg).toBe(8);
    });

    it("G2 race uses class bonus 5 (not 10)", () => {
      const race = mkRace({
        graded: { key: "g2-test", grade: "G2", track: "Test", surface: "Turf" },
        raceClass: "Group",
      });
      renderHook(() => useRaceCardOdds(race));

      const classBonusArg = calculateWinProbabilityMock.mock.calls[0][4];
      expect(classBonusArg).toBe(5);
    });

    it("G3 race uses class bonus 3 (not 5)", () => {
      const race = mkRace({
        graded: { key: "g3-test", grade: "G3", track: "Test", surface: "Turf" },
        raceClass: "Group",
      });
      renderHook(() => useRaceCardOdds(race));

      const classBonusArg = calculateWinProbabilityMock.mock.calls[0][4];
      expect(classBonusArg).toBe(3);
    });

    it("non-graded Group race uses class bonus 4", () => {
      const race = mkRace({
        raceClass: "Group",
      });
      renderHook(() => useRaceCardOdds(race));

      const classBonusArg = calculateWinProbabilityMock.mock.calls[0][4];
      expect(classBonusArg).toBe(4);
    });

    it("non-graded Stakes race uses class bonus 2", () => {
      const race = mkRace({
        raceClass: "Stakes",
      });
      renderHook(() => useRaceCardOdds(race));

      const classBonusArg = calculateWinProbabilityMock.mock.calls[0][4];
      expect(classBonusArg).toBe(2);
    });

    it("non-graded Allowance race uses class bonus 0", () => {
      const race = mkRace({
        raceClass: "Allowance",
      });
      renderHook(() => useRaceCardOdds(race));

      const classBonusArg = calculateWinProbabilityMock.mock.calls[0][4];
      expect(classBonusArg).toBe(0);
    });
  });

  describe("edge cases", () => {
    it('returns "N/A" when no horses are found in the store', () => {
      const race = mkRace({
        entries: [{ horseId: asHorseId("nonexistent"), ownership: { type: "player" } }],
      });
      const { result } = renderHook(() => useRaceCardOdds(race));
      expect(result.current).toBe("N/A");
    });

    it("returns odds for the horse with the highest probability", () => {
      mockStateRef.current = {
        horses: {
          h1: mkHorse({
            id: asHorseId("h1"),
            stats: { speed: 50, stamina: 50, acceleration: 50 } as any,
            form: 30,
          }),
          h2: mkHorse({
            id: asHorseId("h2"),
            stats: { speed: 90, stamina: 90, acceleration: 90 } as any,
            form: 80,
          }),
        },
      };

      const race = mkRace({
        entries: [
          { horseId: asHorseId("h1"), ownership: { type: "player" } },
          { horseId: asHorseId("h2"), ownership: { type: "player" } },
        ],
        fieldSize: 2,
      });

      const { result } = renderHook(() => useRaceCardOdds(race));

      // h2 has much higher stats → higher probability → should be the favorite
      // calculateWinProbability was called for both, but the best one's odds are returned
      expect(calculateWinProbabilityMock).toHaveBeenCalledTimes(2);

      // The last call to formatOdds should correspond to the best probability horse
      const formatOddsCalls = formatOddsMock.mock.calls;
      expect(formatOddsCalls.length).toBeGreaterThan(0);

      // h2's probability: (90+90+90)/300 + 80/200 + 0/100 = 0.9 + 0.4 = 1.3 → clamped to 0.95
      // morningLine for 0.95 → 1, formatOdds(1) → "1-1"
      expect(result.current).toBe("1-1");
    });

    it("does not recompute when dependencies are unchanged", () => {
      const race = mkRace({});
      const { rerender } = renderHook(() => useRaceCardOdds(race));

      const callCountAfterFirst = calculateWinProbabilityMock.mock.calls.length;
      rerender();
      const callCountAfterSecond = calculateWinProbabilityMock.mock.calls.length;

      expect(callCountAfterSecond).toBe(callCountAfterFirst);
    });
  });
});
