import { describe, it, expect } from "vitest";
import { buildRaceField } from "@/services/race/raceSimulationService";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Race } from "@/game/types";

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "test-race",
    name: "Test Race",
    day: 1,
    distance: 1600,
    surface: "Turf",
    raceClass: "Maiden",
    trackId: "test-track",
    fieldSize: 8,
    entries: [
      {
        horseId: "owned-1",
        owned: true,
        weight: 55,
      },
    ],
    resolved: false,
    ...overrides,
  } as Race;
}

describe("filler jockeys", () => {
  it("gives every filler runner a jockey and jockeyInstructions", () => {
    const race = makeRace({ fieldSize: 4 });
    const horses = [createTestHorse({ id: "owned-1", name: "Owned" })];
    const { runners, fillerHorses } = buildRaceField({ race, horses, jockeys: [] });

    expect(runners.length).toBe(4);
    expect(fillerHorses.length).toBe(3);

    // Fillers (not in race.entries) should have ephemeral jockeys and instructions
    for (const runner of runners) {
      const isFiller = fillerHorses.some((h) => h.id === runner.horseId);
      if (isFiller) {
        expect(runner.jockey).toBeDefined();
        expect(runner.jockeyInstructions).toBeDefined();
      }
    }
  });

  it("produces consistent runner and filler counts for the same race id", () => {
    const race = makeRace({ fieldSize: 6 });
    const horses = [createTestHorse({ id: "owned-1", name: "Owned" })];

    const a = buildRaceField({ race, horses, jockeys: [] });
    const b = buildRaceField({ race, horses, jockeys: [] });

    expect(a.runners.length).toBe(b.runners.length);
    expect(a.fillerHorses.length).toBe(b.fillerHorses.length);

    // All fillers should have jockeys and instructions (same count on both runs)
    const aFillers = new Set(a.fillerHorses.map((h) => h.id));
    const bFillers = new Set(b.fillerHorses.map((h) => h.id));

    const aWithJockey = a.runners.filter((r) => aFillers.has(r.horseId) && r.jockey !== undefined).length;
    const bWithJockey = b.runners.filter((r) => bFillers.has(r.horseId) && r.jockey !== undefined).length;
    expect(aWithJockey).toBe(bWithJockey);
    expect(aWithJockey).toBe(a.fillerHorses.length); // all fillers have jockeys

    const aWithInstructions = a.runners.filter((r) => aFillers.has(r.horseId) && r.jockeyInstructions !== undefined).length;
    const bWithInstructions = b.runners.filter((r) => bFillers.has(r.horseId) && r.jockeyInstructions !== undefined).length;
    expect(aWithInstructions).toBe(bWithInstructions);
    expect(aWithInstructions).toBe(a.fillerHorses.length); // all fillers have instructions
  });
});
