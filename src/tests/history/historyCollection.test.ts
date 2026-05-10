import { describe, it, expect, vi } from "vitest";
import { raceResolutionPhase } from "@/core/time/phases/raceResolution";
import { PipelineContext } from "@/core/time/pipeline";
import { Race, Horse } from "@/game/types";

// Mock simulateRace to return a G1 win
vi.mock("@/services/raceSimulationExecutor", () => ({
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
      graded: { grade: "G1", classification: "Stakes" },
      runners: ["winner-1"],
      entries: [{ horseId: "winner-1", jockeyId: "j-1", entryFee: 0 }],
    };

    const horse: Partial<Horse> = {
      id: "winner-1",
      name: "Champ",
      owned: true,
      raceHistory: [],
      lifetimeEarnings: 0,
      careerWins: 0,
    };

    const context: Partial<PipelineContext> = {
      newDay: 100,
      state: {
        races: [race as Race],
        horses: [horse as Horse],
        hallOfFame: [],
        seasonRecords: [],
      } as any,
      intents: [],
      impacts: [],
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
      graded: { grade: "G1", classification: "Stakes" },
      purse: 2000000, // Winner gets 1.2M
      runners: ["winner-1"],
      entries: [{ horseId: "winner-1", jockeyId: "j-1", entryFee: 0 }],
    };

    const horse: Partial<Horse> = {
      id: "winner-1",
      name: "Champ",
      owned: true,
      raceHistory: [
        { grade: "G1", position: 1, day: 10 },
        { grade: "G1", position: 1, day: 20 },
      ],
      lifetimeEarnings: 0,
      careerWins: 2,
    };

    const context: Partial<PipelineContext> = {
      newDay: 100,
      state: {
        races: [race as Race],
        horses: [horse as Horse],
        hallOfFame: [],
        seasonRecords: [],
      } as any,
      intents: [],
      impacts: [],
    };

    const result = raceResolutionPhase.execute(context as PipelineContext);

    const hofImpact = result.impacts?.find((i) => i.type === "hall_of_fame_induction");
    expect(hofImpact).toBeDefined();
    expect((hofImpact as any).entry.name).toBe("Champ");
  });
});
