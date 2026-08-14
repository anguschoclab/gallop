import { describe, it, expect } from "vitest";
import {
  buildFieldContext,
  deriveRunnerConditions,
  deriveRunnerMood,
} from "@/core/race/runnerConditions";
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
    owned: false,
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

describe("deriveRunnerConditions", () => {
  it("flags Flying only when clearly faster than the field average", () => {
    const fast = runner({ horseId: "fast", velocity: 18, position: 900 });
    const field = buildFieldContext([fast, runner({ horseId: "b", velocity: 15, position: 700 })]);
    expect(ids(deriveRunnerConditions(fast, field, { peakVelocity: 18 }, DISTANCE))).toContain(
      "flying",
    );

    const even = runner({ horseId: "even", velocity: 15.2 });
    const evenField = buildFieldContext([
      even,
      runner({ horseId: "b", velocity: 15, position: 300 }),
    ]);
    expect(
      ids(deriveRunnerConditions(even, evenField, { peakVelocity: 15.2 }, DISTANCE)),
    ).not.toContain("flying");
  });

  it("flags Battling for a close, evenly matched duel late in the race", () => {
    const a = runner({ horseId: "a", position: 1200, velocity: 16, lane: 1 });
    const b = runner({ horseId: "b", position: 1201, velocity: 16.1, lane: 3 });
    const field = buildFieldContext([a, b]);
    const result = ids(deriveRunnerConditions(a, field, { peakVelocity: 16.2 }, DISTANCE));
    expect(result).toContain("battling");
  });

  it("flags Boxed In when a rival sits directly in front in the same lane", () => {
    const a = runner({ horseId: "a", position: 800, lane: 2 });
    const blocker = runner({ horseId: "b", position: 802, lane: 2 });
    const field = buildFieldContext([a, blocker]);
    expect(ids(deriveRunnerConditions(a, field, { peakVelocity: 16 }, DISTANCE))).toContain(
      "boxed",
    );
  });

  it("flags Flagging then In Trouble as the runner drops off its own peak", () => {
    const rivals = [runner({ horseId: "r1", position: 1000, velocity: 17, lane: 5 })];

    const fading = runner({ horseId: "a", position: 900, velocity: 16 });
    const fadingField = buildFieldContext([fading, ...rivals]);
    expect(
      ids(deriveRunnerConditions(fading, fadingField, { peakVelocity: 18 }, DISTANCE)),
    ).toContain("flagging");

    const stopping = runner({ horseId: "a", position: 900, velocity: 12 });
    const stoppingField = buildFieldContext([stopping, ...rivals]);
    expect(
      ids(deriveRunnerConditions(stopping, stoppingField, { peakVelocity: 18 }, DISTANCE)),
    ).toContain("distressed");
  });

  it("flags Ailing when the horse carries an active injury", () => {
    const hurt = runner({ horse: horse(50, true) });
    const field = buildFieldContext([hurt]);
    expect(ids(deriveRunnerConditions(hurt, field, { peakVelocity: 16 }, DISTANCE))).toContain(
      "ailing",
    );
  });

  it("returns no conditions once the runner has finished", () => {
    const done = runner({ finishTime: 95.2 });
    const field = buildFieldContext([done]);
    expect(deriveRunnerConditions(done, field, { peakVelocity: 18 }, DISTANCE)).toEqual([]);
  });
});

describe("deriveRunnerMood", () => {
  it("is happy when a front-runner is on the pace", () => {
    const leader = runner({ horseId: "a", runningStyle: "E", position: 900, velocity: 17 });
    const field = buildFieldContext([
      leader,
      runner({ horseId: "b", position: 880, velocity: 16 }),
    ]);
    const mood = deriveRunnerMood(leader, field, { peakVelocity: 17 }, DISTANCE);
    expect(mood.face).toBe("happy");
    expect(mood.reasons.join(" ")).toMatch(/pace/i);
  });

  it("is unhappy when a front-runner is stranded at the back and fading", () => {
    const stranded = runner({ horseId: "a", runningStyle: "E", position: 800, velocity: 13 });
    const field = buildFieldContext([
      stranded,
      runner({ horseId: "b", position: 860, velocity: 17, lane: 6 }),
    ]);
    const conditions = deriveRunnerConditions(stranded, field, { peakVelocity: 17 }, DISTANCE);
    const mood = deriveRunnerMood(stranded, field, { peakVelocity: 17 }, DISTANCE, conditions);
    expect(mood.face).toBe("unhappy");
    expect(mood.score).toBeLessThan(42);
  });

  it("softens a bad trip for a placid horse and worsens it for a fretful one", () => {
    const base = { horseId: "a", runningStyle: "E" as const, position: 800, velocity: 13 };
    const rival = runner({ horseId: "b", position: 880, velocity: 17, lane: 6 });

    const placid = runner({ ...base, horse: horse(85) });
    const fretful = runner({ ...base, horse: horse(20) });
    const field = buildFieldContext([placid, rival]);

    const placidMood = deriveRunnerMood(placid, field, { peakVelocity: 17 }, DISTANCE);
    const fretfulMood = deriveRunnerMood(fretful, field, { peakVelocity: 17 }, DISTANCE);
    expect(placidMood.score).toBeGreaterThan(fretfulMood.score);
  });

  it("clamps the score into 0-100", () => {
    const wretched = runner({
      runningStyle: "E",
      position: 400,
      velocity: 5,
      horse: horse(10, true),
    });
    const field = buildFieldContext([
      wretched,
      runner({ horseId: "b", position: 1400, velocity: 18, lane: 7 }),
    ]);
    const conditions = deriveRunnerConditions(wretched, field, { peakVelocity: 18 }, DISTANCE);
    const mood = deriveRunnerMood(wretched, field, { peakVelocity: 18 }, DISTANCE, conditions);
    expect(mood.score).toBeGreaterThanOrEqual(0);
    expect(mood.score).toBeLessThanOrEqual(100);
  });
});
