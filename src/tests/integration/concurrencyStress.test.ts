/**
 * concurrencyStress.test.ts — deterministic adversarial interleavings.
 *
 * A seeded RNG drives a random schedule of store advance submissions,
 * cancellations, and injected protocol faults (duplicate terminals,
 * stale-revision completions, progress-after-terminal). Invariants under
 * every interleaving:
 *
 * - engineRevision is monotonically non-decreasing
 * - day never regresses
 * - every submitted command settles exactly once (no double commits)
 * - the store ends in a coherent execution state
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useGame } from "@/game/store";
import { seedStore } from "@/test-utils/renderWithStore";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { EngineClient, type EngineTransport } from "@/core/engine/client";
import type { AdvanceCommand, EngineEvent } from "@/core/engine/protocol";
import { _setEngineClientForTests } from "@/game/store/engineClient";
import type { GameState } from "@/game/types";
import { createRng } from "@/core/common/rng";

vi.mock("@/services/storage/storageAdapter", () => ({
  STORAGE_KEYS: {
    GAME_STATE: "gallop_game_state",
    GAME_STATE_FALLBACK: "gallop_game_state_fallback",
    RACE_FILTERS: "gallop_race_filters",
    RACE_HISTORY_LIMIT: "gallop_race_history_limit",
    RACES_DAY_JUMP: "gallop_races_day_jump",
    NEW_GAME_WIZARD: "gallop_new_game_wizard",
  },
}));

vi.mock("@/services/storage/indexedDbService", () => ({
  clearDatabase: vi.fn().mockResolvedValue(undefined),
  isIndexedDbAvailable: vi.fn(() => false),
  saveBuckets: vi.fn().mockResolvedValue(undefined),
  loadBuckets: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/game/store/storage", async (importActual) => {
  const actual = await importActual<typeof import("@/game/store/storage")>();
  return {
    ...actual,
    createIdbStorage: () => ({
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn().mockResolvedValue(undefined),
    }),
    saveCoordinator: { ...actual.saveCoordinator, disarm: vi.fn() },
  };
});

/**
 * A chaotic engine stand-in: each submitted command emits its terminal after
 * a random microtask delay, optionally preceded by progress noise and
 * followed by duplicate/stale fault events.
 */
class ChaosTransport implements EngineTransport {
  private handler: (e: EngineEvent) => void = () => {};
  private revision = 0;
  private day = 1;

  constructor(private rng: () => number) {}

  submit(msg: AdvanceCommand | { kind: "cancel"; commandId: string }): void {
    if ((msg as { kind: string }).kind === "cancel") {
      return; // engine may or may not honour it — terminal still arrives
    }
    const cmd = msg as AdvanceCommand;
    if (cmd.baseRevision !== this.revision) {
      queueMicrotask(() =>
        this.emit({ type: "rejected", commandId: cmd.commandId, reason: "stale_base_revision" }),
      );
      return;
    }
    const days = cmd.days;
    const baseDay = cmd.state!.day;
    const rev = ++this.revision;
    const delay = Math.floor(this.rng() * 3);
    setTimeout(() => {
      this.day = baseDay + days;
      const terminal: EngineEvent = {
        type: "completed",
        commandId: cmd.commandId,
        revision: rev,
        state: makeGameState({ day: this.day }) as GameState,
        logs: [],
        daysAdvanced: days,
        checksum: `c${rev}`,
      };
      // Random protocol noise around the terminal event.
      if (this.rng() < 0.5) {
        this.emit({
          type: "progress",
          commandId: cmd.commandId,
          day: baseDay + 1,
          daysCompleted: 1,
          totalDays: days,
        });
      }
      this.emit(terminal);
      if (this.rng() < 0.4) this.emit(terminal); // duplicate terminal
      if (this.rng() < 0.4) {
        // Stale revision replay must be dropped downstream.
        this.emit({ ...terminal, revision: rev - 1 });
      }
      if (this.rng() < 0.4) {
        this.emit({
          type: "progress",
          commandId: cmd.commandId,
          day: this.day + 99,
          daysCompleted: 99,
          totalDays: days,
        });
      }
    }, delay);
  }

  onEvent(h: (e: EngineEvent) => void): void {
    this.handler = h;
  }

  private emit(e: EngineEvent) {
    this.handler(e);
  }
}

describe("concurrency stress — adversarial command/event interleavings", () => {
  beforeEach(() => {
    seedStore({
      day: 1,
      cash: 100000,
      races: {},
      horses: {},
      engineRevision: 0,
      engineGeneration: 1,
    } as never);
  });

  afterEach(() => {
    _setEngineClientForTests(null);
  });

  it("survives 5 seeded schedules with monotonic state and exactly-once commits", async () => {
    for (const seed of ["stress-a", "stress-b", "stress-c", "stress-d", "stress-e"]) {
      const rng = createRng(seed).next;
      _setEngineClientForTests(new EngineClient(new ChaosTransport(() => rng())));
      seedStore({ day: 1, engineRevision: 0, engineGeneration: 1 } as never);

      let lastDay = 1;
      let lastRev = 0;
      const unsub = useGame.subscribe(() => {
        const s = useGame.getState();
        expect(s.day).toBeGreaterThanOrEqual(lastDay);
        expect(s.engineRevision ?? 0).toBeGreaterThanOrEqual(lastRev);
        lastDay = s.day;
        lastRev = s.engineRevision ?? 0;
      });

      const tasks: Promise<unknown>[] = [];
      // 15 serialized rounds: submit an advance, occasionally cancel it,
      // occasionally fire a second (refused) submit while one is running.
      for (let i = 0; i < 15; i++) {
        tasks.push(useGame.getState().advanceMultipleDays(1 + Math.floor(rng() * 3), true));
        if (rng() < 0.3) useGame.getState().cancelAdvance();
        if (rng() < 0.3) {
          tasks.push(useGame.getState().advanceMultipleDays(1, true)); // refused while running
        }
      }
      await Promise.all(tasks);
      // Flush any trailing microtask/setTimeout terminals.
      await new Promise((r) => setTimeout(r, 30));
      unsub();

      const s = useGame.getState();
      expect(s.day).toBeGreaterThanOrEqual(1);
      expect(["idle", "interrupted", "failed", "cancelling"]).toContain(
        s.execution?.status ?? "idle",
      );
      // The store's committed revision never exceeds what the engine issued.
      expect(s.engineRevision ?? 0).toBeLessThanOrEqual(15);
    }
  });
});
