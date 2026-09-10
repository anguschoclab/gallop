import { describe, it, expect } from "vitest";
import {
  recordRaceHistory,
  checkTrackRecord,
  checkTrackRecords,
  ageBucket,
  genderBucket,
} from "@/services/history/historyService";
import { createTestHorse, createTestRng } from "@/tests/helpers";
import { DAYS_PER_YEAR } from "@/constants";
import { isValidUUID } from "@/core/uuid";
import type { Race, Horse, RaceRunner } from "@/game/types";
import type { TrackRecord } from "@/core/history/historyTypes";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

// ─── Shared fixtures ──────────────────────────────────────────────────────

function createMockRace(overrides?: Partial<Race>): Race {
  return {
    id: "race-1",
    name: "Test G1 Race",
    day: 100,
    distance: 1600,
    raceClass: "Stakes",
    entryFee: 0,
    purse: 100000,
    fieldSize: 8,
    entries: [],
    resolved: true,
    graded: {
      key: "test-g1",
      grade: "G1",
      track: "Test Track",
      trackId: "test-track",
      surface: "Dirt",
    },
    ...overrides,
  } as Race;
}

function createMockResult(winnerId: string, winnerTime: number = 100.5) {
  return [
    { horseId: winnerId, position: 1, time: winnerTime },
    { horseId: "loser-1", position: 2, time: 105.0 },
  ];
}

function createMockRunner(horseId: string, jockeyId?: string, jockeyName?: string): RaceRunner {
  return {
    horseId,
    name: "Mock Horse",
    silk: "#000",
    ownership: makePlayerOwned(),
    jockeyId: jockeyId ?? "j-1",
    jockeyName: jockeyName ?? "Test Jockey",
  };
}

const baseHorse = (overrides?: Partial<Horse>) =>
  createTestHorse({
    id: "winner-1",
    name: "Champ",
    silk: "#ff0000",
    ownership: makePlayerOwned(),
    ...overrides,
  });

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── recordRaceHistory ────────────────────────────────────────────────────

