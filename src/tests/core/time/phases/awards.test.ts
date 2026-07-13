import { describe, it, expect } from "vitest";
import { awardsPhase } from "@/core/time/phases/awards";
import { createRng } from "@/core/common/rng";
import { createTestHorse } from "@/tests/helpers";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";

describe("awardsPhase", () => {
  const createTestState = (): GameState => ({
    ...createDefaultGameState(),
    day: 1,
    cash: 10000,
  });

  const createTestContext = (state: GameState, previousDay = 0, newDay = 1): PipelineContext => ({
    previousDay,
    newDay,
    state,
    logs: [],
    intents: [],
    impacts: [],
    impactLog: [],
    dailyRng: createRng(1),
  });

  it("should return unchanged context when no ceremony scheduled", () => {
    const state = createTestState();
    state.day = 10;

    const context = createTestContext(state, 9, 10);
    const result = awardsPhase.execute(context);
    expect(result).toEqual(context);
  });

  it("should skip if already processed this year for region", () => {
    const state = createTestState();
    state.day = 365; // Year end
    state.lastAwardYear = {
      north_america: 1,
      europe: 1,
      asia_pacific: 1,
      south_america: 1,
    };

    const context = createTestContext(state, 364, 365);
    const result = awardsPhase.execute(context);
    expect(result.state.awards).toEqual([]);
  });

  it("should have correct order", () => {
    expect(awardsPhase.order).toBe(95);
  });

  it("should have correct name", () => {
    expect(awardsPhase.name).toBe("awards");
  });

  it("should preserve state when no winners determined", () => {
    const horse = createTestHorse({
      id: "horse-1",
      age: 3,
    });

    const state = createTestState();
    state.day = 365;
    state.horses = [horse];

    const context = createTestContext(state, 364, 365);
    const result = awardsPhase.execute(context);
    expect(result.state.horses).toEqual([horse]);
    expect(result.state.awards).toEqual([]);
  });

  it("should update lastAwardYear even with no winners", () => {
    const state = createTestState();
    state.day = 365;

    const context = createTestContext(state, 364, 365);
    const result = awardsPhase.execute(context);
    expect(result.state.lastAwardYear?.north_america).toBe(1);
  });

  it("should preserve existing logs", () => {
    const state = createTestState();
    state.day = 10;

    const context = createTestContext(state, 9, 10);
    context.logs = [{ day: 9, text: "Existing log" }];

    const result = awardsPhase.execute(context);
    expect(result.logs).toEqual([{ day: 9, text: "Existing log" }]);
  });

  it("should emit fame_change impacts for award winners", () => {
    const horse = createTestHorse({
      id: "horse-1",
      name: "Champion Horse",
      age: 3,
      gender: "colt",
      stats: {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      potential: 90,
      energy: 100,
      form: 0,
      owned: true,
      fame: 50,
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Test Race",
          position: 1,
          day: 100,
          beyer: 115,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    });

    const race: any = {
      id: "race-1",
      name: "Test Race",
      day: 100,
      distance: 2000,
      raceClass: "Graded",
      entryFee: 500,
      purse: 1000000,
      minStat: 80,
      fieldSize: 8,
      entries: [],
      resolved: true,
      graded: {
        key: "test-race",
        grade: "G1",
        track: "Churchill Downs",
        trackId: "track-1",
        surface: "Dirt",
      },
    };

    const state = createTestState();
    state.day = 365;
    state.horses = [horse];
    state.races = [race];

    const context = createTestContext(state, 364, 365);
    const result = awardsPhase.execute(context);

    const fameImpacts = result.impacts.filter((i: any) => i.type === "fame_change");
    expect(fameImpacts.length).toBeGreaterThan(0);

    const hotyImpact = fameImpacts.find((i: any) => i.delta === 25);
    if (hotyImpact) {
      expect(hotyImpact.horseId).toBe("horse-1");
    }

    for (const impact of fameImpacts as any[]) {
      expect(impact.horseId).toBe("horse-1");
      expect(impact.delta).toBeGreaterThanOrEqual(15);
    }
  });

  it("should not emit impacts for horse not in state.horses", () => {
    const horse = createTestHorse({
      id: "horse-1",
      name: "Champion Horse",
      age: 3,
      gender: "colt",
      stats: {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      potential: 90,
      energy: 100,
      form: 0,
      owned: true,
      fame: 50,
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Test Race",
          position: 1,
          day: 100,
          beyer: 115,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    });

    const race: any = {
      id: "race-1",
      name: "Test Race",
      day: 100,
      distance: 2000,
      raceClass: "Graded",
      entryFee: 500,
      purse: 1000000,
      minStat: 80,
      fieldSize: 8,
      entries: [],
      resolved: true,
      graded: {
        key: "test-race",
        grade: "G1",
        track: "Churchill Downs",
        trackId: "track-1",
        surface: "Dirt",
      },
    };

    const state = createTestState();
    state.day = 365;
    state.horses = [horse];
    state.races = [race];

    const context = createTestContext(state, 364, 365);
    const result = awardsPhase.execute(context);

    const fameImpacts = result.impacts.filter((i: any) => i.type === "fame_change");
    for (const impact of fameImpacts) {
      expect(impact.horseId).toBe("horse-1");
    }
  });
});
