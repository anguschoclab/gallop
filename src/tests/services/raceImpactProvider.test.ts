/**
 * raceImpactProvider.test.ts
 *
 * Integration tests for generateRaceImpacts with getId callback.
 * Verifies that all impact IDs are valid UUIDs, impact types match
 * the non-provider path, large fields work without pool exhaustion,
 * and backward compatibility is maintained.
 */

import { describe, it, expect } from "vitest";
import { generateRaceImpacts } from "@/services/race/raceImpactGenerator";
import { isValidUUID } from "@/core/uuid";
import { UUIDProvider } from "@/core/uuidProvider";
import { createRng } from "@/core/common/rng";
import { createTestColt, createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import { createTestJockey } from "@/tests/helpers/createTestJockey";
import type { Race } from "@/game/types";

function makeGradedRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-g1",
    name: "Test G1",
    day: 100,
    distance: 2000,
    purse: 1_000_000,
    entryFee: 500,
    fieldSize: 8,
    raceClass: "Stakes",
    entries: [],
    resolved: false,
    graded: {
      key: "test-g1",
      grade: "G1",
      track: "Test Track",
      trackId: "test-track",
      surface: "Turf",
    },
    ...overrides,
  } as Race;
}

function makeOpenRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-open",
    name: "Open Maiden",
    day: 100,
    distance: 1600,
    purse: 50_000,
    entryFee: 100,
    fieldSize: 8,
    raceClass: "Maiden",
    entries: [],
    resolved: false,
    ...overrides,
  } as Race;
}

describe("generateRaceImpacts with getId callback", () => {
  it("produces all valid UUID v4 impact IDs", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({ id: "j1" });
    const race = makeGradedRace({
      entries: [{ horseId: "h1", jockeyId: "j1", ownership: { type: "player" } } as any],
    });
    const rng = createRng("provider-test");
    const provider = new UUIDProvider(rng, 128);

    const impacts = generateRaceImpacts({
      race,
      result: [{ horseId: "h1", position: 1, time: 120 }],
      runners: [{ horseId: "h1" }],
      horses: [horse],
      jockeys: [jockey],
      newDay: 100,
      calibratedPars: {},
      rng,
      getId: () => provider.next(),
    });

    expect(impacts.length).toBeGreaterThan(0);
    for (const impact of impacts) {
      expect(isValidUUID(impact.id)).toBe(true);
    }
  });

  it("produces same impact types as without getId", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({ id: "j1" });
    const race = makeGradedRace({
      entries: [{ horseId: "h1", jockeyId: "j1", ownership: { type: "player" } } as any],
    });

    const baseProps = {
      race,
      result: [{ horseId: "h1", position: 1, time: 120 }],
      runners: [{ horseId: "h1" }],
      horses: [horse],
      jockeys: [jockey],
      newDay: 100,
      calibratedPars: {},
    };

    const rng1 = createRng("parity-1");
    const rng2 = createRng("parity-1");
    const provider = new UUIDProvider(rng2, 128);

    const withoutGetId = generateRaceImpacts({ ...baseProps, rng: rng1 });
    const withGetId = generateRaceImpacts({
      ...baseProps,
      rng: rng1,
      getId: () => provider.next(),
    });

    const typesWithout = new Set(withoutGetId.map((i) => i.type));
    const typesWith = new Set(withGetId.map((i) => i.type));
    expect(typesWith).toEqual(typesWithout);
  });

  it("handles large field (14 horses) without pool exhaustion errors", () => {
    const horses = Array.from({ length: 14 }, (_, i) =>
      createTestColt({ id: `h${i}`, ownership: { type: "player" } }),
    );
    const jockeys = Array.from({ length: 14 }, (_, i) => createTestJockey({ id: `j${i}` }));
    const entries = horses.map((h, i) => ({
      horseId: h.id,
      jockeyId: `j${i}`,
      ownership: { type: "player" } as any,
    }));
    const race = makeGradedRace({ fieldSize: 14, entries: entries as any });

    const rng = createRng("large-field");
    const provider = new UUIDProvider(rng, 128);

    const impacts = generateRaceImpacts({
      race,
      result: horses.map((h, i) => ({ horseId: h.id, position: i + 1, time: 120 + i })),
      runners: horses.map((h) => ({ horseId: h.id })),
      horses,
      jockeys,
      newDay: 100,
      calibratedPars: {},
      rng,
      getId: () => provider.next(),
    });

    expect(impacts.length).toBeGreaterThan(50);
    for (const impact of impacts) {
      expect(isValidUUID(impact.id)).toBe(true);
    }
  });

  it("getId is optional — omitting it falls back to generateUUID(rng)", () => {
    const horse = createTestColt({ id: "h1" });
    const impacts = generateRaceImpacts({
      race: makeOpenRace(),
      result: [{ horseId: "h1", position: 1, time: 120 }],
      runners: [{ horseId: "h1" }],
      horses: [horse],
      jockeys: [],
      newDay: 100,
      calibratedPars: {},
      rng: createRng("no-getid"),
    });

    expect(impacts.length).toBeGreaterThan(0);
    for (const impact of impacts) {
      expect(isValidUUID(impact.id)).toBe(true);
    }
  });

  it("with seeded rng + getId produces deterministic impact IDs", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({ id: "j1" });
    const race = makeGradedRace({
      entries: [{ horseId: "h1", jockeyId: "j1", ownership: { type: "player" } } as any],
    });

    const baseProps = {
      race,
      result: [{ horseId: "h1", position: 1, time: 120 }],
      runners: [{ horseId: "h1" }],
      horses: [horse],
      jockeys: [jockey],
      newDay: 100,
      calibratedPars: {},
    };

    const run1 = generateRaceImpacts({
      ...baseProps,
      rng: createRng("det-seed"),
      getId: (() => {
        const p = new UUIDProvider(createRng("det-seed"), 128);
        return () => p.next();
      })(),
    });

    const run2 = generateRaceImpacts({
      ...baseProps,
      rng: createRng("det-seed"),
      getId: (() => {
        const p = new UUIDProvider(createRng("det-seed"), 128);
        return () => p.next();
      })(),
    });

    const ids1 = run1.map((i) => i.id);
    const ids2 = run2.map((i) => i.id);
    expect(ids1).toEqual(ids2);
  });
});