describe("recordRaceHistory", () => {
  // ── Guard tests (null returns) ──

  it("returns null for G2 race", () => {
    const race = createMockRace({
      graded: { key: "g2", grade: "G2", track: "T", trackId: "t", surface: "Dirt" },
    });
    const result = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [createMockRunner("winner-1")],
      [baseHorse()],
      100,
    );
    expect(result).toBeNull();
  });

  it("returns null for G3 race", () => {
    const race = createMockRace({
      graded: { key: "g3", grade: "G3", track: "T", trackId: "t", surface: "Dirt" },
    });
    const result = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [createMockRunner("winner-1")],
      [baseHorse()],
      100,
    );
    expect(result).toBeNull();
  });

  it("returns null for ungraded race (no graded field)", () => {
    const race = createMockRace({ graded: undefined });
    const result = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [createMockRunner("winner-1")],
      [baseHorse()],
      100,
    );
    expect(result).toBeNull();
  });

  it("returns null for race with graded but missing grade field", () => {
    const race = createMockRace({
      graded: { key: "test", track: "T", trackId: "t", surface: "Dirt" } as any,
    });
    const result = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [createMockRunner("winner-1")],
      [baseHorse()],
      100,
    );
    expect(result).toBeNull();
  });

  it("returns null when result is empty", () => {
    const race = createMockRace();
    const result = recordRaceHistory(race, [], [createMockRunner("winner-1")], [baseHorse()], 100);
    expect(result).toBeNull();
  });

  it("accepts graded_override as a valid Race field", () => {
    const race = createMockRace({
      graded_override: { grade: "G1", surface: "Turf" },
    });
    expect(race.graded_override?.grade).toBe("G1");
    expect(race.graded_override?.surface).toBe("Turf");
  });

  it("returns null when no position-1 in results", () => {
    const race = createMockRace();
    const result = recordRaceHistory(
      race,
      [{ horseId: "h1", position: 2, time: 100 }],
      [createMockRunner("h1")],
      [baseHorse()],
      100,
    );
    expect(result).toBeNull();
  });

  // ── Happy path & field mapping ──

  it("returns fully populated SeasonRecord for G1 race with array horses", () => {
    const race = createMockRace({ id: "race-abc", name: "Kentucky Derby" });
    const horse = baseHorse();
    const runner = createMockRunner("winner-1", "j-42", "Top Jockey");
    const day = 100;

    const record = recordRaceHistory(
      race,
      createMockResult("winner-1", 98.3),
      [runner],
      [horse],
      day,
      createTestRng("seed"),
    );

    expect(record).not.toBeNull();
    expect(record!.id).toMatch(UUID_REGEX);
    expect(isValidUUID(record!.id)).toBe(true);
    expect(record!.year).toBe(Math.floor((day - 1) / DAYS_PER_YEAR) + 1);
    expect(record!.day).toBe(day);
    expect(record!.raceId).toBe("race-abc");
    expect(record!.raceName).toBe("Kentucky Derby");
    expect(record!.winnerId).toBe("winner-1");
    expect(record!.winnerName).toBe("Champ");
    expect(record!.winnerSilk).toBe("#ff0000");
    expect(record!.time).toBe(98.3);
    expect(record!.jockeyId).toBe("j-42");
    expect(record!.jockeyName).toBe("Top Jockey");
    expect(record!.grade).toBe("G1");
    expect(record!.isPlayerOwned).toBe(true);
  });

  it("returns fully populated SeasonRecord with Map horses", () => {
    const race = createMockRace();
    const horse = baseHorse();
    const horseMap = new Map([[horse.id, horse]]);
    const runner = createMockRunner("winner-1", "j-42", "Top Jockey");

    const record = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [runner],
      horseMap,
      100,
      createTestRng("seed"),
    );

    expect(record).not.toBeNull();
    expect(record!.winnerName).toBe("Champ");
    expect(record!.winnerSilk).toBe("#ff0000");
    expect(record!.isPlayerOwned).toBe(true);
  });

  it("uses winner even when not first entry in result array", () => {
    const race = createMockRace();
    const horse = baseHorse();
    const result = [
      { horseId: "loser", position: 2, time: 105 },
      { horseId: "winner-1", position: 1, time: 100 },
    ];

    const record = recordRaceHistory(
      race,
      result,
      [createMockRunner("winner-1")],
      [horse],
      100,
      createTestRng("seed"),
    );

    expect(record).not.toBeNull();
    expect(record!.winnerId).toBe("winner-1");
    expect(record!.winnerName).toBe("Champ");
    expect(record!.time).toBe(100);
  });

  it("picks first winner when multiple position-1 entries (tie)", () => {
    const race = createMockRace();
    const horseA = baseHorse({ id: "h-a", name: "Horse A" });
    const horseB = baseHorse({ id: "h-b", name: "Horse B" });
    const result = [
      { horseId: "h-a", position: 1, time: 100 },
      { horseId: "h-b", position: 1, time: 100 },
    ];

    const record = recordRaceHistory(
      race,
      result,
      [createMockRunner("h-a"), createMockRunner("h-b")],
      [horseA, horseB],
      100,
      createTestRng("seed"),
    );

    expect(record).not.toBeNull();
    expect(record!.winnerId).toBe("h-a");
    expect(record!.winnerName).toBe("Horse A");
  });

  // ── Fallback tests ──

  it("falls back to Unknown name and #666 silk when horse not found in array", () => {
    const race = createMockRace();
    const record = recordRaceHistory(
      race,
      createMockResult("missing-horse"),
      [createMockRunner("missing-horse")],
      [baseHorse()],
      100,
      createTestRng("seed"),
    );

    expect(record).not.toBeNull();
    expect(record!.winnerName).toBe("Unknown");
    expect(record!.winnerSilk).toBe("#666");
    expect(record!.isPlayerOwned).toBe(false);
  });

  it("falls back to Unknown name and #666 silk when horse not found in Map", () => {
    const race = createMockRace();
    const horseMap = new Map([[baseHorse().id, baseHorse()]]);

    const record = recordRaceHistory(
      race,
      createMockResult("missing-horse"),
      [createMockRunner("missing-horse")],
      horseMap,
      100,
      createTestRng("seed"),
    );

    expect(record).not.toBeNull();
    expect(record!.winnerName).toBe("Unknown");
    expect(record!.winnerSilk).toBe("#666");
    expect(record!.isPlayerOwned).toBe(false);
  });

  it("falls back to 'unknown' jockeyId and 'Unknown' jockeyName when runner not found", () => {
    const race = createMockRace();
    const record = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [],
      [baseHorse()],
      100,
      createTestRng("seed"),
    );

    expect(record).not.toBeNull();
    expect(record!.jockeyId).toBe("unknown");
    expect(record!.jockeyName).toBe("Unknown");
  });

  it("falls back when runner found but missing jockeyId and jockeyName fields", () => {
    const race = createMockRace();
    const record = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [
        {
          horseId: "winner-1",
          name: "Mock Horse",
          silk: "#000",
          ownership: makePlayerOwned(),
        } as RaceRunner,
      ],
      [baseHorse()],
      100,
      createTestRng("seed"),
    );

    expect(record).not.toBeNull();
    expect(record!.jockeyId).toBe("unknown");
    expect(record!.jockeyName).toBe("Unknown");
  });

  // ── Year calculation ──

  it("calculates year 1 for day 1", () => {
    const race = createMockRace();
    const record = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [createMockRunner("winner-1")],
      [baseHorse()],
      1,
      createTestRng("seed"),
    );
    expect(record!.year).toBe(1);
  });

  it.each([
    [365, 1],
    [366, 2],
    [730, 2],
    [731, 3],
  ])("calculates year correctly for day %i", (day, expectedYear) => {
    const race = createMockRace();
    const record = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [createMockRunner("winner-1")],
      [baseHorse()],
      day,
      createTestRng("seed"),
    );
    expect(record!.year).toBe(expectedYear);
  });

  // ── isPlayerOwned ──

  it("sets isPlayerOwned to false when horse is unowned", () => {
    const race = createMockRace();
    const horse = baseHorse({ ownership: makeUnowned() });
    const record = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [createMockRunner("winner-1")],
      [horse],
      100,
      createTestRng("seed"),
    );
    expect(record!.isPlayerOwned).toBe(false);
  });

  // ── Determinism ──

  it("produces deterministic UUID when same rng seed is used", () => {
    const race = createMockRace();
    const horse = baseHorse();
    const runner = createMockRunner("winner-1");

    const record1 = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [runner],
      [horse],
      100,
      createTestRng("deterministic-seed"),
    );
    const record2 = recordRaceHistory(
      race,
      createMockResult("winner-1"),
      [runner],
      [horse],
      100,
      createTestRng("deterministic-seed"),
    );

    expect(record1!.id).toBe(record2!.id);
    expect(isValidUUID(record1!.id)).toBe(true);
  });
});

