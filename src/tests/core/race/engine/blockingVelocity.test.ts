import { describe, it, expect } from "vitest";
import {
  detectBlocking,
  applyBlockingEffect,
} from "@/domains/race/simulation/engine/jockeyEffects";
import type { Runner } from "@/domains/race/model/engine/runnerTypes";
import { BOXED_IN_VELOCITY_CAP } from "@/domains/race/model/engine/constants";

const mkRunner = (overrides: Partial<Runner> = {}): Runner =>
  ({
    horseId: "x",
    position: 10,
    lane: 1,
    velocity: 20,
    finishTime: null,
    blockedAhead: false,
    boxedIn: false,
    jockey: { stats: { positioning: 50 }, traits: [] },
    ...overrides,
  }) as unknown as Runner;

describe("blocking velocity cache (PR 585 contract)", () => {
  it("detectBlocking caches the selected blocker's velocity", () => {
    const blocker = mkRunner({ horseId: "b", position: 11.0, lane: 1.2, velocity: 14 });
    const runner = mkRunner({ position: 10, lane: 1 });
    detectBlocking(runner, [blocker, runner]);
    expect(runner.blockedAhead).toBe(true);
    expect(runner.blockingHorseVelocity).toBe(14);
  });

  it("applyBlockingEffect caps boxed-in runner at blocker velocity * cap", () => {
    const blocker = mkRunner({ horseId: "b", position: 11.0, lane: 0.2, velocity: 14 });
    const runner = mkRunner({ position: 10, lane: 0, velocity: 20 });
    // On the rail (lane < threshold) with outside blocked -> boxedIn
    const outside = mkRunner({ horseId: "o", position: 10, lane: 1.5, velocity: 15 });
    detectBlocking(runner, [blocker, outside, runner]);
    expect(runner.boxedIn).toBe(true);
    applyBlockingEffect(runner, [blocker, outside, runner]);
    expect(runner.velocity).toBeCloseTo(14 * BOXED_IN_VELOCITY_CAP);
  });

  it("does nothing when not blocked", () => {
    const runner = mkRunner({ velocity: 20 });
    detectBlocking(runner, [runner]);
    expect(runner.blockedAhead).toBe(false);
    expect(runner.blockingHorseVelocity).toBeUndefined();
    applyBlockingEffect(runner, [runner]);
    expect(runner.velocity).toBe(20);
  });

  it("clears stale flags and cache on each detectBlocking call", () => {
    const blocker = mkRunner({ horseId: "b", position: 11.0, lane: 1.2, velocity: 14 });
    const runner = mkRunner({ position: 10, lane: 1 });
    detectBlocking(runner, [blocker, runner]);
    expect(runner.blockingHorseVelocity).toBe(14);
    detectBlocking(runner, [runner]);
    expect(runner.blockedAhead).toBe(false);
    expect(runner.blockingHorseVelocity).toBeUndefined();
  });
});
