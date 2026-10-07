import { describe, it, expect } from "vitest";
import { npcCareerTrackerPhase } from "@/core/time/phases/npcCareerTrackerPhase";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import { createRng } from "@/core/common/rng";
import type { GameState } from "@/game/types";
import type { Stable } from "@/core/stable/types";
import type { PipelineContext } from "@/core/time/pipeline";

function mkContext(
  overrides: Partial<GameState> = {},
  newDay = 800,
  rngSeed = 555,
): PipelineContext {
  const state = makeGameState(overrides) as GameState;
  return makePipelineContext({ state, newDay, dailyRng: createRng(rngSeed) }) as PipelineContext;
}

/**
 * A horse guaranteed to take an off-screen start on day 800: its only start was
 * on day 1, so the gap (~799 days) saturates the due-for-start probability at 1
 * for any RNG stream.
 */
function horseDueForStart(id: string, stableId = "s1") {
  return createTestHorse({
    id,
    age: 5,
    peakAge: 4,
    raceHistory: [{ raceId: "r0", raceName: "Old Race", position: 3, day: 1 }],
    ownership: makeNpcOwned(asNpcStableId(stableId)),
  });
}

describe("npcCareerTrackerPhase — offscreen purse crediting", () => {
  it("credits the owning stable's cash by the purse the horse earned", () => {
    const horse = horseDueForStart("n1", "s1");
    const stable = createTestStable({ id: "s1", cash: 100_000, horses: ["n1"] as never[] });
    const ctx = mkContext({ npcStables: [stable], horses: { n1: horse } }, 800);

    const result = npcCareerTrackerPhase.execute(ctx);
    const updated = result.state.horses["n1"];
    const stables = result.state.npcStables as Stable[];

    // A start happened today.
    expect(updated.raceHistory).toHaveLength(2);
    expect(updated.raceHistory.at(-1)?.offscreen).toBe(true);
    expect(updated.careerTracker?.lastOffscreenDay).toBe(800);

    // The stable's cash grew by exactly what the horse earned. With seed 555
    // the finish is position 2, so the purse is guaranteed non-zero and this
    // assertion cannot pass vacuously.
    const earned = updated.lifetimeEarnings - horse.lifetimeEarnings;
    expect(earned).toBeGreaterThan(0);
    expect(earned).toBe(updated.raceHistory.at(-1)?.purseEarned ?? 0);
    expect(stables[0].cash).toBe(100_000 + earned);
  });

  it("does not touch other stables or the player's cash", () => {
    const horse = horseDueForStart("n1", "s1");
    const s1 = createTestStable({ id: "s1", cash: 100_000, horses: ["n1"] as never[] });
    const s2 = createTestStable({ id: "s2", cash: 50_000, horses: [] });
    const ctx = mkContext({ npcStables: [s1, s2], horses: { n1: horse }, cash: 777_000 }, 800);

    const result = npcCareerTrackerPhase.execute(ctx);
    const stables = result.state.npcStables as Stable[];

    expect(stables.find((s) => s.id === "s2")?.cash).toBe(50_000);
    expect(result.state.cash).toBe(777_000);
  });

  it("does not double-credit when the phase runs again for the same day", () => {
    const horse = horseDueForStart("n1", "s1");
    const stable = createTestStable({ id: "s1", cash: 100_000, horses: ["n1"] as never[] });
    const ctx = mkContext({ npcStables: [stable], horses: { n1: horse } }, 800);

    const first = npcCareerTrackerPhase.execute(ctx);
    const cashAfterFirst = (first.state.npcStables as Stable[])[0].cash;
    const historyAfterFirst = first.state.horses["n1"].raceHistory.length;

    const second = npcCareerTrackerPhase.execute({
      ...ctx,
      state: first.state,
    } as PipelineContext);

    expect(second.state.horses["n1"].raceHistory).toHaveLength(historyAfterFirst);
    expect((second.state.npcStables as Stable[])[0].cash).toBe(cashAfterFirst);
  });

  it("handles a horse whose owning stable no longer exists", () => {
    const orphan = horseDueForStart("n1", "ghost-stable");
    const stable = createTestStable({ id: "s1", cash: 100_000, horses: [] });
    const ctx = mkContext({ npcStables: [stable], horses: { n1: orphan } }, 800);

    // Must not throw, and the surviving stable's cash is untouched.
    const result = npcCareerTrackerPhase.execute(ctx);
    expect((result.state.npcStables as Stable[])[0].cash).toBe(100_000);
  });
});