// ─── checkTrackRecord ─────────────────────────────────────────────────────

describe("checkTrackRecord", () => {
  // ── Guard tests (null returns) ──

  it("returns null when trackId missing (no graded, no top-level)", () => {
    const race = createMockRace({ graded: undefined, trackId: undefined });
    const result = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(result).toBeNull();
  });

  it("returns null when surface missing (no graded, no top-level)", () => {
    const race = createMockRace({ graded: undefined, trackId: "test-track", surface: undefined });
    const result = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(result).toBeNull();
  });

  it("returns null when both trackId and surface missing", () => {
    const race = createMockRace({ graded: undefined, trackId: undefined, surface: undefined });
    const result = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(result).toBeNull();
  });

  it("returns null when trackId from graded but surface missing entirely", () => {
    const race = createMockRace({
      graded: {
        key: "k",
        grade: "G1",
        track: "T",
        trackId: "graded-track",
        surface: "Dirt",
      } as any,
      trackId: undefined,
      surface: undefined,
    });
    // Remove graded.surface to simulate missing surface
    (race.graded as any) = { key: "k", grade: "G1", track: "T", trackId: "graded-track" };
    const result = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(result).toBeNull();
  });

  // ── New record creation (no existing) ──

  it("returns new record when existingRecords is not passed (default)", () => {
    const race = createMockRace();
    const record = checkTrackRecord(race, "winner-1", "Champ", 98.5, 100);

    expect(record).not.toBeNull();
    expect(record!.trackId).toBe("test-track");
    expect(record!.trackName).toBe("Test Track");
    expect(record!.surface).toBe("Dirt");
    expect(record!.distance).toBe(1600);
    expect(record!.time).toBe(98.5);
    expect(record!.horseId).toBe("winner-1");
    expect(record!.horseName).toBe("Champ");
    expect(record!.day).toBe(100);
    expect(record!.year).toBe(1);
  });

  it("returns new record when existingRecords is explicitly {}", () => {
    const race = createMockRace();
    const record = checkTrackRecord(race, "winner-1", "Champ", 98.5, 100, {});
    expect(record).not.toBeNull();
    expect(record!.trackId).toBe("test-track");
  });

  it("returns new record when key not in existingRecords", () => {
    const race = createMockRace();
    const existing: Record<string, TrackRecord> = {
      other_track_Dirt_1600: {
        trackId: "other-track",
        trackName: "Other",
        surface: "Dirt",
        distance: 1600,
        time: 95,
        horseId: "h",
        horseName: "H",
        day: 50,
        year: 1,
      },
    };
    const record = checkTrackRecord(race, "winner-1", "Champ", 98.5, 100, existing);
    expect(record).not.toBeNull();
    expect(record!.trackId).toBe("test-track");
  });

  // ── Time comparison tests ──

  it("returns new record when time is faster than existing", () => {
    const race = createMockRace();
    const existing: Record<string, TrackRecord> = {
      "test-track_Dirt_1600": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 120,
        horseId: "old-winner",
        horseName: "Old Champ",
        day: 50,
        year: 1,
      },
    };
    const record = checkTrackRecord(race, "winner-1", "Champ", 110, 100, existing);
    expect(record).not.toBeNull();
    expect(record!.time).toBe(110);
    expect(record!.horseId).toBe("winner-1");
  });

  it("returns null when time is slower than existing", () => {
    const race = createMockRace();
    const existing: Record<string, TrackRecord> = {
      "test-track_Dirt_1600": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 100,
        horseId: "old-winner",
        horseName: "Old Champ",
        day: 50,
        year: 1,
      },
    };
    const record = checkTrackRecord(race, "winner-1", "Champ", 110, 100, existing);
    expect(record).toBeNull();
  });

  it("returns null when time is exactly equal to existing", () => {
    const race = createMockRace();
    const existing: Record<string, TrackRecord> = {
      "test-track_Dirt_1600": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 100.0,
        horseId: "old-winner",
        horseName: "Old Champ",
        day: 50,
        year: 1,
      },
    };
    const record = checkTrackRecord(race, "winner-1", "Champ", 100.0, 100, existing);
    expect(record).toBeNull();
  });

  it("returns new record when time is marginally faster (floating-point)", () => {
    const race = createMockRace();
    const existing: Record<string, TrackRecord> = {
      "test-track_Dirt_1600": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 100.0001,
        horseId: "old-winner",
        horseName: "Old Champ",
        day: 50,
        year: 1,
      },
    };
    const record = checkTrackRecord(race, "winner-1", "Champ", 100.0, 100, existing);
    expect(record).not.toBeNull();
    expect(record!.time).toBe(100.0);
  });

  // ── Field resolution tests ──

  it("uses race.trackId and race.surface (top-level priority over graded)", () => {
    const race = createMockRace({
      trackId: "top-level-track",
      surface: "Turf",
      graded: {
        key: "k",
        grade: "G1",
        track: "Graded Track",
        trackId: "graded-track",
        surface: "Dirt",
      },
    });
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(record).not.toBeNull();
    expect(record!.trackId).toBe("top-level-track");
    expect(record!.surface).toBe("Turf");
  });

  it("falls back to graded.trackId when race.trackId absent", () => {
    const race = createMockRace({ trackId: undefined });
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(record).not.toBeNull();
    expect(record!.trackId).toBe("test-track");
  });

  it("falls back to graded.surface when race.surface absent", () => {
    const race = createMockRace({
      surface: undefined,
      graded: {
        key: "k",
        grade: "G1",
        track: "Test Track",
        trackId: "test-track",
        surface: "Turf",
      },
    });
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(record).not.toBeNull();
    expect(record!.surface).toBe("Turf");
  });

  it("mixed resolution: trackId from top-level, surface from graded", () => {
    const race = createMockRace({
      trackId: "top-track",
      surface: undefined,
      graded: {
        key: "k",
        grade: "G1",
        track: "Graded Track",
        trackId: "graded-track",
        surface: "Synthetic",
      },
    });
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(record).not.toBeNull();
    expect(record!.trackId).toBe("top-track");
    expect(record!.surface).toBe("Synthetic");
  });

  it("mixed resolution: trackId from graded, surface from top-level", () => {
    const race = createMockRace({
      trackId: undefined,
      surface: "Dirt",
      graded: {
        key: "k",
        grade: "G1",
        track: "Graded Track",
        trackId: "graded-track",
        surface: "Turf",
      },
    });
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(record).not.toBeNull();
    expect(record!.trackId).toBe("graded-track");
    expect(record!.surface).toBe("Dirt");
  });

  // ── trackName resolution ──

  it("uses graded.track for trackName", () => {
    const race = createMockRace({
      graded: { key: "k", grade: "G1", track: "Churchill Downs", trackId: "cd", surface: "Dirt" },
    });
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(record!.trackName).toBe("Churchill Downs");
  });

  it("falls back to 'Unknown Track' when graded is absent", () => {
    const race = createMockRace({ graded: undefined, trackId: "top-track", surface: "Dirt" });
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(record!.trackName).toBe("Unknown Track");
  });

  it("falls back to 'Unknown Track' when graded.track is empty string", () => {
    const race = createMockRace({
      graded: { key: "k", grade: "G1", track: "", trackId: "test-track", surface: "Dirt" },
    });
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(record!.trackName).toBe("Unknown Track");
  });

  // ── Key isolation tests ──

  it("different distance produces separate record (different key)", () => {
    const race = createMockRace({ distance: 2000 });
    const existing: Record<string, TrackRecord> = {
      "test-track_Dirt_1600": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 90,
        horseId: "h",
        horseName: "H",
        day: 50,
        year: 1,
      },
    };
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100, existing);
    expect(record).not.toBeNull();
    expect(record!.distance).toBe(2000);
  });

  it("different surface produces separate record (different key)", () => {
    const race = createMockRace({
      surface: "Turf",
      graded: {
        key: "k",
        grade: "G1",
        track: "Test Track",
        trackId: "test-track",
        surface: "Turf",
      },
    });
    const existing: Record<string, TrackRecord> = {
      "test-track_Dirt_1600": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 90,
        horseId: "h",
        horseName: "H",
        day: 50,
        year: 1,
      },
    };
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100, existing);
    expect(record).not.toBeNull();
    expect(record!.surface).toBe("Turf");
  });

  it("different track produces separate record (different key)", () => {
    const race = createMockRace({
      trackId: "track-b",
      graded: { key: "k", grade: "G1", track: "Track B", trackId: "track-b", surface: "Dirt" },
    });
    const existing: Record<string, TrackRecord> = {
      "track-a_Dirt_1600": {
        trackId: "track-a",
        trackName: "Track A",
        surface: "Dirt",
        distance: 1600,
        time: 90,
        horseId: "h",
        horseName: "H",
        day: 50,
        year: 1,
      },
    };
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100, existing);
    expect(record).not.toBeNull();
    expect(record!.trackId).toBe("track-b");
  });

  // ── Year calculation ──

  it("calculates year correctly for day 366 (year 2)", () => {
    const race = createMockRace();
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 366);
    expect(record!.year).toBe(2);
  });

  // ── Surface type coverage ──

  it.each(["Turf", "Dirt", "Synthetic"] as const)("works with surface type %s", (surface) => {
    const race = createMockRace({
      surface,
      graded: { key: "k", grade: "G1", track: "Test Track", trackId: "test-track", surface },
    });
    const record = checkTrackRecord(race, "winner-1", "Champ", 100, 100);
    expect(record).not.toBeNull();
    expect(record!.surface).toBe(surface);
  });
});

