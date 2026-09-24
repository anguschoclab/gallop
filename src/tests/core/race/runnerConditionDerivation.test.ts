import { describe, it, expect } from "vitest";
import { makeUnowned } from "@/core/horse/ownership";
import { buildFieldContext, deriveRunnerConditions } from "@/core/race/runnerConditionDerivation";
import type { Runner } from "@/core/race/engine/runnerBuilder";

function horse(temperament = 50, injured = false) {
  return {
    stats: { temperament },
    ...(injured ? { activeInjury: { type: "tendon" } } : {}),
  } as unknown as Runner["horse"];
}

function runner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test Runner",
    position: 800,
    velocity: 16,
    finishTime: null,
    lane: 1,
    ownership: makeUnowned(),
    runningStyle: "P",
    topSpeed: 18,
    horse: horse(),
    ...overrides,
  } as unknown as Runner;
}

const DISTANCE = 1600;

function ids(list: { id: string }[]) {
  return list.map((c) => c.id);
}

describe("deriveRunnerConditions - Grinding", () => {
  it("identifies Grinding condition when runner maintains pace but doesn't quicken while close to leader late in race", () => {
    // GRINDING_MIN_PROGRESS = 0.7
    // GRINDING_MIN_FIELD_RATIO = 0.99
    // GRINDING_FADE_RATIO = 1.02
    // GRINDING_MAX_LENGTHS_BEHIND = 6 (6 * 2.5 = 15m)

    const grinder = runner({ horseId: "a", position: 1200, velocity: 15 });
    const leader = runner({ horseId: "b", position: 1210, velocity: 15 }); // 10m ahead (4 lengths)
    const field = buildFieldContext([grinder, leader]);

    // Mean = 15. Field ratio = 1 (>=0.99).
    // Peak velocity = 17 -> fadeRatio = 15/17 = 0.88 (<1.02).
    // Behind leader = 10m / 2.5 = 4 lengths (<6).
    // Progress = 1200/1600 = 0.75 (>0.7).
    const conditions = deriveRunnerConditions(grinder, field, { peakVelocity: 17 }, DISTANCE);

    expect(ids(conditions)).toContain("grinding");
  });

  it("does NOT identify Grinding if runner is too far behind the leader", () => {
    // GRINDING_MAX_LENGTHS_BEHIND = 6 (6 * 2.5 = 15m)

    const grinder = runner({ horseId: "a", position: 1200, velocity: 15 });
    const leader = runner({ horseId: "b", position: 1220, velocity: 15 }); // 20m ahead (8 lengths)
    const field = buildFieldContext([grinder, leader]);

    const conditions = deriveRunnerConditions(grinder, field, { peakVelocity: 17 }, DISTANCE);

    expect(ids(conditions)).not.toContain("grinding");
  });

  it("does NOT identify Grinding if race hasn't progressed enough", () => {
    // GRINDING_MIN_PROGRESS = 0.7

    const grinder = runner({ horseId: "a", position: 800, velocity: 15 }); // 800/1600 = 0.5 progress
    const leader = runner({ horseId: "b", position: 810, velocity: 15 });
    const field = buildFieldContext([grinder, leader]);

    const conditions = deriveRunnerConditions(grinder, field, { peakVelocity: 17 }, DISTANCE);

    expect(ids(conditions)).not.toContain("grinding");
  });

  it("does NOT identify Grinding if fieldRatio is too low (runner is too slow compared to field)", () => {
    // GRINDING_MIN_FIELD_RATIO = 0.99

    const grinder = runner({ horseId: "a", position: 1200, velocity: 14 });
    const leader = runner({ horseId: "b", position: 1210, velocity: 16 });
    // mean velocity = 15, fieldRatio = 14/15 = 0.933 (< 0.99)
    const field = buildFieldContext([grinder, leader]);

    const conditions = deriveRunnerConditions(grinder, field, { peakVelocity: 17 }, DISTANCE);

    expect(ids(conditions)).not.toContain("grinding");
  });
});
