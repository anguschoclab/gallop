import { describe, it, expect } from "vitest";
import { applyJockeyEffects } from "@/core/race/engine/jockeyEffects";
import { stepRunner } from "@/core/race/engine/simulation";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import {
  GATE_SKILL_PROGRESS_THRESHOLD,
  MATCHED_ARCHETYPE_PROGRESS_THRESHOLD,
  VIGOR_PROGRESS_THRESHOLD,
  FRONT_RUNNER_STALKER_MISMATCH_STAMINA_PENALTY,
} from "@/constants/raceEngineConstants";

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    velocity: 15,
    topSpeed: 20,
    lane: 0,
    runningStyle: "P",
    affinityBonus: 0,
    ...overrides,
  } as Runner;
}

describe("applyJockeyEffects", () => {
  it("applies basic arc factor when no jockey is present", () => {
    const runner = makeRunner();
    const dt = 0.1;
    const arcFactor = 1.1;
    const { finalDs } = applyJockeyEffects(runner, 0.5, Infinity, arcFactor, dt);
    expect(finalDs).toBe((15 * dt) / arcFactor);
  });

  describe("early race (gate skill)", () => {
    it("applies gate skill velocity bonus early in the race", () => {
      const runner = makeRunner({
        jockey: { stats: { gateSkill: 100 }, traits: [] } as any,
      });
      const dt = 0.1;
      const arcFactor = 1.0;
      applyJockeyEffects(runner, GATE_SKILL_PROGRESS_THRESHOLD - 0.01, Infinity, arcFactor, dt);
      expect(runner.velocity).toBeGreaterThan(15);
    });

    it("applies extra gate_master trait bonus", () => {
      const runnerNormal = makeRunner({
        jockey: { stats: { gateSkill: 100 }, traits: [] } as any,
      });
      const runnerMaster = makeRunner({
        velocity: 15, // reset explicitly for this object
        jockey: { stats: { gateSkill: 100 }, traits: ["gate_master"] } as any,
      });
      const dt = 0.1;
      const progress = GATE_SKILL_PROGRESS_THRESHOLD - 0.01;

      applyJockeyEffects(runnerNormal, progress, Infinity, 1.0, dt);
      applyJockeyEffects(runnerMaster, progress, Infinity, 1.0, dt);

      expect(runnerMaster.velocity).toBeGreaterThan(runnerNormal.velocity);
    });
  });

  describe("matched archetype bonuses", () => {
    it("applies pacing bonus to stamina when archetype matches and progress > threshold", () => {
      const runner = makeRunner({
        runningStyle: "E",
        jockey: { archetype: "front_runner", stats: { pacing: 100 }, traits: [] } as any,
      });

      applyJockeyEffects(runner, MATCHED_ARCHETYPE_PROGRESS_THRESHOLD + 0.1, Infinity, 1.0, 0.1);

      expect(runner.jockeyStaminaBonus).toBeGreaterThan(0);
    });

    it("does not apply pacing bonus when archetype doesn't match", () => {
      const runner = makeRunner({
        runningStyle: "P",
        jockey: { archetype: "front_runner", stats: { pacing: 100 }, traits: [] } as any,
      });

      applyJockeyEffects(runner, MATCHED_ARCHETYPE_PROGRESS_THRESHOLD + 0.1, Infinity, 1.0, 0.1);

      expect(runner.jockeyStaminaBonus).toBe(0);
    });

    it("resets jockeyStaminaBonus to 0 when the matched-archetype window ends", () => {
      const runner = makeRunner({
        runningStyle: "E",
        jockey: { archetype: "front_runner", stats: { pacing: 100 }, traits: [] } as any,
      });

      applyJockeyEffects(runner, MATCHED_ARCHETYPE_PROGRESS_THRESHOLD + 0.1, Infinity, 1.0, 0.1);
      expect(runner.jockeyStaminaBonus).toBeGreaterThan(0);

      applyJockeyEffects(runner, MATCHED_ARCHETYPE_PROGRESS_THRESHOLD - 0.1, Infinity, 1.0, 0.1);
      expect(runner.jockeyStaminaBonus).toBe(0);
    });
  });

  describe("front_runner / stalker mismatch", () => {
    it("stores the stamina penalty as a negative jockeyStaminaBonus", () => {
      const runner = makeRunner({
        runningStyle: "S",
        jockey: { archetype: "front_runner", stats: { pacing: 100 }, traits: [] } as any,
      });

      applyJockeyEffects(runner, MATCHED_ARCHETYPE_PROGRESS_THRESHOLD - 0.1, Infinity, 1.0, 0.1);

      expect(runner.jockeyStaminaBonus).toBeCloseTo(
        FRONT_RUNNER_STALKER_MISMATCH_STAMINA_PENALTY - 1,
      );
    });

    it("stepRunner stores the mismatch penalty on the runner for next-tick application", () => {
      const runner = makeRunner({
        position: 100,
        finishTime: null,
        laneVelocity: 0,
        gate: 1,
        topSpeed: 16,
        accel: 5,
        staminaFactor: 0.9,
        noise: 0,
        draftingHorseId: null,
        weight: 55,
        horse: { bleederRisk: 0, roarerRisk: 0, id: "h1" } as any,
        runningStyle: "S",
        jockey: {
          archetype: "front_runner",
          stats: { pacing: 50, positioning: 50, vigor: 50, gateSkill: 50, temperament: 50 },
          traits: [],
        } as any,
      });

      stepRunner(runner, 0.1, 1, 1000, { next: () => 0.5 } as any, [runner]);

      expect(runner.jockeyStaminaBonus).toBeCloseTo(
        FRONT_RUNNER_STALKER_MISMATCH_STAMINA_PENALTY - 1,
      );
    });
  });

  describe("return contract", () => {
    it("returns only finalDs (no staminaMul)", () => {
      const runner = makeRunner();
      const result = applyJockeyEffects(runner, 0.5, Infinity, 1.0, 0.1);
      expect("staminaMul" in result).toBe(false);
    });
  });

  describe("late race (vigor)", () => {
    it("applies vigor boost when progress > VIGOR_PROGRESS_THRESHOLD", () => {
      const runner = makeRunner({
        jockey: { stats: { vigor: 100 }, traits: [] } as any,
      });

      applyJockeyEffects(runner, VIGOR_PROGRESS_THRESHOLD + 0.1, Infinity, 1.0, 0.1);
      expect(runner.velocity).toBeGreaterThan(15);
    });

    it("applies big_match_temperament bonus in large fields", () => {
      const runnerNormal = makeRunner({
        velocity: 15,
        jockey: { stats: { vigor: 100 }, traits: [] } as any,
      });
      const runnerBigMatch = makeRunner({
        velocity: 15,
        jockey: { stats: { vigor: 100 }, traits: ["big_match_temperament"] } as any,
      });

      const progress = VIGOR_PROGRESS_THRESHOLD + 0.1;
      const fieldSize = 14; // > BIG_MATCH_FIELD_THRESHOLD

      applyJockeyEffects(runnerNormal, progress, Infinity, 1.0, 0.1, fieldSize);
      applyJockeyEffects(runnerBigMatch, progress, Infinity, 1.0, 0.1, fieldSize);

      expect(runnerBigMatch.velocity).toBeGreaterThan(runnerNormal.velocity);
    });
  });
});
