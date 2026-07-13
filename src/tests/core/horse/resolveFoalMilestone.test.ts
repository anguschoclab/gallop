/**
 * resolveFoalMilestone.test.ts — Store action tests for the Foal Development arc.
 *
 * Verifies idempotency, stat delta application (with clamping), and the
 * transition of the targeted milestone from `pending` to `resolved` with the
 * correct choice bookkeeping.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createDefaultFoalDevelopmentArc } from "@/core/horse/foalDevelopment";
import type { Horse } from "@/core/horse/types";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

function seedHorse(overrides: Partial<Horse> = {}) {
  const horse = createTestHorse({
    id: "foal-1",
    owned: true,
    developmentArc: createDefaultFoalDevelopmentArc(0),
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      consistency: 50,
    } as Horse["stats"],
    ...overrides,
  });
  useGame.setState({ horses: h2r([horse]), day: 20, log: [] } as any);
  return horse;
}

describe("resolveFoalMilestone", () => {
  beforeEach(() => {
    useGame.setState({ horses: {}, day: 0, log: [] } as any);
  });

  it("applies stat deltas from the chosen option", () => {
    seedHorse();
    const res = useGame.getState().resolveFoalMilestone("foal-1", "breaking_in", "bold_approach");
    expect(res.ok).toBe(true);
    const horse = useGame.getState().horses.find((h) => h.id === "foal-1")!;
    expect(horse.stats.speed).toBe(52);
    expect(horse.stats.acceleration).toBe(52);
    expect(horse.stats.stamina).toBe(49);
    expect(horse.stats.consistency).toBe(50);
  });

  it("marks the milestone resolved with the chosen key and current day", () => {
    seedHorse();
    useGame.setState({ day: 42 } as any);
    useGame.getState().resolveFoalMilestone("foal-1", "breaking_in", "patient_method");
    const horse = useGame.getState().horses.find((h) => h.id === "foal-1")!;
    const milestone = horse.developmentArc!.milestones.find((m) => m.key === "breaking_in")!;
    expect(milestone.status).toBe("resolved");
    expect(milestone.resolvedChoiceKey).toBe("patient_method");
    expect(milestone.resolvedOnDay).toBe(42);
  });

  it("leaves other milestones untouched", () => {
    seedHorse();
    useGame.getState().resolveFoalMilestone("foal-1", "breaking_in", "natural_progression");
    const horse = useGame.getState().horses.find((h) => h.id === "foal-1")!;
    const other = horse.developmentArc!.milestones.find((m) => m.key === "early_workouts")!;
    expect(other.status).toBe("pending");
    expect(other.resolvedChoiceKey).toBeUndefined();
  });

  it("is idempotent: a second resolve on the same milestone is a no-op", () => {
    seedHorse();
    const first = useGame.getState().resolveFoalMilestone("foal-1", "breaking_in", "bold_approach");
    expect(first.ok).toBe(true);
    const statsAfterFirst = { ...useGame.getState().horses[0].stats };
    const second = useGame
      .getState()
      .resolveFoalMilestone("foal-1", "breaking_in", "patient_method");
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/already resolved/i);
    const horse = useGame.getState().horses.find((h) => h.id === "foal-1")!;
    expect(horse.stats).toEqual(statsAfterFirst);
    const milestone = horse.developmentArc!.milestones.find((m) => m.key === "breaking_in")!;
    expect(milestone.resolvedChoiceKey).toBe("bold_approach");
  });

  it("clamps stat changes to the 0-100 range", () => {
    seedHorse({
      stats: {
        speed: 99,
        stamina: 1,
        acceleration: 50,
        consistency: 50,
      } as Horse["stats"],
    });
    useGame.setState({ day: 25 } as any);
    const res = useGame.getState().resolveFoalMilestone("foal-1", "early_workouts", "sprint_focus");
    expect(res.ok).toBe(true);
    const horse = useGame.getState().horses.find((h) => h.id === "foal-1")!;
    expect(horse.stats.speed).toBe(100);
    expect(horse.stats.stamina).toBe(0);
  });

  it("rejects when the horse is not found", () => {
    const res = useGame.getState().resolveFoalMilestone("missing", "breaking_in", "bold_approach");
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/not found/i);
  });

  it("rejects when the horse is not owned", () => {
    seedHorse({ owned: false });
    const res = useGame.getState().resolveFoalMilestone("foal-1", "breaking_in", "bold_approach");
    expect(res.ok).toBe(false);
  });

  it("rejects an unknown milestone key", () => {
    seedHorse();
    const res = useGame.getState().resolveFoalMilestone("foal-1", "bogus", "bold_approach");
    expect(res.ok).toBe(false);
  });

  it("rejects an unknown choice key", () => {
    seedHorse();
    const res = useGame.getState().resolveFoalMilestone("foal-1", "breaking_in", "bogus");
    expect(res.ok).toBe(false);
  });

  it("rejects when the horse has no development arc", () => {
    seedHorse({ developmentArc: undefined });
    const res = useGame.getState().resolveFoalMilestone("foal-1", "breaking_in", "bold_approach");
    expect(res.ok).toBe(false);
  });
});
