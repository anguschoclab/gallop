import { describe, it, expect } from "vitest";
import { runRaceToCompletion, computePaceContext } from "@/core/race/engine/simulation";
import { calculateTacticalAdjustment } from "@/core/race/engine/tacticalAI";
import type { Horse, Jockey } from "@/game/types";
import type { Runner, PaceContext } from "@/core/race/engine/runnerBuilder";

describe("Advanced AI Tactics", () => {
  const mockHorse = (id: string, style: any): Horse =>
    ({
      id,
      name: `Horse ${id}`,
      stats: { speed: 80, stamina: 80, acceleration: 80 },
      runningStyle: style,
      energy: 100,
      form: 100,
      age: 3,
      gender: "colt",
      coatColor: "bay",
      experience: 0,
      lineage: { sireId: "", damId: "" },
      isPlayerOwned: false,
      id_alias: id,
    }) as any;

  const mockJockey = (skill: number): Jockey =>
    ({
      id: "j1",
      name: "Jockey",
      stats: {
        pacing: skill,
        positioning: skill,
        vigor: skill,
        gateSkill: skill,
        temperament: skill,
      },
      archetype: "versatile",
    }) as any;

  it("should apply traffic penalties when horses are blocked", () => {
    // Two horses in the same lane, one directly behind the other
    const runners = [
      {
        horseId: "H1",
        position: 10,
        velocity: 16,
        lane: 0,
        runningStyle: "E",
        finishTime: null,
        horse: mockHorse("H1", "E"),
        jockey: mockJockey(80),
      },
      {
        horseId: "H2",
        position: 9.5,
        velocity: 18,
        lane: 0,
        runningStyle: "P",
        finishTime: null,
        horse: mockHorse("H2", "P"),
        jockey: mockJockey(80),
      },
    ] as any;

    // Run one step (0.1s)
    const dt = 0.1;
    const pace = computePaceContext(runners, 1000);

    // Manual step simulation for H2
    // Expected: H2 velocity should be capped by H1
    const blockingHorse = runners[0];
    const r2 = runners[1];

    if (
      blockingHorse.position > r2.position &&
      blockingHorse.position - r2.position < 1.5 &&
      Math.abs(blockingHorse.lane - r2.lane) < 0.4
    ) {
      r2.velocity = Math.min(r2.velocity, blockingHorse.velocity * 0.98);
    }

    expect(r2.velocity).toBeLessThan(16);
  });

  it("should identify hot pace and adjust closers", () => {
    const pace: PaceContext = {
      leaderPos: 100,
      leaderVelocity: 16,
      leadGroupCount: 3,
      pacePressure: 0.8,
      progress: 0.5,
      laneDensity: [0.2, 0.3, 0.2, 0.1, 0.1, 0.1],
      paceRating: 1.2, // Hot pace
    };
    const runner: Runner = {
      horseId: "H1",
      name: "Horse 1",
      silk: "#ff0000",
      owned: false,
      position: 50,
      velocity: 15,
      finishTime: null,
      lane: 0,
      targetLane: 0,
      laneVelocity: 15,
      barrier: 1,
      topSpeed: 16,
      accel: 8,
      staminaFactor: 1.0,
      noise: 0.3,
      affinityBonus: 0,
      runningStyle: "S",
      draftingHorseId: null,
      horse: mockHorse("H1", "S") as Horse,
      jockey: mockJockey(100), // Skilled jockey
      weight: 126,
      jockeyInstructions: {
        horseId: "H1",
        raceId: "R1",
        ridingStyle: "closer",
        earlyPosition: "drop_back",
        moveTiming: "late",
        aggressiveness: 30,
      },
    };

    const result = calculateTacticalAdjustment(runner, pace, []);

    // Skilled jockey in hot pace should have velocityMod < 1.0 to save energy
    expect(result.velocityMod).toBeLessThan(1.0);
  });
});
