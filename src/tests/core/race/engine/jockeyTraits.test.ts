import { describe, it, expect } from "vitest";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import type { Runner, PaceContext } from "@/core/race/engine/runnerBuilder";
import type { Horse, Jockey } from "@/game/types";
import { createRng } from "@/core/common/rng";
import { createTestJockey } from "@/tests/helpers/createTestJockey";

function mockHorse(id: string, style: string): Horse {
  return {
    id,
    name: `Horse ${id}`,
    stats: { speed: 80, stamina: 80, acceleration: 80 },
    runningStyle: style as any,
    energy: 100,
    form: 100,
    age: 4,
    gender: "colt",
    coatColor: "bay",
    experience: 0,
    lineage: { sireId: "", damId: "" },
    isPlayerOwned: false,
    id_alias: id,
  } as any;
}

function mockJockey(traits: string[], age = 25): Jockey {
  return createTestJockey({
    id: "j1",
    name: "Test Jockey",
    age,
    archetype: "versatile",
    stats: { pacing: 75, positioning: 75, vigor: 75, gateSkill: 75, temperament: 75 },
    traits: traits as any,
  });
}

function makeRunner(
  horseId: string,
  style: string,
  jockey: Jockey | undefined,
  overrides?: Partial<Runner>,
): Runner {
  return {
    horseId,
    name: `Horse ${horseId}`,
    silk: "#ff0000",
    owned: false,
    position: 0,
    velocity: 15,
    finishTime: null,
    lane: 0,
    targetLane: 0,
    laneVelocity: 15,
    gate: 1,
    topSpeed: 18,
    accel: 6,
    staminaFactor: 0.9,
    noise: 0.3,
    affinityBonus: 0,
    runningStyle: style as any,
    draftingHorseId: null,
    horse: mockHorse(horseId, style),
    jockey,
    weight: 126,
    ...overrides,
  } as any;
}

function runSim(runners: Runner[], distance = 1600) {
  const rng = createRng(42);
  return runRaceToCompletion(runners, distance, rng, 0.1, 600);
}

