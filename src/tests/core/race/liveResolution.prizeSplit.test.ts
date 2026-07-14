import { describe, it, expect } from "vitest";
import { resolveLiveRaceWithImpacts } from "@/core/race/liveResolution";
import { createTestHorse } from "@/tests/helpers";
import { PRIZE_SPLIT, GRADED_PRIZE_SPLIT } from "@/constants";
import type { Race } from "@/core/race/types";
import type { Horse } from "@/game/types";
import type { Jockey } from "@/game/types";
import type { Stable } from "@/core/stable/types";

function createTestRace(overrides?: Partial<Race>): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 10,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 0,
    purse: 100000,
    fieldSize: 2,
    entries: [
      { horseId: "h1", owned: true },
      { horseId: "h2", owned: false, stableId: "stable-1" },
    ],
    resolved: false,
    ...overrides,
  } as Race;
}

function createTestJockey(): Jockey {
  return {
    id: "j1",
    name: "Test Jockey",
    careerStarts: 0,
    careerWins: 0,
    fame: 0,
    isApprentice: false,
  } as unknown as Jockey;
}

function createTestStable(): Stable {
  return {
    id: "stable-1",
    name: "Test Stable",
    country: "USA",
    personality: "balanced",
  } as unknown as Stable;
}

describe("resolveLiveRaceWithImpacts — prize split", () => {
  it("uses GRADED_PRIZE_SPLIT for graded race prize money", () => {
    const horse1 = createTestHorse({ id: "h1", age: 3 });
    const horse2 = createTestHorse({ id: "h2", age: 3, stableId: "stable-1" });
    const race = createTestRace({
      graded: { key: "test", grade: "G1", track: "Test", surface: "Turf" },
    });
    const jockeys: Jockey[] = [createTestJockey()];
    const stables: Stable[] = [createTestStable()];

    const result = resolveLiveRaceWithImpacts(
      race,
      [
        { horseId: "h1", position: 1, time: 90 },
        { horseId: "h2", position: 2, time: 91 },
      ],
      [],
      [horse1, horse2],
      jockeys,
      stables,
      10,
    );

    const cashImpacts = result.impacts.filter(
      (i) => i.type === "cash_change" && i.reason?.includes("Prize money"),
    ) as any[];
    const winnerPrize = cashImpacts.find((i) => i.amount > 0)?.amount;
    expect(winnerPrize).toBe(Math.round(100000 * GRADED_PRIZE_SPLIT[0]));
  });

  it("uses PRIZE_SPLIT for non-graded race prize money", () => {
    const horse1 = createTestHorse({ id: "h1", age: 3 });
    const horse2 = createTestHorse({ id: "h2", age: 3, stableId: "stable-1" });
    const race = createTestRace();
    const jockeys: Jockey[] = [createTestJockey()];
    const stables: Stable[] = [createTestStable()];

    const result = resolveLiveRaceWithImpacts(
      race,
      [
        { horseId: "h1", position: 1, time: 90 },
        { horseId: "h2", position: 2, time: 91 },
      ],
      [],
      [horse1, horse2],
      jockeys,
      stables,
      10,
    );

    const cashImpacts = result.impacts.filter(
      (i) => i.type === "cash_change" && i.reason?.includes("Prize money"),
    ) as any[];
    const winnerPrize = cashImpacts.find((i) => i.amount > 0)?.amount;
    expect(winnerPrize).toBe(Math.round(100000 * PRIZE_SPLIT[0]));
  });

  it("includes purseEarned in race history entry for graded race", () => {
    const horse1 = createTestHorse({ id: "h1", age: 3 });
    const horse2 = createTestHorse({ id: "h2", age: 3, stableId: "stable-1" });
    const race = createTestRace({
      graded: { key: "test", grade: "G1", track: "Test", surface: "Turf" },
    });
    const jockeys: Jockey[] = [createTestJockey()];
    const stables: Stable[] = [createTestStable()];

    const result = resolveLiveRaceWithImpacts(
      race,
      [
        { horseId: "h1", position: 1, time: 90 },
        { horseId: "h2", position: 2, time: 91 },
      ],
      [],
      [horse1, horse2],
      jockeys,
      stables,
      10,
    );

    const raceHistoryImpact = result.impacts.find((i) => i.type === "race_history");
    expect(raceHistoryImpact).toBeDefined();
    expect(raceHistoryImpact!.raceHistoryEntry.purseEarned).toBe(
      Math.round(100000 * GRADED_PRIZE_SPLIT[0]),
    );
  });

  it("includes purseEarned in race history entry for non-graded race", () => {
    const horse1 = createTestHorse({ id: "h1", age: 3 });
    const horse2 = createTestHorse({ id: "h2", age: 3, stableId: "stable-1" });
    const race = createTestRace();
    const jockeys: Jockey[] = [createTestJockey()];
    const stables: Stable[] = [createTestStable()];

    const result = resolveLiveRaceWithImpacts(
      race,
      [
        { horseId: "h1", position: 1, time: 90 },
        { horseId: "h2", position: 2, time: 91 },
      ],
      [],
      [horse1, horse2],
      jockeys,
      stables,
      10,
    );

    const raceHistoryImpact = result.impacts.find((i) => i.type === "race_history");
    expect(raceHistoryImpact).toBeDefined();
    expect(raceHistoryImpact!.raceHistoryEntry.purseEarned).toBe(
      Math.round(100000 * PRIZE_SPLIT[0]),
    );
  });

  it("sets purseEarned to 0 for positions beyond prize split length", () => {
    const horse1 = createTestHorse({ id: "h1", age: 3 });
    const horse2 = createTestHorse({ id: "h2", age: 3, stableId: "stable-1" });
    const race = createTestRace();
    const jockeys: Jockey[] = [createTestJockey()];
    const stables: Stable[] = [createTestStable()];

    const result = resolveLiveRaceWithImpacts(
      race,
      [
        { horseId: "h1", position: 5, time: 90 },
        { horseId: "h2", position: 6, time: 91 },
      ],
      [],
      [horse1, horse2],
      jockeys,
      stables,
      10,
    );

    const raceHistoryImpact = result.impacts.find((i) => i.type === "race_history");
    expect(raceHistoryImpact).toBeDefined();
    expect(raceHistoryImpact!.raceHistoryEntry.purseEarned).toBe(0);
  });
});
