import { describe, it, expect } from "vitest";
import { generateJockeyFeedback } from "@/core/race/jockeyFeedback";
import type { Runner } from "@/core/race/engine/runnerBuilder";

function mkRunner(finishTime: number | null, horseId = "h1"): Runner {
  return {
    horseId,
    name: "Test",
    silk: "#ff0000",
    owned: true,
    position: 0,
    velocity: 0,
    finishTime,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    barrier: 1,
    topSpeed: 16,
    accel: 1,
    staminaFactor: 1,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "EP",
    draftingHorseId: null,
    weight: 55,
    horse: {} as any,
  } as Runner;
}

describe("generateJockeyFeedback", () => {
  it("returns perfect ride feedback for position 1", () => {
    const runner = mkRunner(50.0);
    const feedback = generateJockeyFeedback(runner, 1, [runner]);
    expect(feedback).toBe("Perfect ride! Jockey executed the race plan flawlessly.");
  });

  it("returns strong finish feedback for positions 2-3 with small time diff", () => {
    const winner = mkRunner(50.0, "h1");
    const runner = mkRunner(50.3, "h2");
    const feedback = generateJockeyFeedback(runner, 2, [winner, runner]);
    expect(feedback).toBe("Strong finish. Just missed the win but showed great heart.");
  });

  it("returns good effort feedback for positions 2-3 with larger time diff", () => {
    const winner = mkRunner(50.0, "h1");
    const runner = mkRunner(51.5, "h2");
    const feedback = generateJockeyFeedback(runner, 2, [winner, runner]);
    expect(feedback).toBe("Good effort. Jockey kept the horse competitive throughout.");
  });

  it("returns difficult race feedback for large time differences", () => {
    const winner = mkRunner(50.0, "h1");
    const runner = mkRunner(53.0, "h2");
    const feedback = generateJockeyFeedback(runner, 5, [winner, runner]);
    expect(feedback).toBe("Difficult race. Horse may have struggled with the pace or traffic.");
  });

  it("returns mid-pack feedback for average performance", () => {
    const winner = mkRunner(50.0, "h1");
    const runner = mkRunner(51.0, "h2");
    const feedback = generateJockeyFeedback(runner, 5, [winner, runner]);
    expect(feedback).toBe("Mid-pack finish. Jockey managed the race well given the circumstances.");
  });

  it("handles null finish times gracefully", () => {
    const winner = mkRunner(50.0, "h1");
    const runner = mkRunner(null, "h2");
    const feedback = generateJockeyFeedback(runner, 5, [winner, runner]);
    expect(feedback).toBe("Mid-pack finish. Jockey managed the race well given the circumstances.");
  });
});
