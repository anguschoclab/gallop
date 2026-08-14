import { describe, it, expect } from "vitest";
import { RacingHandler } from "@/core/resolver/handlers/RacingHandler";
import type { GameState } from "@/game/store/state";
import type { Horse } from "@/game/types";
import type {
  RaceEntryImpact,
  RaceWithdrawalImpact,
  RaceResultImpact,
  RaceHistoryImpact,
  ClaimingImpact,
  TacticsImpact,
  RaceResultAdjustmentImpact,
} from "@/core/resolver/impacts/index";
import type {
  JockeyContractImpact,
  JockeyAssignmentImpact,
  JockeySilkImpact,
  JockeyStatsImpact,
  JockeyAffinityImpact,
} from "@/core/resolver/impacts/index";
import type { TripleCrownProgressImpact } from "@/core/resolver/impacts/index";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import type { Race } from "@/game/types";

describe("RacingHandler", () => {
  it("race_entry adds entry to race", () => {
    const handler = new RacingHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star", stableId: "" }] as unknown as Horse[]),
      races: r2r([{ id: "race-1", entries: [], entryFee: 1000 }] as unknown as Race[]),
    } as unknown as GameState;

    const impact: RaceEntryImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "race_entry",
      raceId: "race-1",
      horseId: "h1",
      jockeyId: "j1",
      weight: 120,
      entryFee: 1000,
      reason: "Entered race",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(Object.keys(draft.races["race-1"].entries)).toHaveLength(1);
    expect(draft.races["race-1"].entries[0].horseId).toBe("h1");
    expect(draft.races["race-1"].entries[0].jockeyId).toBe("j1");
    expect(draft.races["race-1"].entries[0].owned).toBe(true);
  });

  it("race_withdrawal removes entry from race", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: r2r([
        { id: "race-1", entries: [{ horseId: "h1", jockeyId: "j1", owned: true }] },
      ] as unknown as Race[]),
    } as unknown as GameState;

    const impact: RaceWithdrawalImpact = {
      id: "imp-1",
      intentId: "",
      day: 12,
      phase: "raceResolution",
      logLevel: "always",
      type: "race_withdrawal",
      raceId: "race-1",
      horseId: "h1",
      refundAmount: 1000,
      reason: "Withdrawn",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(Object.keys(draft.races["race-1"].entries)).toHaveLength(0);
  });

  it("race_result sets result, resolved, and snapshots", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: r2r([{ id: "race-1", entries: [], resolved: false }] as unknown as Race[]),
    } as unknown as GameState;

    const results = [{ horseId: "h1", position: 1, time: 90.5 }];
    const snapshots = [{ t: 0, horses: [] }];

    const impact: RaceResultImpact = {
      id: "imp-1",
      intentId: "",
      day: 15,
      phase: "raceResolution",
      logLevel: "always",
      type: "race_result",
      raceId: "race-1",
      results,
      snapshots,
      reason: "Race finished",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.races["race-1"].resolved).toBe(true);
    expect(draft.races["race-1"].result).toEqual(results);
    expect(draft.races["race-1"].snapshots).toEqual(snapshots);
  });

  it("jockey_contract sets stableId and contractUntil", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: {},
      jockeys: [{ id: "j1", name: "Bob", careerWins: 0 }],
    } as unknown as GameState;

    const impact: JockeyContractImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "jockey_contract",
      jockeyId: "j1",
      stableId: "player",
      contractUntil: 365,
      reason: "Contract signed",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.jockeys[0].stableId).toBe("player");
    expect(draft.jockeys[0].contractUntil).toBe(365);
  });

  it("jockey_assignment updates entry jockeyId", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: r2r([
        { id: "race-1", entries: [{ horseId: "h1", jockeyId: "j1", owned: true }] },
      ] as unknown as Race[]),
    } as unknown as GameState;

    const impact: JockeyAssignmentImpact = {
      id: "imp-1",
      intentId: "",
      day: 11,
      phase: "managementResolution",
      logLevel: "always",
      type: "jockey_assignment",
      raceId: "race-1",
      horseId: "h1",
      jockeyId: "j2",
      reason: "Reassigned",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.races["race-1"].entries[0].jockeyId).toBe("j2");
  });

  it("jockey_silk updates jockey silk", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: {},
      jockeys: [{ id: "j1", name: "Bob" }],
    } as unknown as GameState;

    const impact: JockeySilkImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "jockey_silk",
      jockeyId: "j1",
      silk: { pattern: "solid", primary: "#ff0000", secondary: "#0000ff", cap: "#ffffff" },
      reason: "Silk rerolled",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.jockeys[0].silk).toEqual(impact.silk);
  });

  it("jockey_stats updates stats and handles apprenticeProgression", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: {},
      jockeys: [{ id: "j1", name: "Bob", careerWins: 5, isApprentice: true }],
    } as unknown as GameState;

    const impact: JockeyStatsImpact = {
      id: "imp-1",
      intentId: "",
      day: 20,
      phase: "raceResolution",
      logLevel: "always",
      type: "jockey_stats",
      jockeyId: "j1",
      careerStarts: 30,
      careerWins: 8,
      fame: 15,
      apprenticeProgression: {
        jockeyId: "j1",
        status: "journeyman",
        careerWins: 8,
        apprenticeWins: 5,
        startDate: 1,
      },
      reason: "Stats updated",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.jockeys[0].careerStarts).toBe(30);
    expect(draft.jockeys[0].careerWins).toBe(8);
    expect(draft.jockeys[0].fame).toBe(15);
    expect(draft.jockeys[0].isApprentice).toBe(false);
    expect(draft.jockeys[0].apprenticeProgression.status).toBe("journeyman");
  });

  it("claiming transfers horse ownership", () => {
    const handler = new RacingHandler();
    const state = {
      horses: h2r([
        { id: "h1", name: "Star", stableId: "stable-1", owned: false },
      ] as unknown as Horse[]),
      races: {},
    } as unknown as GameState;

    const impact: ClaimingImpact = {
      id: "imp-1",
      intentId: "",
      day: 15,
      phase: "raceResolution",
      logLevel: "always",
      type: "claiming",
      raceId: "race-1",
      horseId: "h1",
      toStableId: "",
      claimingPrice: 25000,
      reason: "Claimed by player",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].stableId).toBe("");
    expect(draft.horses["h1"].owned).toBe(true);
  });

  it("triple_crown_progress creates new entry", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: {},
      triplecrownHistory: [],
    } as unknown as GameState;

    const impact: TripleCrownProgressImpact = {
      id: "imp-1",
      intentId: "",
      day: 100,
      phase: "raceResolution",
      logLevel: "always",
      type: "triple_crown_progress",
      horseId: "h1",
      triplecrownKey: "us_3yo",
      year: 2024,
      legs: [{ raceKey: "race-1", position: 1, day: 50 }],
      won: false,
      reason: "Triple crown progress",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.triplecrownHistory).toHaveLength(1);
    expect(draft.triplecrownHistory[0].horseId).toBe("h1");
    expect(draft.triplecrownHistory[0].legs).toHaveLength(1);
  });

  it("triple_crown_progress updates existing entry", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: {},
      triplecrownHistory: [
        { horseId: "h1", triplecrownKey: "us_3yo", year: 2024, legs: 2, won: false },
      ],
    } as unknown as GameState;

    const impact: TripleCrownProgressImpact = {
      id: "imp-1",
      intentId: "",
      day: 120,
      phase: "raceResolution",
      logLevel: "always",
      type: "triple_crown_progress",
      horseId: "h1",
      triplecrownKey: "us_3yo",
      year: 2024,
      legs: [
        { raceKey: "race-1", position: 1, day: 50 },
        { raceKey: "race-2", position: 1, day: 80 },
        { raceKey: "race-3", position: 1, day: 120 },
      ],
      won: true,
      reason: "Triple crown won",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.triplecrownHistory).toHaveLength(1);
    expect(draft.triplecrownHistory[0].legs).toHaveLength(3);
    expect(draft.triplecrownHistory[0].won).toBe(true);
  });

  it("triple_crown_progress finds existing entry by composite key when multiple entries exist", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: {},
      triplecrownHistory: [
        {
          horseId: "h1",
          triplecrownKey: "us_3yo",
          year: 2023,
          legs: [{ raceKey: "r1", position: 1, day: 50 }],
          won: false,
        },
        {
          horseId: "h2",
          triplecrownKey: "us_3yo",
          year: 2024,
          legs: [{ raceKey: "r2", position: 2, day: 60 }],
          won: false,
        },
        {
          horseId: "h1",
          triplecrownKey: "uk_3yo",
          year: 2024,
          legs: [{ raceKey: "r3", position: 1, day: 70 }],
          won: false,
        },
      ],
    } as unknown as GameState;

    const impact: TripleCrownProgressImpact = {
      id: "imp-1",
      intentId: "",
      day: 120,
      phase: "raceResolution",
      logLevel: "always",
      type: "triple_crown_progress",
      horseId: "h2",
      triplecrownKey: "us_3yo",
      year: 2024,
      legs: [
        { raceKey: "r2", position: 1, day: 60 },
        { raceKey: "r4", position: 1, day: 120 },
      ],
      won: false,
      reason: "Updated",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    // Only the matching entry (h2:us_3yo:2024) should be updated
    expect(draft.triplecrownHistory).toHaveLength(3);
    const updated = draft.triplecrownHistory.find(
      (t: any) => t.horseId === "h2" && t.triplecrownKey === "us_3yo" && t.year === 2024,
    );
    expect(updated.legs).toHaveLength(2);
    expect(updated.won).toBe(false);

    // Other entries should be unchanged
    const unchanged1 = draft.triplecrownHistory.find(
      (t: any) => t.horseId === "h1" && t.triplecrownKey === "us_3yo" && t.year === 2023,
    );
    expect(unchanged1.legs).toHaveLength(1);

    const unchanged2 = draft.triplecrownHistory.find(
      (t: any) => t.horseId === "h1" && t.triplecrownKey === "uk_3yo" && t.year === 2024,
    );
    expect(unchanged2.legs).toHaveLength(1);
  });

  it("tactics updates entry jockeyInstructions", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: r2r([
        { id: "race-1", entries: [{ horseId: "h1", jockeyId: "j1", owned: true }] },
      ] as unknown as Race[]),
    } as unknown as GameState;

    const impact: TacticsImpact = {
      id: "imp-1",
      intentId: "",
      day: 11,
      phase: "managementResolution",
      logLevel: "always",
      type: "tactics",
      raceId: "race-1",
      horseId: "h1",
      jockeyInstructions: {
        horseId: "h1",
        raceId: "race-1",
        ridingStyle: "front_runner",
        earlyPosition: "lead",
        moveTiming: "early",
        aggressiveness: 70,
      },
      reason: "Tactics updated",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.races["race-1"].entries[0].jockeyInstructions.ridingStyle).toBe("front_runner");
  });

  it("race_result_adjustment adjusts and re-sorts results", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: r2r([
        {
          id: "race-1",
          entries: [],
          resolved: true,
          result: [
            { horseId: "h1", position: 1, time: 90 },
            { horseId: "h2", position: 2, time: 91 },
          ],
        },
      ] as unknown as Race[]),
    } as unknown as GameState;

    const impact: RaceResultAdjustmentImpact = {
      id: "imp-1",
      intentId: "",
      day: 16,
      phase: "raceResolution",
      logLevel: "always",
      type: "race_result_adjustment",
      raceId: "race-1",
      originalResults: [
        { horseId: "h1", position: 1, time: 90 },
        { horseId: "h2", position: 2, time: 91 },
      ],
      adjustedResults: [
        { horseId: "h1", position: 2, time: 90 },
        { horseId: "h2", position: 1, time: 91 },
      ],
      reason: "Stewards DQ",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.races["race-1"].result[0].horseId).toBe("h2");
    expect(draft.races["race-1"].result[0].position).toBe(1);
    expect(draft.races["race-1"].result[1].horseId).toBe("h1");
    expect(draft.races["race-1"].result[1].position).toBe(2);
  });

  it("race_result_adjustment handles large field with multiple simultaneous adjustments", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: r2r([
        {
          id: "race-1",
          entries: [],
          resolved: true,
          result: [
            { horseId: "h1", position: 1, time: 90 },
            { horseId: "h2", position: 2, time: 91 },
            { horseId: "h3", position: 3, time: 92 },
            { horseId: "h4", position: 4, time: 93 },
            { horseId: "h5", position: 5, time: 94 },
          ],
        },
      ] as unknown as Race[]),
    } as unknown as GameState;

    const impact: RaceResultAdjustmentImpact = {
      id: "imp-1",
      intentId: "",
      day: 16,
      phase: "raceResolution",
      logLevel: "always",
      type: "race_result_adjustment",
      raceId: "race-1",
      originalResults: [
        { horseId: "h1", position: 1, time: 90 },
        { horseId: "h2", position: 2, time: 91 },
        { horseId: "h3", position: 3, time: 92 },
        { horseId: "h4", position: 4, time: 93 },
        { horseId: "h5", position: 5, time: 94 },
      ],
      adjustedResults: [
        { horseId: "h1", position: 3, time: 90 },
        { horseId: "h2", position: 1, time: 91 },
        { horseId: "h3", position: 5, time: 92 },
        { horseId: "h4", position: 2, time: 93 },
        { horseId: "h5", position: 4, time: 94 },
      ],
      reason: "Multiple DQs",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.races["race-1"].result[0].horseId).toBe("h2");
    expect(draft.races["race-1"].result[0].position).toBe(1);
    expect(draft.races["race-1"].result[1].horseId).toBe("h4");
    expect(draft.races["race-1"].result[1].position).toBe(2);
    expect(draft.races["race-1"].result[2].horseId).toBe("h1");
    expect(draft.races["race-1"].result[2].position).toBe(3);
    expect(draft.races["race-1"].result[3].horseId).toBe("h5");
    expect(draft.races["race-1"].result[3].position).toBe(4);
    expect(draft.races["race-1"].result[4].horseId).toBe("h3");
    expect(draft.races["race-1"].result[4].position).toBe(5);
  });

  it("jockey_affinity_gain updates affinity map", () => {
    const handler = new RacingHandler();
    const state = {
      horses: {},
      races: {},
      jockeys: [{ id: "j1", name: "Bob" }],
    } as unknown as GameState;

    const impact: JockeyAffinityImpact = {
      id: "imp-1",
      intentId: "",
      day: 15,
      phase: "raceResolution",
      logLevel: "always",
      type: "jockey_affinity_gain",
      jockeyId: "j1",
      horseId: "h1",
      xp: 10,
      reason: "Affinity gained",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.jockeys[0].affinityMap["h1"]).toBe(10);
  });

  it("canHandle returns true for all racing impact types", () => {
    const handler = new RacingHandler();
    expect(handler.canHandle("race_entry")).toBe(true);
    expect(handler.canHandle("race_withdrawal")).toBe(true);
    expect(handler.canHandle("race_result")).toBe(true);
    expect(handler.canHandle("jockey_contract")).toBe(true);
    expect(handler.canHandle("jockey_assignment")).toBe(true);
    expect(handler.canHandle("jockey_silk")).toBe(true);
    expect(handler.canHandle("jockey_stats")).toBe(true);
    expect(handler.canHandle("race_history")).toBe(true);
    expect(handler.canHandle("claiming")).toBe(true);
    expect(handler.canHandle("triple_crown_progress")).toBe(true);
    expect(handler.canHandle("tactics")).toBe(true);
    expect(handler.canHandle("race_result_adjustment")).toBe(true);
    expect(handler.canHandle("jockey_affinity_gain")).toBe(true);
    expect(handler.canHandle("cash_change")).toBe(false);
  });
});
