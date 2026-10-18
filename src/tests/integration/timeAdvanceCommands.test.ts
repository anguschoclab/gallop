/**
 * timeAdvanceCommands.test.ts — production command flow at every time scale.
 *
 * advanceDay/advanceWeek/advanceMonth/advanceYear must all funnel through the
 * same revisioned EngineClient command path with the correct day counts.
 * Verified against the real store + real EngineClient over a recording
 * transport.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useGame } from "@/platform/game/store";
import { seedStore } from "@/test-utils/renderWithStore";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { EngineClient, type EngineTransport } from "@/platform/engine/client";
import type { AdvanceCommand, EngineEvent } from "@/platform/engine/protocol";
import { _setEngineClientForTests } from "@/platform/game/store/engineClient";
import type { GameState } from "@/platform/game/types";
import {
  DAYS_PER_WEEK,
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
} from "@/domains/calendar/model/calendarConstants";

vi.mock("@/platform/persistence/storage/storageAdapter", () => ({
  STORAGE_KEYS: {
    GAME_STATE: "gallop_game_state",
    GAME_STATE_FALLBACK: "gallop_game_state_fallback",
    RACE_FILTERS: "gallop_race_filters",
    RACE_HISTORY_LIMIT: "gallop_race_history_limit",
    RACES_DAY_JUMP: "gallop_races_day_jump",
    NEW_GAME_WIZARD: "gallop_new_game_wizard",
  },
}));

vi.mock("@/platform/persistence/storage/indexedDbService", () => ({
  clearDatabase: vi.fn().mockResolvedValue(undefined),
  isIndexedDbAvailable: vi.fn(() => false),
  saveBuckets: vi.fn().mockResolvedValue(undefined),
  loadBuckets: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/platform/game/store/storage", async (importActual) => {
  const actual = await importActual<typeof import("@/platform/game/store/storage")>();
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

class RecordingTransport implements EngineTransport {
  commands: AdvanceCommand[] = [];
  private handler: (e: EngineEvent) => void = () => {};
  // Like the real engine, the transport retains the last committed world —
  // commands that omit `state` execute against it.
  private world: GameState | null = null;
  submit(msg: AdvanceCommand | { kind: "cancel"; commandId: string }): void {
    if ((msg as { kind: string }).kind === "cancel") return;
    this.commands.push(msg as AdvanceCommand);
    const cmd = msg as AdvanceCommand;
    if ((cmd as { kind: string }).kind === "loadWorld") {
      const load = msg as { commandId: string; baseRevision: number; state: GameState };
      this.world = load.state;
      setTimeout(() =>
        this.handler({ type: "loaded", commandId: load.commandId, revision: load.baseRevision }),
      );
      return;
    }
    const base = cmd.state ?? this.world;
    const finalDay = base!.day + cmd.days;
    const committed = makeGameState({ day: finalDay }) as GameState;
    this.world = committed;
    // Auto-complete each command one microtask later.
    setTimeout(() =>
      this.handler({
        type: "completed",
        commandId: cmd.commandId,
        revision: this.commands.length,
        state: committed,
        logs: [],
        daysAdvanced: cmd.days,
        checksum: `r${this.commands.length}`,
      }),
    );
  }
  onEvent(h: (e: EngineEvent) => void): void {
    this.handler = h;
  }
}

describe("time-advance commands across scales", () => {
  let transport: RecordingTransport;

  beforeEach(() => {
    transport = new RecordingTransport();
    _setEngineClientForTests(new EngineClient(transport));
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

  async function drain() {
    await new Promise((r) => setTimeout(r, 20));
  }

  it("advanceDay submits exactly one day", async () => {
    await useGame.getState().advanceDay();
    await drain();
    expect(transport.commands[0].days).toBe(1);
    expect(useGame.getState().day).toBe(2);
  });

  it("advanceWeek submits a 7-day command", async () => {
    await useGame.getState().advanceWeek();
    await drain();
    expect(transport.commands[0].days).toBe(DAYS_PER_WEEK);
    expect(useGame.getState().day).toBe(1 + DAYS_PER_WEEK);
  });

  it("advanceMonth submits a 30-day command", async () => {
    await useGame.getState().advanceMonth();
    await drain();
    expect(transport.commands[0].days).toBe(DAYS_PER_MONTH);
    expect(useGame.getState().day).toBe(1 + DAYS_PER_MONTH);
  });

  it("advanceYear submits a 365-day command", async () => {
    await useGame.getState().advanceYear();
    await drain();
    expect(transport.commands[0].days).toBe(DAYS_PER_YEAR);
    expect(useGame.getState().day).toBe(1 + DAYS_PER_YEAR);
  });

  it("engineRevision is session-transient — never persisted across reloads", async () => {
    // A persisted high revision would make the fresh post-reload engine (rev 0)
    // reject every advance as stale_base_revision. Guard the boundary.
    const { PERSISTED_KEYS } = await import("@/platform/game/store/persistedKeys");
    expect(PERSISTED_KEYS).not.toContain("engineRevision");
    expect(PERSISTED_KEYS).not.toContain("engineGeneration");
    expect(PERSISTED_KEYS).not.toContain("execution");
  });

  it("sequential scales chain revisions correctly", async () => {
    await useGame.getState().advanceDay();
    await useGame.getState().advanceWeek();
    await drain();
    expect(transport.commands.map((c) => c.days)).toEqual([1, DAYS_PER_WEEK]);
    expect(transport.commands[1].baseRevision).toBe(1);
    expect(useGame.getState().day).toBe(2 + DAYS_PER_WEEK);
    expect(useGame.getState().engineRevision).toBe(2);
  });
});
