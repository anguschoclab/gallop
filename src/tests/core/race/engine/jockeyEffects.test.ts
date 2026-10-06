import { describe, it, expect } from "vitest";
import { applyJockeyEffects } from "@/core/race/engine/jockeyEffects";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import {
  GATE_SKILL_PROGRESS_THRESHOLD,
  MATCHED_ARCHETYPE_PROGRESS_THRESHOLD,
  VIGOR_PROGRESS_THRESHOLD,
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
    const { finalDs, staminaMul } = applyJockeyEffects(runner, 0.5, Infinity, arcFactor, dt, 1.0);
    expect(finalDs).toBe((15 * dt) / arcFactor);
    expect(staminaMul).toBe(1.0);
  });

  describe("early race (gate skill)", () => {
    it("applies gate skill velocity bonus early in the race", () => {
      const runner = makeRunner({
        jockey: { stats: { gateSkill: 100 }, traits: [] } as any,
      });
      const dt = 0.1;
      const arcFactor = 1.0;
      applyJockeyEffects(
        runner,
        GATE_SKILL_PROGRESS_THRESHOLD - 0.01,
        Infinity,
        arcFactor,
        dt,
        1.0,
      );
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

      applyJockeyEffects(runnerNormal, progress, Infinity, 1.0, dt, 1.0);
      applyJockeyEffects(runnerMaster, progress, Infinity, 1.0, dt, 1.0);

      expect(runnerMaster.velocity).toBeGreaterThan(runnerNormal.velocity);
    });
  });

  describe("matched archetype bonuses", () => {
    it("applies pacing bonus to stamina when archetype matches and progress > threshold", () => {
      const runner = makeRunner({
        runningStyle: "E",
        jockey: { archetype: "front_runner", stats: { pacing: 100 }, traits: [] } as any,
      });

      const { staminaMul } = applyJockeyEffects(
        runner,
        MATCHED_ARCHETYPE_PROGRESS_THRESHOLD + 0.1,
        Infinity,
        1.0,
        0.1,
        0.8,
      );

      expect(staminaMul).toBeGreaterThan(0.8);
      expect(runner.jockeyStaminaBonus).toBeGreaterThan(0);
    });

    it("does not apply pacing bonus when archetype doesn't match", () => {
      const runner = makeRunner({
        runningStyle: "P",
        jockey: { archetype: "front_runner", stats: { pacing: 100 }, traits: [] } as any,
      });

      const { staminaMul } = applyJockeyEffects(
        runner,
        MATCHED_ARCHETYPE_PROGRESS_THRESHOLD + 0.1,
        Infinity,
        1.0,
        0.1,
        0.8,
      );

      expect(staminaMul).toBe(0.8);
      expect(runner.jockeyStaminaBonus).toBe(0);
    });
  });

  describe("late race (vigor)", () => {
    it("applies vigor boost when progress > VIGOR_PROGRESS_THRESHOLD", () => {
      const runner = makeRunner({
        jockey: { stats: { vigor: 100 }, traits: [] } as any,
      });

      applyJockeyEffects(runner, VIGOR_PROGRESS_THRESHOLD + 0.1, Infinity, 1.0, 0.1, 1.0);
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

      applyJockeyEffects(runnerNormal, progress, Infinity, 1.0, 0.1, 1.0, fieldSize);
      applyJockeyEffects(runnerBigMatch, progress, Infinity, 1.0, 0.1, 1.0, fieldSize);

      expect(runnerBigMatch.velocity).toBeGreaterThan(runnerNormal.velocity);
    });
  });
});