// ─── ageBucket ────────────────────────────────────────────────────────────

describe("ageBucket", () => {
  it("returns null for age 0", () => {
    expect(ageBucket(0)).toBeNull();
  });

  it("returns null for age 1", () => {
    expect(ageBucket(1)).toBeNull();
  });

  it("returns null for age below 2 (fractional)", () => {
    expect(ageBucket(1.9)).toBeNull();
  });

  it("returns '2yo' for age 2", () => {
    expect(ageBucket(2)).toBe("2yo");
  });

  it("returns '3yo' for age 3", () => {
    expect(ageBucket(3)).toBe("3yo");
  });

  it("returns '4yo' for age 4", () => {
    expect(ageBucket(4)).toBe("4yo");
  });

  it("returns '5yo+' for age 5", () => {
    expect(ageBucket(5)).toBe("5yo+");
  });

  it("returns '5yo+' for ages above 5", () => {
    expect(ageBucket(6)).toBe("5yo+");
    expect(ageBucket(10)).toBe("5yo+");
  });

  it("floors fractional ages", () => {
    expect(ageBucket(2.9)).toBe("2yo");
    expect(ageBucket(4.99)).toBe("4yo");
  });

  it("returns null for negative ages", () => {
    expect(ageBucket(-1)).toBeNull();
  });
});

