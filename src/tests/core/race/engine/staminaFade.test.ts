import { describe, it, expect } from "vitest";
import { calculateStaminaMultiplier } from "@/core/race/engine/staminaFade";
import type { Runner, PaceContext } from "@/core/race/engine/runnerBuilder";
import {
  STAMINA_FADE_START,
  DRAFT_STAMINA_PRESERVE,
  PACE_PRESSURE_STAMINA_PENALTY,
  PACE_PRESSER_MITIGATION,
  BLEEDER_DISTANCE_THRESHOLD,
  BLEEDER_PROGRESS_THRESHOLD,
  BLEEDER_STAMINA_PENALTY,
  ROANER_SPEED_THRESHOLD,
  ROANER_STAMINA_PENALTY,
  SAVE_TACTICS_PROGRESS_THRESHOLD,
  SAVE_TACTICS_STAMINA_BONUS,
  EARLY_SPEED_PENALTY_THRESHOLD,
  EARLY_SPEED_LANE_THRESHOLD,
  EARLY_SPEED_STAMINA_PENALTY,
} from "@/constants/raceEngineConstants";

describe("calculateStaminaMultiplier", () => {
  const createMockRunner = (overrides: Partial<Runner> = {}): Runner => {
    return {
      horseId: "h1",
      horse: { bleederRisk: 0, roarerRisk: 0, id: "h1" } as any,
      jockey: { id: "j1", stats: {}, traits: [] } as any,
      staminaFactor: 1,
      runningStyle: "P",
      velocity: 15,
      topSpeed: 20,
      lane: 1,
      ...overrides,
    } as Runner;
  };

  it("returns 1 when progress is below STAMINA_FADE_START and no early speed penalties apply", () => {
    const runner = createMockRunner();
    const result = calculateStaminaMultiplier(runner, STAMINA_FADE_START - 0.1, 1200);
    expect(result).toBe(1);
  });

  describe("early speed penalty", () => {
    it("applies penalty to E style runners in wide lanes early in race", () => {
      const runner = createMockRunner({
        runningStyle: "E",
        lane: EARLY_SPEED_LANE_THRESHOLD + 1,
      });
      const result = calculateStaminaMultiplier(runner, EARLY_SPEED_PENALTY_THRESHOLD - 0.1, 1200);
      expect(result).toBe(EARLY_SPEED_STAMINA_PENALTY);
    });

    it("does not apply penalty to non-E style runners", () => {
      const runner = createMockRunner({
        runningStyle: "EP",
        lane: EARLY_SPEED_LANE_THRESHOLD + 1,
      });
      const result = calculateStaminaMultiplier(runner, EARLY_SPEED_PENALTY_THRESHOLD - 0.1, 1200);
      expect(result).toBe(1);
    });

    it("does not apply penalty if inside lane threshold", () => {
      const runner = createMockRunner({
        runningStyle: "E",
        lane: EARLY_SPEED_LANE_THRESHOLD - 1,
      });
      const result = calculateStaminaMultiplier(runner, EARLY_SPEED_PENALTY_THRESHOLD - 0.1, 1200);
      expect(result).toBe(1);
    });
  });

  describe("fade calculation", () => {
    it("applies drafting stamina preservation when drafting", () => {
      const runnerNormal = createMockRunner({ staminaFactor: 0.8 });
      const runnerDrafting = createMockRunner({ staminaFactor: 0.8, draftingHorseId: "h2" });

      const progress = STAMINA_FADE_START + 0.1;

      const normalResult = calculateStaminaMultiplier(runnerNormal, progress, 1200);
      const draftingResult = calculateStaminaMultiplier(runnerDrafting, progress, 1200);

      // Drafting runner should have preserved more stamina, so multiplier is higher (closer to 1)
      expect(draftingResult).toBeGreaterThan(normalResult);
    });

    it("applies pace pressure penalty to E style runners", () => {
      const runner = createMockRunner({ runningStyle: "E", staminaFactor: 0.9 });
      const pace: PaceContext = {
        pacePressure: 1,

        leaderVelocity: 18,
        leaderPos: 100,
        leadGroupCount: 2,
        progress: 0.5,
        laneDensity: [],
        paceRating: 1.0,
      };

      const normalResult = calculateStaminaMultiplier(runner, STAMINA_FADE_START + 0.2, 1200);
      const pressuredResult = calculateStaminaMultiplier(
        runner,
        STAMINA_FADE_START + 0.2,
        1200,
        pace,
      );

      expect(pressuredResult).toBeLessThan(normalResult);
    });

    it("mitigates pace pressure penalty if jockey is pace_presser", () => {
      const runnerPressured = createMockRunner({ runningStyle: "E", staminaFactor: 0.9 });
      const runnerMitigated = createMockRunner({
        runningStyle: "E",
        staminaFactor: 0.9,
        jockey: { traits: ["pace_presser"] } as any,
      });
      const pace: PaceContext = {
        pacePressure: 1,

        leaderVelocity: 18,
        leaderPos: 100,
        leadGroupCount: 2,
        progress: 0.5,
        laneDensity: [],
        paceRating: 1.0,
      };

      const progress = STAMINA_FADE_START + 0.2;
      const pressuredResult = calculateStaminaMultiplier(runnerPressured, progress, 1200, pace);
      const mitigatedResult = calculateStaminaMultiplier(runnerMitigated, progress, 1200, pace);

      expect(mitigatedResult).toBeGreaterThan(pressuredResult);
    });
  });

  describe("health risks (bleeder/roarer)", () => {
    it("applies bleeder penalty when risk triggers", () => {
      const runner = createMockRunner({
        horse: { bleederRisk: 1, roarerRisk: 0, id: "h1" } as any,
        staminaFactor: 0.9,
      });
      const rng = { next: () => 0 }; // always triggers if probability > 0

      const normalResult = calculateStaminaMultiplier(
        runner,
        BLEEDER_PROGRESS_THRESHOLD + 0.1,
        BLEEDER_DISTANCE_THRESHOLD - 100,
      );
      const bleederResult = calculateStaminaMultiplier(
        runner,
        BLEEDER_PROGRESS_THRESHOLD + 0.1,
        BLEEDER_DISTANCE_THRESHOLD + 100,
        undefined,
        rng,
        1,
      );

      expect(bleederResult).toBeLessThan(normalResult);
    });

    it("applies roarer penalty when risk triggers", () => {
      const topSpeed = 20;
      const runner = createMockRunner({
        horse: { roarerRisk: 1, bleederRisk: 0, id: "h1" } as any,
        staminaFactor: 0.9,
        topSpeed,
        velocity: topSpeed * ROANER_SPEED_THRESHOLD + 1,
      });
      const rng = { next: () => 0 };

      const progress = STAMINA_FADE_START + 0.1;
      const normalResult = calculateStaminaMultiplier(
        createMockRunner({ ...runner, velocity: topSpeed * ROANER_SPEED_THRESHOLD - 1 }),
        progress,
        1200,
        undefined,
        rng,
        1,
      );
      const roarerResult = calculateStaminaMultiplier(runner, progress, 1200, undefined, rng, 1);

      expect(roarerResult).toBeLessThan(normalResult);
    });
  });

  describe("save tactics bonus", () => {
    it("applies bonus to late closers before threshold", () => {
      const runnerNormal = createMockRunner({ staminaFactor: 0.8 });
      const runnerSaving = createMockRunner({
        staminaFactor: 0.8,
        jockeyInstructions: {
          horseId: "h1",
          raceId: "r1",
          ridingStyle: "closer",
          moveTiming: "late",
          earlyPosition: "drop_back",
          aggressiveness: 50,
        },
      });

      const progress = STAMINA_FADE_START + 0.05; // > STAMINA_FADE_START but < SAVE_TACTICS_PROGRESS_THRESHOLD

      const normalResult = calculateStaminaMultiplier(runnerNormal, progress, 1200);
      const savingResult = calculateStaminaMultiplier(runnerSaving, progress, 1200);

      expect(savingResult).toBeGreaterThan(normalResult);
    });
  });
});