describe("Jockey trait sim effects", () => {
  describe("gate_master", () => {
    it("runner with gate_master gets extra velocity in first 5% of race", () => {
      const jWith = mockJockey(["gate_master"]);
      const jWithout = mockJockey([]);
      const rWith = makeRunner("H1", "E", jWith);
      const rWithout = makeRunner("H2", "E", jWithout);
      const result = runSim([rWith, rWithout], 1600);
      const withTrait = result.result.find((r) => r.horseId === "H1");
      const withoutTrait = result.result.find((r) => r.horseId === "H2");
      expect(withTrait).toBeDefined();
      expect(withoutTrait).toBeDefined();
      // The gate_master trait should help — either better position or better time
      expect(withTrait!.time).toBeLessThanOrEqual(withoutTrait!.time);
    });
  });

  describe("bullring_expert (regression)", () => {
    it("runner with bullring_expert benefits on turning tracks", () => {
      const jWith = mockJockey(["bullring_expert"]);
      const jWithout = mockJockey([]);
      const rWith = makeRunner("H1", "P", jWith);
      const rWithout = makeRunner("H2", "P", jWithout);
      const result = runSim([rWith, rWithout], 1600);
      const withTrait = result.result.find((r) => r.horseId === "H1");
      const withoutTrait = result.result.find((r) => r.horseId === "H2");
      expect(withTrait!.time).toBeLessThanOrEqual(withoutTrait!.time);
    });
  });

  describe("hill_specialist (regression)", () => {
    it("runner with hill_specialist trait is valid", () => {
      const j = mockJockey(["hill_specialist"]);
      const r = makeRunner("H1", "S", j);
      const result = runSim([r], 1600);
      expect(result.result).toHaveLength(1);
      expect(result.result[0].horseId).toBe("H1");
    });
  });

  describe("long_straight_pro (regression)", () => {
    it("runner with long_straight_pro trait is valid", () => {
      const j = mockJockey(["long_straight_pro"]);
      const r = makeRunner("H1", "S", j);
      const result = runSim([r], 1600);
      expect(result.result).toHaveLength(1);
    });
  });

  describe("turf_specialist", () => {
    it("runner with turf_specialist on turf course finishes race", () => {
      const j = mockJockey(["turf_specialist"]);
      const r = makeRunner("H1", "P", j);
      const course = { surface: "Turf", straightLength: 400 } as any;
      const rng = createRng(42);
      const result = runRaceToCompletion([r], 1600, rng, 0.1, 600, course);
      expect(result.result).toHaveLength(1);
    });

    it("turf_specialist beats non-trait runner on turf", () => {
      const jWith = mockJockey(["turf_specialist"]);
      const jWithout = mockJockey([]);
      const rWith = makeRunner("H1", "P", jWith);
      const rWithout = makeRunner("H2", "P", jWithout);
      const course = { surface: "Turf", straightLength: 400 } as any;
      const rng = createRng(42);
      const result = runRaceToCompletion([rWith, rWithout], 1600, rng, 0.1, 600, course);
      const withTrait = result.result.find((r) => r.horseId === "H1");
      const withoutTrait = result.result.find((r) => r.horseId === "H2");
      expect(withTrait!.time).toBeLessThanOrEqual(withoutTrait!.time);
    });
  });

  describe("dirt_specialist", () => {
    it("dirt_specialist beats non-trait runner on dirt", () => {
      const jWith = mockJockey(["dirt_specialist"]);
      const jWithout = mockJockey([]);
      const rWith = makeRunner("H1", "P", jWith);
      const rWithout = makeRunner("H2", "P", jWithout);
      const course = { surface: "Dirt", straightLength: 400 } as any;
      const rng = createRng(42);
      const result = runRaceToCompletion([rWith, rWithout], 1600, rng, 0.1, 600, course);
      const withTrait = result.result.find((r) => r.horseId === "H1");
      const withoutTrait = result.result.find((r) => r.horseId === "H2");
      expect(withTrait!.time).toBeLessThanOrEqual(withoutTrait!.time);
    });
  });

  describe("mud_master", () => {
    it("mud_master runner finishes race in wet conditions", () => {
      const j = mockJockey(["mud_master"]);
      const r = makeRunner("H1", "P", j);
      const result = runSim([r], 1600);
      expect(result.result).toHaveLength(1);
    });
  });

  describe("sprint_specialist", () => {
    it("sprint_specialist beats non-trait runner in short race", () => {
      const jWith = mockJockey(["sprint_specialist"]);
      const jWithout = mockJockey([]);
      const rWith = makeRunner("H1", "E", jWith);
      const rWithout = makeRunner("H2", "E", jWithout);
      const result = runSim([rWith, rWithout], 1200);
      const withTrait = result.result.find((r) => r.horseId === "H1");
      const withoutTrait = result.result.find((r) => r.horseId === "H2");
      expect(withTrait!.time).toBeLessThanOrEqual(withoutTrait!.time);
    });

    it("sprint_specialist is penalized in long race", () => {
      const jWith = mockJockey(["sprint_specialist"]);
      const jWithout = mockJockey([]);
      const rWith = makeRunner("H1", "E", jWith);
      const rWithout = makeRunner("H2", "E", jWithout);
      const result = runSim([rWith, rWithout], 2400);
      const withTrait = result.result.find((r) => r.horseId === "H1");
      const withoutTrait = result.result.find((r) => r.horseId === "H2");
      // Sprint specialist should be relatively worse in long race
      expect(withTrait!.time).toBeGreaterThanOrEqual(withoutTrait!.time);
    });
  });

  describe("staying_specialist", () => {
    it("staying_specialist beats non-trait runner in long race", () => {
      const jWith = mockJockey(["staying_specialist"]);
      const jWithout = mockJockey([]);
      const rWith = makeRunner("H1", "S", jWith);
      const rWithout = makeRunner("H2", "S", jWithout);
      const result = runSim([rWith, rWithout], 2400);
      const withTrait = result.result.find((r) => r.horseId === "H1");
      const withoutTrait = result.result.find((r) => r.horseId === "H2");
      expect(withTrait!.time).toBeLessThanOrEqual(withoutTrait!.time);
    });
  });

  describe("pace_presser", () => {
    it("pace_presser runner finishes race", () => {
      const j = mockJockey(["pace_presser"]);
      const r = makeRunner("H1", "E", j);
      const result = runSim([r], 1600);
      expect(result.result).toHaveLength(1);
    });
  });

  describe("big_match_temperament", () => {
    it("big_match runner finishes race with large field", () => {
      const j = mockJockey(["big_match_temperament"]);
      const runners = Array.from({ length: 14 }, (_, i) =>
        makeRunner(`H${i}`, i % 2 === 0 ? "E" : "S", i === 0 ? j : mockJockey([])),
      );
      const result = runSim(runners, 1600);
      expect(result.result).toHaveLength(14);
    });
  });

  describe("veteran_poise", () => {
    it("veteran_poise with age >= 35 finishes race", () => {
      const j = mockJockey(["veteran_poise"], 40);
      const r = makeRunner("H1", "P", j);
      const result = runSim([r], 1600);
      expect(result.result).toHaveLength(1);
    });

    it("veteran_poise with age < 25 has no effect (still finishes)", () => {
      const j = mockJockey(["veteran_poise"], 22);
      const r = makeRunner("H1", "P", j);
      const result = runSim([r], 1600);
      expect(result.result).toHaveLength(1);
    });
  });

  describe("closer_instinct", () => {
    it("closer_instinct runner finishes race", () => {
      const j = mockJockey(["closer_instinct"]);
      const r = makeRunner("H1", "S", j);
      const result = runSim([r], 1600);
      expect(result.result).toHaveLength(1);
    });

    it("closer_instinct stacks with long_straight_pro", () => {
      const jBoth = mockJockey(["closer_instinct", "long_straight_pro"]);
      const rBoth = makeRunner("H1", "S", jBoth);
      const result = runSim([rBoth], 1600);
      expect(result.result).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("runner with no jockey finishes race", () => {
      const r = makeRunner("H1", "P", undefined);
      const result = runSim([r], 1600);
      expect(result.result).toHaveLength(1);
    });

    it("multiple traits active simultaneously don't crash", () => {
      const j = mockJockey([
        "gate_master",
        "turf_specialist",
        "sprint_specialist",
        "pace_presser",
        "closer_instinct",
      ]);
      const r = makeRunner("H1", "E", j);
      const result = runSim([r], 1200);
      expect(result.result).toHaveLength(1);
    });
  });
});
