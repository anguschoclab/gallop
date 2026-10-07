import { describe, it, expect } from "vitest";
import { dailySnapshotPhase } from "@/core/time/phases/dailySnapshotPhase";
import { cashPressureHistoryPhase } from "@/core/time/phases/cashPressureHistoryPhase";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import { PHASE_ORDER_DAILY_SNAPSHOT } from "@/constants";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import type { HorseDailyProgress } from "@/core/horse/dailyProgress";
import type { StrategyJournalEntry } from "@/core/tactics/strategyJournal";

const horses = Array.from({ length: 10 }, (_, i) => `h${i}`) as unknown as never[];

function mkContext(overrides: Partial<GameState> = {}, newDay = 10): PipelineContext {
  const state = makeGameState(overrides) as GameState;
  return makePipelineContext({ state, newDay }) as PipelineContext;
}

describe("dailySnapshotPhase", () => {
  it("has order PHASE_ORDER_DAILY_SNAPSHOT (204)", () => {
    expect(dailySnapshotPhase.order).toBe(PHASE_ORDER_DAILY_SNAPSHOT);
    expect(dailySnapshotPhase.order).toBe(204);
  });

  it("has name dailySnapshot", () => {
    expect(dailySnapshotPhase.name).toBe("dailySnapshot");
  });

  it("records a daily progress snapshot for player-owned horses", () => {
    const horse = createTestHorse({ id: "p1" });
    const ctx = mkContext({ horses: { p1: horse } }, 10);

    const result = dailySnapshotPhase.execute(ctx);
    const progress = result.state.horseDailyProgress as HorseDailyProgress;
    expect(progress).toBeDefined();
    expect(progress.p1).toHaveLength(1);
    expect(progress.p1[0].day).toBe(10);
  });

  it("does not snapshot NPC-owned or deceased horses", () => {
    const npc = createTestHorse({
      id: "n1",
      ownership: makeNpcOwned(asNpcStableId("s1")),
    });
    const dead = createTestHorse({ id: "d1", lifecycleStatus: "deceased" });
    const ctx = mkContext({ horses: { n1: npc, d1: dead } }, 10);

    const result = dailySnapshotPhase.execute(ctx);
    const progress = result.state.horseDailyProgress as HorseDailyProgress;
    expect(progress.n1).toBeUndefined();
    expect(progress.d1).toBeUndefined();
  });

  it("fills pending journal outcomes from race history", () => {
    const entry: StrategyJournalEntry = {
      id: "j1",
      createdDay: 5,
      horseId: "p1",
      horseName: "Runner",
      raceId: "r1",
      raceName: "Big Race",
      plan: "Sit off the pace",
    };
    const horse = createTestHorse({
      id: "p1",
      raceHistory: [
        {
          raceId: "r1",
          raceName: "Big Race",
          position: 2,
          day: 9,
          purseEarned: 5000,
          beyer: 82,
          fieldSize: 10,
        },
      ],
    });
    const ctx = mkContext({ horses: { p1: horse }, strategyJournal: [entry], cash: 12345 }, 10);

    const result = dailySnapshotPhase.execute(ctx);
    const journal = result.state.strategyJournal as StrategyJournalEntry[];
    expect(journal[0].result).toBeDefined();
    expect(journal[0].result!.position).toBe(2);
    expect(journal[0].result!.prizeMoney).toBe(5000);
    expect(journal[0].result!.cashAfter).toBe(12345);
    expect(journal[0].result!.filledDay).toBe(10);
  });

  it("is idempotent when executed twice for the same day", () => {
    const horse = createTestHorse({ id: "p1" });
    const ctx = mkContext({ horses: { p1: horse } }, 10);

    const first = dailySnapshotPhase.execute(ctx);
    const second = dailySnapshotPhase.execute({
      ...ctx,
      state: first.state,
    } as PipelineContext);

    const progress = second.state.horseDailyProgress as HorseDailyProgress;
    expect(progress.p1).toHaveLength(1);
  });

  it("cashPressureHistoryPhase no longer writes horseDailyProgress or strategyJournal", () => {
    const stable = createTestStable({ id: "s1", cash: 100000, horses });
    const horse = createTestHorse({ id: "p1" });
    const journalEntry: StrategyJournalEntry = {
      id: "j1",
      createdDay: 5,
      horseId: "p1",
      horseName: "Runner",
      raceId: "r1",
      plan: "Sit off the pace",
    };
    const ctx = mkContext(
      { npcStables: [stable], horses: { p1: horse }, strategyJournal: [journalEntry] },
      10,
    );

    const result = cashPressureHistoryPhase.execute(ctx);
    expect(result.state.cashPressureHistory).toBeDefined();
    expect(result.state.horseDailyProgress).toBeUndefined();
    expect(result.state.strategyJournal).toBe(ctx.state.strategyJournal);
  });
});