// ─── genderBucket ─────────────────────────────────────────────────────────

describe("genderBucket", () => {
  it("returns 'Female' for 'filly'", () => {
    expect(genderBucket("filly")).toBe("Female");
  });

  it("returns 'Female' for 'mare'", () => {
    expect(genderBucket("mare")).toBe("Female");
  });

  it("returns 'Male' for 'colt'", () => {
    expect(genderBucket("colt")).toBe("Male");
  });

  it("returns 'Male' for 'horse'", () => {
    expect(genderBucket("horse")).toBe("Male");
  });

  it("returns 'Male' for 'gelding'", () => {
    expect(genderBucket("gelding")).toBe("Male");
  });

  it("returns null for undefined", () => {
    expect(genderBucket(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(genderBucket("")).toBeNull();
  });

  it("returns null for unrecognized gender", () => {
    expect(genderBucket("stallion")).toBeNull();
  });
});

// ─── checkTrackRecords ────────────────────────────────────────────────────

describe("checkTrackRecords", () => {
  // ── Guard tests ──

  it("returns empty array when trackId missing", () => {
    const race = createMockRace({ graded: undefined, trackId: undefined });
    const records = checkTrackRecords(race, { id: "w", name: "Champ" }, 100, 100);
    expect(records).toEqual([]);
  });

  it("returns empty array when surface missing", () => {
    const race = createMockRace({
      graded: undefined,
      trackId: "test-track",
      surface: undefined,
    });
    const records = checkTrackRecords(race, { id: "w", name: "Champ" }, 100, 100);
    expect(records).toEqual([]);
  });

  // ── Candidate generation ──

  it("returns only overall when no age/gender/grade/condition", () => {
    const race = createMockRace({ trackCondition: undefined });
    race.graded = { key: "k", track: "Test Track", trackId: "test-track", surface: "Dirt" } as any;
    const records = checkTrackRecords(
      race,
      { id: "w", name: "Champ", age: 1, gender: undefined },
      100,
      100,
    );
    expect(records).toHaveLength(1);
    expect(records[0].categoryKind).toBe("overall");
  });

  it("returns 5 records when all categories apply", () => {
    const race = createMockRace({ trackCondition: "fast" });
    const records = checkTrackRecords(
      race,
      { id: "w", name: "Champ", age: 3, gender: "colt" },
      100,
      100,
    );
    expect(records).toHaveLength(5);
    const kinds = records.map((r) => r.categoryKind);
    expect(kinds).toContain("overall");
    expect(kinds).toContain("age");
    expect(kinds).toContain("gender");
    expect(kinds).toContain("grade");
    expect(kinds).toContain("condition");
  });

  it("returns 3 records (overall, age, gender) when no grade and no trackCondition", () => {
    const race = createMockRace({ trackCondition: undefined });
    // Remove grade from race
    race.graded = { key: "k", track: "Test Track", trackId: "test-track", surface: "Dirt" } as any;
    const records = checkTrackRecords(
      race,
      { id: "w", name: "Champ", age: 3, gender: "colt" },
      100,
      100,
    );
    expect(records).toHaveLength(3);
    const kinds = records.map((r) => r.categoryKind);
    expect(kinds).toContain("overall");
    expect(kinds).toContain("age");
    expect(kinds).toContain("gender");
  });

  it("returns only overall when age < 2 and no gender/grade/condition", () => {
    const race = createMockRace({ trackCondition: undefined });
    race.graded = { key: "k", track: "Test Track", trackId: "test-track", surface: "Dirt" } as any;
    const records = checkTrackRecords(
      race,
      { id: "w", name: "Champ", age: 1, gender: undefined },
      100,
      100,
    );
    expect(records).toHaveLength(1);
    expect(records[0].categoryKind).toBe("overall");
  });

  // ── Time comparison ──

  it("filters out candidates that don't beat existing records", () => {
    const race = createMockRace();
    const existing: Record<string, TrackRecord> = {
      "test-track_Dirt_1600_overall": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 90,
        horseId: "old",
        horseName: "Old",
        day: 50,
        year: 1,
        categoryKind: "overall",
      },
      "test-track_Dirt_1600_grade:G1": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 90,
        horseId: "old",
        horseName: "Old",
        day: 50,
        year: 1,
        categoryKind: "grade",
        categoryValue: "G1",
      },
    };
    const records = checkTrackRecords(
      race,
      { id: "w", name: "Champ", age: 3, gender: "colt" },
      100,
      100,
      existing,
    );
    // Overall and grade filtered out (100 > 90), but age/gender have no existing records
    const kinds = records.map((r) => r.categoryKind);
    expect(kinds).not.toContain("overall");
    expect(kinds).not.toContain("grade");
    expect(kinds).toContain("age");
    expect(kinds).toContain("gender");
  });

  it("returns candidate when existing time is slower", () => {
    const race = createMockRace({ trackCondition: undefined });
    race.graded = { key: "k", track: "Test Track", trackId: "test-track", surface: "Dirt" } as any;
    const existing: Record<string, TrackRecord> = {
      "test-track_Dirt_1600_overall": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 120,
        horseId: "old",
        horseName: "Old",
        day: 50,
        year: 1,
        categoryKind: "overall",
      },
    };
    const records = checkTrackRecords(race, { id: "w", name: "Champ" }, 100, 100, existing);
    expect(records).toHaveLength(1);
    expect(records[0].time).toBe(100);
    expect(records[0].horseId).toBe("w");
  });

  it("excludes candidate when time equals existing (strict less-than)", () => {
    const race = createMockRace({ trackCondition: undefined });
    race.graded = { key: "k", track: "Test Track", trackId: "test-track", surface: "Dirt" } as any;
    const existing: Record<string, TrackRecord> = {
      "test-track_Dirt_1600_overall": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 100,
        horseId: "old",
        horseName: "Old",
        day: 50,
        year: 1,
        categoryKind: "overall",
      },
    };
    const records = checkTrackRecords(race, { id: "w", name: "Champ" }, 100, 100, existing);
    expect(records).toHaveLength(0);
  });

  // ── Legacy key fallback ──

  it("falls back to legacy un-suffixed key for overall category", () => {
    const race = createMockRace({ trackCondition: undefined });
    race.graded = { key: "k", track: "Test Track", trackId: "test-track", surface: "Dirt" } as any;
    const existing: Record<string, TrackRecord> = {
      "test-track_Dirt_1600": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 90,
        horseId: "old",
        horseName: "Old",
        day: 50,
        year: 1,
      },
    };
    const records = checkTrackRecords(race, { id: "w", name: "Champ" }, 100, 100, existing);
    // Legacy key found, existing time 90 < new time 100 → overall excluded
    expect(records).toHaveLength(0);
  });

  it("does NOT fall back to legacy key for non-overall categories", () => {
    const race = createMockRace({ trackCondition: undefined });
    race.graded = { key: "k", track: "Test Track", trackId: "test-track", surface: "Dirt" } as any;
    const existing: Record<string, TrackRecord> = {
      "test-track_Dirt_1600": {
        trackId: "test-track",
        trackName: "Test Track",
        surface: "Dirt",
        distance: 1600,
        time: 90,
        horseId: "old",
        horseName: "Old",
        day: 50,
        year: 1,
      },
    };
    const records = checkTrackRecords(
      race,
      { id: "w", name: "Champ", age: 3, gender: "colt" },
      100,
      100,
      existing,
    );
    // Overall excluded (legacy fallback found, 90 < 100 → excluded)
    // Age/gender have no existing records → included
    const kinds = records.map((r) => r.categoryKind);
    expect(kinds).not.toContain("overall");
    expect(kinds).toContain("age");
    expect(kinds).toContain("gender");
  });

  // ── Field mapping ──

  it("verifies field mapping on returned records", () => {
    const race = createMockRace({
      id: "race-xyz",
      name: "Big Race",
      day: 200,
      distance: 1800,
      trackCondition: "fast",
    });
    const records = checkTrackRecords(
      race,
      { id: "winner-1", name: "Champ", age: 4, gender: "mare" },
      95.5,
      200,
    );
    const overall = records.find((r) => r.categoryKind === "overall")!;
    expect(overall.trackId).toBe("test-track");
    expect(overall.trackName).toBe("Test Track");
    expect(overall.surface).toBe("Dirt");
    expect(overall.distance).toBe(1800);
    expect(overall.time).toBe(95.5);
    expect(overall.horseId).toBe("winner-1");
    expect(overall.horseName).toBe("Champ");
    expect(overall.day).toBe(200);
    expect(overall.raceId).toBe("race-xyz");
    expect(overall.raceName).toBe("Big Race");

    const ageRecord = records.find((r) => r.categoryKind === "age")!;
    expect(ageRecord.categoryValue).toBe("4yo");

    const genderRecord = records.find((r) => r.categoryKind === "gender")!;
    expect(genderRecord.categoryValue).toBe("Female");

    const conditionRecord = records.find((r) => r.categoryKind === "condition")!;
    expect(conditionRecord.categoryValue).toBe("fast");
  });

  it("uses race.trackId and race.surface (top-level priority over graded)", () => {
    const race = createMockRace({
      trackId: "top-level-track",
      surface: "Turf",
      graded: {
        key: "k",
        grade: "G1",
        track: "Graded Track",
        trackId: "graded-track",
        surface: "Dirt",
      },
    });
    const records = checkTrackRecords(race, { id: "w", name: "Champ" }, 100, 100);
    expect(records[0].trackId).toBe("top-level-track");
    expect(records[0].surface).toBe("Turf");
  });
});
