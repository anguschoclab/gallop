import { describe, it, expect, vi } from "vitest";
import { raceResolutionPhase } from "@/core/time/phases/raceResolution";
import { PipelineContext } from "@/core/time/pipeline";
import { Race, Horse } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

// Mock simulateRace to return a G1 win
vi.mock("@/services/race/raceSimulationExecutor", () => ({
  simulateRace: vi.fn((race) => ({
    result: [{ horseId: "winner-1", position: 1, time: 100.5 }],
    runners: [
      {
        horseId: "winner-1",
        name: "Champ",
        silk: "#f00",
        owned: true,
        jockeyId: "j-1",
        jockeyName: "Top Jockey",
      },
    ],
    snapshots: [],
  })),
}));

describe("Race Resolution History Collection", () => {
  it("should generate a SeasonHistoryImpact for G1 races", () => {
    const race: Partial<Race> = {
      id: "race-1",
      name: "Kentucky Derby",
      day: 100,
      resolved: false,
      graded: {
        key: "ky-derby",
        grade: "G1",
        track: "Churchill Downs",
        trackId: "churchill-downs",
        surface: "Dirt",
      },
      entries: [{ horseId: "winner-1", jockeyId: "j-1", owned: true }],
    };

    const horse = createTestHorse({ id: "winner-1", name: "Champ", owned: true });

    const context: Partial<PipelineContext> = {
      newDay: 100,
      state: {
        races: r2r([race as Race]),
        horses: h2r([horse as Horse]),
        hallOfFame: [],
        seasonRecords: [],
      } as any,
      intents: [],
      impacts: [],
      horseMap: new Map([[horse.id, horse as Horse]]),
      raceMap: new Map([[race.id!, race as Race]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
    };

    const result = raceResolutionPhase.execute(context as PipelineContext);

    const historyImpact = result.impacts?.find((i) => i.type === "season_history_record");
    expect(historyImpact).toBeDefined();
    expect((historyImpact as any).record.raceName).toBe("Kentucky Derby");
    expect((historyImpact as any).record.winnerName).toBe("Champ");
  });

  it("should generate a HallOfFameInductionImpact if horse crosses threshold", () => {
    const race: Partial<Race> = {
      id: "race-1",
      name: "The Big One",
      day: 100,
      resolved: false,
      graded: {
        key: "big-one",
        grade: "G1",
        track: "Churchill Downs",
        trackId: "churchill-downs",
        surface: "Dirt",
      },
      purse: 2000000, // Winner gets 1.2M
      entries: [{ horseId: "winner-1", jockeyId: "j-1", owned: true }],
    };

    const horse = createTestHorse({ id: "winner-1", name: "Champ", owned: true, careerWins: 2 });
    horse.raceHistory = [
      { raceId: "race-1", raceName: "G1 Race 1", grade: "G1", position: 1, day: 10 },
      { raceId: "race-2", raceName: "G1 Race 2", grade: "G1", position: 1, day: 20 },
    ];

    const context: Partial<PipelineContext> = {
      newDay: 100,
      state: {
        races: r2r([race as Race]),
        horses: h2r([horse as Horse]),
        hallOfFame: [],
        seasonRecords: [],
      } as any,
      intents: [],
      impacts: [],
      horseMap: new Map([[horse.id, horse as Horse]]),
      raceMap: new Map([[race.id!, race as Race]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
    };

    const result = raceResolutionPhase.execute(context as PipelineContext);

    const hofImpact = result.impacts?.find((i) => i.type === "hall_of_fame_induction");
    expect(hofImpact).toBeDefined();
    expect((hofImpact as any).entry.name).toBe("Champ");
  });
});
