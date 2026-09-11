import { describe, it, expect } from "vitest";
import { applyBlockingEffect, detectBlocking } from "@/core/race/engine/jockeyEffects";
import { calculateTargetLane } from "@/core/race/engine/lateralMovement";
import { computePaceContext } from "@/core/race/engine/paceContext";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { MIN_BLOCK_GAP, LANE_WIDTH } from "@/constants/raceEngineConstants";

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test",
    silk: "",
    isPlayer: false,
    position: 100,
    velocity: 16,
    finishTime: null,
    lane: 1.2,
    targetLane: 1.2,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 18,
    accel: 5,
    staminaFactor: 0.8,
    noise: 0.3,
    affinityBonus: 0,
    runningStyle: "P",
    draftingHorseId: null,
    weight: 55,
    horse: { id: "h1" } as any,
    jockey: {
      id: "j1",
      stats: { pacing: 70, positioning: 70, vigor: 70, gateSkill: 70, temperament: 70 },
      traits: [],
    } as any,
    ...overrides,
  };
}

describe("applyBlockingEffect — boxed-in model", () => {
  describe("blockedAhead detection", () => {
    it("sets blockedAhead when a horse is ahead within MIN_BLOCK_GAP in a nearby lane", () => {
      const runner = makeRunner({ horseId: "h1", position: 100, velocity: 16, lane: 1.2 });
      const blocker = makeRunner({
        horseId: "h2",
        position: 100 + MIN_BLOCK_GAP + 0.3, // within 1.5m
        velocity: 14,
        lane: 1.2, // same lane
      });
      // sortedField is sorted by position descending (leader first)
      const sortedField = [blocker, runner];

      detectBlocking(runner, sortedField);

      // After the change, runner.blockedAhead should be true
      expect((runner as any).blockedAhead).toBe(true);
    });

    it("does not set blockedAhead when no horse is ahead in a nearby lane", () => {
      const runner = makeRunner({ horseId: "h1", position: 100, velocity: 16, lane: 1.2 });
      const farAhead = makeRunner({
        horseId: "h2",
        position: 110, // far ahead
        velocity: 14,
        lane: 1.2,
      });
      const sortedField = [farAhead, runner];

      detectBlocking(runner, sortedField);

      expect((runner as any).blockedAhead).toBeFalsy();
    });

    it("does not set blockedAhead when horse ahead is in a different lane (gap >= 0.4)", () => {
      const runner = makeRunner({ horseId: "h1", position: 100, velocity: 16, lane: 1.2 });
      const blocker = makeRunner({
        horseId: "h2",
        position: 101,
        velocity: 14,
        lane: 2.0, // far lane
      });
      const sortedField = [blocker, runner];

      detectBlocking(runner, sortedField);

      expect((runner as any).blockedAhead).toBeFalsy();
    });
  });

  describe("boxedIn detection", () => {
    it("sets boxedIn when blocked ahead AND both adjacent lanes blocked", () => {
      const runner = makeRunner({ horseId: "h1", position: 100, velocity: 16, lane: 2.4 });
      const ahead = makeRunner({
        horseId: "h2",
        position: 101,
        velocity: 14,
        lane: 2.4, // same lane, blocking ahead
      });
      const inside = makeRunner({
        horseId: "h3",
        position: 100.5,
        velocity: 14,
        lane: 1.2, // inside lane blocked
      });
      const outside = makeRunner({
        horseId: "h4",
        position: 100.5,
        velocity: 14,
        lane: 3.6, // outside lane blocked
      });
      const sortedField = [ahead, outside, inside, runner];

      detectBlocking(runner, sortedField);

      expect((runner as any).blockedAhead).toBe(true);
      expect((runner as any).boxedIn).toBe(true);
    });

    it("sets boxedIn when blocked ahead AND on the rail (no inside lane)", () => {
      const runner = makeRunner({ horseId: "h1", position: 100, velocity: 16, lane: 0 });
      const ahead = makeRunner({
        horseId: "h2",
        position: 101,
        velocity: 14,
        lane: 0, // same lane, blocking ahead
      });
      const outside = makeRunner({
        horseId: "h3",
        position: 100.5,
        velocity: 14,
        lane: 1.2, // outside lane blocked
      });
      const sortedField = [ahead, outside, runner];

      detectBlocking(runner, sortedField);

      expect((runner as any).blockedAhead).toBe(true);
      expect((runner as any).boxedIn).toBe(true);
    });

    it("does not set boxedIn when inside lane is open (escape available)", () => {
      const runner = makeRunner({ horseId: "h1", position: 100, velocity: 16, lane: 2.4 });
      const ahead = makeRunner({
        horseId: "h2",
        position: 101,
        velocity: 14,
        lane: 2.4,
      });
      const outside = makeRunner({
        horseId: "h3",
        position: 100.5,
        velocity: 14,
        lane: 3.6,
      });
      // No inside blocker — inside lane is open
      const sortedField = [ahead, outside, runner];

      detectBlocking(runner, sortedField);

      expect((runner as any).blockedAhead).toBe(true);
      expect((runner as any).boxedIn).toBeFalsy();
    });
  });

  describe("escape velocity penalty", () => {
    it("applies velocity penalty when blocked but not boxed (escaping)", () => {
      const runner = makeRunner({
        horseId: "h1",
        position: 100,
        velocity: 16,
        lane: 2.4,
      });
      const ahead = makeRunner({
        horseId: "h2",
        position: 101,
        velocity: 14,
        lane: 2.4,
      });
      // No outside or inside blocker — escape available
      const sortedField = [ahead, runner];
      const originalVelocity = runner.velocity;

      detectBlocking(runner, sortedField);
      applyBlockingEffect(runner, sortedField);

      // When escaping (blocked but not boxed), velocity should be reduced
      // but NOT capped to blocker's velocity * 0.98
      // The escape penalty is smaller than the hard cap
      expect(runner.velocity).toBeLessThan(originalVelocity);
      // Should NOT be capped to blocker.velocity * 0.98 = 13.72
      // (escape penalty is smaller, so velocity should be higher than the cap)
      expect(runner.velocity).toBeGreaterThan(14 * 0.98);
    });

    it("escape penalty is reduced by jockey positioning skill", () => {
      const lowPosRunner = makeRunner({
        horseId: "h1",
        position: 100,
        velocity: 16,
        lane: 2.4,
        jockey: {
          id: "j1",
          stats: { pacing: 50, positioning: 20, vigor: 50, gateSkill: 50, temperament: 50 },
          traits: [],
        } as any,
      });
      const highPosRunner = makeRunner({
        horseId: "h1b",
        position: 100,
        velocity: 16,
        lane: 2.4,
        jockey: {
          id: "j2",
          stats: { pacing: 50, positioning: 90, vigor: 50, gateSkill: 50, temperament: 50 },
          traits: [],
        } as any,
      });
      const ahead1 = makeRunner({ horseId: "h2", position: 101, velocity: 14, lane: 2.4 });
      const ahead2 = makeRunner({ horseId: "h2b", position: 101, velocity: 14, lane: 2.4 });

      detectBlocking(lowPosRunner, [ahead1, lowPosRunner]);
      applyBlockingEffect(lowPosRunner, [ahead1, lowPosRunner]);
      detectBlocking(highPosRunner, [ahead2, highPosRunner]);
      applyBlockingEffect(highPosRunner, [ahead2, highPosRunner]);

      // High positioning skill should result in less velocity loss (better escape)
      expect(highPosRunner.velocity).toBeGreaterThan(lowPosRunner.velocity);
    });
  });

  describe("boxed-in velocity cap", () => {
    it("caps velocity to blocker * 0.98 when boxed in", () => {
      const runner = makeRunner({
        horseId: "h1",
        position: 100,
        velocity: 16,
        lane: 0, // on the rail
      });
      const ahead = makeRunner({
        horseId: "h2",
        position: 101,
        velocity: 14,
        lane: 0,
      });
      const outside = makeRunner({
        horseId: "h3",
        position: 100.5,
        velocity: 14,
        lane: 1.2,
      });
      const sortedField = [ahead, outside, runner];

      detectBlocking(runner, sortedField);
      applyBlockingEffect(runner, sortedField);

      // Boxed in → velocity capped to blocker * 0.98 = 14 * 0.98 = 13.72
      expect(runner.velocity).toBeCloseTo(14 * 0.98, 2);
    });

    it("does not cap velocity when not blocked (no effect)", () => {
      const runner = makeRunner({ horseId: "h1", position: 100, velocity: 16, lane: 1.2 });
      const farAhead = makeRunner({ horseId: "h2", position: 110, velocity: 14, lane: 1.2 });
      const sortedField = [farAhead, runner];
      const originalVelocity = runner.velocity;

      detectBlocking(runner, sortedField);
      applyBlockingEffect(runner, sortedField);

      expect(runner.velocity).toBe(originalVelocity);
    });
  });

  describe("re-evaluation each tick", () => {
    it("blockedAhead clears when gap opens (blocker pulls away)", () => {
      const runner = makeRunner({ horseId: "h1", position: 100, velocity: 16, lane: 1.2 });

      // First tick: blocker is close
      const blocker1 = makeRunner({ horseId: "h2", position: 101, velocity: 14, lane: 1.2 });
      detectBlocking(runner, [blocker1, runner]);
      expect((runner as any).blockedAhead).toBe(true);

      // Second tick: blocker has pulled away (gap > 1.5m)
      const blocker2 = makeRunner({ horseId: "h2", position: 105, velocity: 18, lane: 1.2 });
      detectBlocking(runner, [blocker2, runner]);
      expect((runner as any).blockedAhead).toBeFalsy();
    });
  });

  describe("lane-seeking escape (calculateTargetLane integration)", () => {
    it("shifts targetLane away from blocker when blockedAhead and not boxed in", () => {
      // Runner in lane 2 (laneIdx=2, lane=2.4), blocker ahead in same lane.
      // Inside lane (laneIdx=1) is open, outside (laneIdx=3) is open.
      // calculateTargetLane should seek an escape lane.
      const runner = makeRunner({
        horseId: "h1",
        position: 100,
        velocity: 16,
        lane: 2 * LANE_WIDTH, // lane index 2
      });
      const blocker = makeRunner({
        horseId: "h2",
        position: 100 + MIN_BLOCK_GAP + 0.2,
        velocity: 14,
        lane: 2 * LANE_WIDTH, // same lane
      });
      const sortedField = [blocker, runner];

      detectBlocking(runner, sortedField);
      expect(runner.blockedAhead).toBe(true);
      expect(runner.boxedIn).toBeFalsy();

      const pace = computePaceContext(sortedField, 1000);
      const targetLane = calculateTargetLane(runner, 0.5, sortedField, pace);

      // Should have shifted away from lane 2 toward an escape lane
      const currentLaneIdx = Math.floor(runner.lane / LANE_WIDTH);
      expect(targetLane).not.toBe(currentLaneIdx);
      // escapeLaneDelta should be > 0 (seeking lateral movement)
      expect(runner.escapeLaneDelta).toBeGreaterThan(0);
    });

    it("does not shift targetLane when boxed in (trapped, no escape)", () => {
      // Runner on the rail (lane 0), blocker ahead, outside blocked.
      // Boxed in — calculateTargetLane should not seek escape.
      const runner = makeRunner({
        horseId: "h1",
        position: 100,
        velocity: 16,
        lane: 0,
      });
      const ahead = makeRunner({
        horseId: "h2",
        position: 101,
        velocity: 14,
        lane: 0,
      });
      const outside = makeRunner({
        horseId: "h3",
        position: 100.5,
        velocity: 14,
        lane: LANE_WIDTH,
      });
      const sortedField = [ahead, outside, runner];

      detectBlocking(runner, sortedField);
      expect(runner.blockedAhead).toBe(true);
      expect(runner.boxedIn).toBe(true);

      const pace = computePaceContext(sortedField, 1000);
      const targetLane = calculateTargetLane(runner, 0.5, sortedField, pace);

      // When boxed in, escapeLaneDelta should be 0 (no escape sought)
      expect(runner.escapeLaneDelta).toBe(0);
    });
  });

  describe("escape penalty scales with lane delta", () => {
    it("larger lateral escape costs more velocity than smaller escape", () => {
      // Two runners blocked ahead, both faster than blocker, same positioning skill.
      // Runner A seeks 1-lane escape (escapeLaneDelta = 1).
      // Runner B seeks 2-lane escape (escapeLaneDelta = 2).
      // Runner B should lose more velocity.
      const runnerA = makeRunner({
        horseId: "h1a",
        position: 100,
        velocity: 16,
        lane: 2 * LANE_WIDTH,
      });
      const runnerB = makeRunner({
        horseId: "h1b",
        position: 100,
        velocity: 16,
        lane: 2 * LANE_WIDTH,
      });
      const blockerA = makeRunner({
        horseId: "h2a",
        position: 101,
        velocity: 14,
        lane: 2 * LANE_WIDTH,
      });
      const blockerB = makeRunner({
        horseId: "h2b",
        position: 101,
        velocity: 14,
        lane: 2 * LANE_WIDTH,
      });

      // Set escapeLaneDelta manually (simulating calculateTargetLane output)
      detectBlocking(runnerA, [blockerA, runnerA]);
      detectBlocking(runnerB, [blockerB, runnerB]);
      runnerA.escapeLaneDelta = 1;
      runnerB.escapeLaneDelta = 2;

      applyBlockingEffect(runnerA, [blockerA, runnerA]);
      applyBlockingEffect(runnerB, [blockerB, runnerB]);

      // Runner B (wider escape) should have lost more velocity
      expect(runnerB.velocity).toBeLessThan(runnerA.velocity);
    });
  });
});
