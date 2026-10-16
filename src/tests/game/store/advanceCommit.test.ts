/**
 * advanceCommit.test.ts — store-level compare-and-swap commit semantics.
 *
 * Uses the real store slice + real EngineClient over a controllable in-memory
 * transport so each test injects exact engine events: stale revisions,
 * duplicate terminals, late cancels, progress-after-terminal, and
 * interruption/resume revision chaining.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useGame } from "@/game/store";
import { seedStore } from "@/test-utils/renderWithStore";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { EngineClient, type EngineTransport } from "@/core/engine/client";
import type { EngineCommand, EngineEvent } from "@/core/engine/protocol";
import { _setEngineClientForTests } from "@/game/store/engineClient";
import type { GameState } from "@/game/types";

/** Scriptable transport: captures commands, emits events on demand. */
class FakeTransport implements EngineTransport {
  commands: EngineCommand[] = [];
  cancels: string[] = [];
  private handler: (e: EngineEvent) => void = () => {};
  submit(msg: EngineCommand | { kind: "cancel"; commandId: string }): void {
    if ((msg as { kind: string }).kind === "cancel") {
      this.cancels.push((msg as { commandId: string }).commandId);
      return;
    }
    this.commands.push(msg as EngineCommand);
    const cmd = msg as EngineCommand;
    if (cmd.kind === "loadWorld") {
      // Like the real engine, adopt the world at the supplied revision.
      setTimeout(() =>
        this.emit({ type: "loaded", commandId: cmd.commandId, revision: cmd.baseRevision }),
      );
    }
  }
  onEvent(h: (e: EngineEvent) => void): void {
    this.handler = h;
  }
  emit(e: EngineEvent): void {
    this.handler(e);
  }
}

function committedState(day: number): GameState {
  return makeGameState({ day, cash: 100000 }) as GameState;
}

function completed(commandId: string, revision: number, day: number, daysAdvanced: number) {
  return {
    type: "completed" as const,
    commandId,
    revision,
    state: committedState(day),
    logs: [],
    daysAdvanced,
    checksum: "deadbeef",
  };
}

describe("store commit CAS (real EngineClient + fake transport)", () => {
  let transport: FakeTransport;
  let client: EngineClient;

  beforeEach(() => {
    transport = new FakeTransport();
    client = new EngineClient(transport);
    _setEngineClientForTests(client);
    seedStore({ day: 1, cash: 100000, engineRevision: 0, engineGeneration: 1 } as never);
  });

  afterEach(() => {
    _setEngineClientForTests(null);
    vi.restoreAllMocks();
  });

  it("refuses a second advance while one is in flight (one active mutation)", async () => {
    const p1 = useGame.getState().advanceMultipleDays(3, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(1));

    // A second submit while running is refused — its stale state snapshot
    // would replay over the first command's commit and regress the store.
    const p2 = useGame.getState().advanceMultipleDays(2, true);
    await p2;
    expect(transport.commands).toHaveLength(1);

    const cmd1 = transport.commands[0];
    transport.emit(completed(cmd1.commandId, 1, 4, 3));
    await p1;
    expect(useGame.getState().day).toBe(4);
    expect(useGame.getState().engineRevision).toBe(1);

    // After the first commits, a new advance dispatches at baseRevision 1.
    const p3 = useGame.getState().advanceMultipleDays(2, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(2));
    const cmd2 = transport.commands[1];
    expect(cmd2.baseRevision).toBe(1);
    transport.emit(completed(cmd2.commandId, 2, 6, 2));
    await p3;
    expect(useGame.getState().day).toBe(6);
    expect(useGame.getState().engineRevision).toBe(2);
  });

  it("drops a completion that lands after a new game bumped the generation", async () => {
    const p = useGame.getState().advanceMultipleDays(3, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(1));
    const cmd = transport.commands[0];

    // New game: generation bump invalidates in-flight results.
    useGame.setState({ engineGeneration: 2, engineRevision: 0, day: 1 });

    transport.emit(completed(cmd.commandId, 1, 4, 3));
    await p;
    // Stale generation result discarded — state untouched.
    expect(useGame.getState().day).toBe(1);
    expect(useGame.getState().engineRevision).toBe(0);
  });

  it("drops a completion whose revision does not advance the store", async () => {
    const p = useGame.getState().advanceMultipleDays(3, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(1));
    const cmd = transport.commands[0];

    // A concurrent commit already landed rev 5 — the result at rev 1 is stale.
    useGame.setState({ engineRevision: 5, day: 10 });
    transport.emit(completed(cmd.commandId, 1, 4, 3));
    await p;
    expect(useGame.getState().day).toBe(10);
    expect(useGame.getState().engineRevision).toBe(5);
  });

  it("a late cancel still commits its partial progress exactly once", async () => {
    const p = useGame.getState().advanceMultipleDays(10, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(1));
    const cmd = transport.commands[0];
    useGame.getState().cancelAdvance();
    expect(transport.cancels).toEqual([cmd.commandId]);

    // Engine checkpointed at day boundary: 4 of 10 days committed.
    transport.emit({
      type: "cancelled",
      commandId: cmd.commandId,
      revision: 1,
      state: committedState(5),
      logs: [],
      daysAdvanced: 4,
    });
    await p;
    expect(useGame.getState().day).toBe(5);
    expect(useGame.getState().engineRevision).toBe(1);
    expect(useGame.getState().execution?.status).toBe("idle");
  });

  it("duplicate terminal events commit once — the second is ignored", async () => {
    const p = useGame.getState().advanceMultipleDays(2, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(1));
    const cmd = transport.commands[0];
    transport.emit(completed(cmd.commandId, 1, 3, 2));
    transport.emit(completed(cmd.commandId, 1, 3, 2));
    await p;
    expect(useGame.getState().day).toBe(3);
    expect(useGame.getState().engineRevision).toBe(1);
  });

  it("progress after the terminal event cannot mutate the store", async () => {
    const p = useGame.getState().advanceMultipleDays(3, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(1));
    const cmd = transport.commands[0];
    transport.emit(completed(cmd.commandId, 1, 4, 3));
    await p;
    // A stale progress event for the settled command is dropped by the client.
    transport.emit({
      type: "progress",
      commandId: cmd.commandId,
      day: 99,
      daysCompleted: 99,
      totalDays: 3,
    });
    expect(useGame.getState().day).toBe(4);
    expect(useGame.getState().execution?.status).toBe("idle");
  });

  it("engine failure is a recoverable error — store stays at committed state and next advance works", async () => {
    const p = useGame.getState().advanceMultipleDays(3, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(1));
    const cmd = transport.commands[0];

    // Worker crash mid-flight: client fails the command with a rejection.
    client.failAll(new Error("engine worker crashed"));
    await p;

    const st = useGame.getState();
    expect(st.execution?.status).toBe("failed");
    expect(st.day).toBe(1); // committed state untouched
    expect(st.engineRevision).toBe(0);

    // The failed status is sticky for the UI, but does not block recovery —
    // a fresh client's next advance dispatches and commits normally.
    const transport2 = new FakeTransport();
    _setEngineClientForTests(new EngineClient(transport2));
    const p2 = useGame.getState().advanceMultipleDays(1, true);
    await vi.waitFor(() => expect(transport2.commands).toHaveLength(1));
    transport2.emit(completed(transport2.commands[0].commandId, 1, 2, 1));
    await p2;
    expect(useGame.getState().day).toBe(2);
    expect(useGame.getState().execution?.status).toBe("idle");
  });

  it("omits the state payload once the store matches the engine's committed world", async () => {
    const p1 = useGame.getState().advanceMultipleDays(1, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(1));
    // First command after client injection: no committed world → full state.
    expect(transport.commands[0].state).toBeDefined();
    transport.emit(completed(transport.commands[0].commandId, 1, 2, 1));
    await p1;

    // The store's engine-owned fields are now identical to the committed
    // world — the second command carries no 7MB snapshot.
    const p2 = useGame.getState().advanceMultipleDays(1, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(2));
    expect(transport.commands[1].state).toBeUndefined();
    transport.emit(completed(transport.commands[1].commandId, 2, 3, 1));
    await p2;
    expect(useGame.getState().day).toBe(3);
  });

  it("resyncs a full state payload after a store-side world mutation", async () => {
    const p1 = useGame.getState().advanceMultipleDays(1, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(1));
    transport.emit(completed(transport.commands[0].commandId, 1, 2, 1));
    await p1;

    // Store-side mutation between commands (e.g. a purchase) diverges the
    // world — the next command must carry a fresh snapshot.
    useGame.setState({ cash: 42 });
    const p2 = useGame.getState().advanceMultipleDays(1, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(2));
    const resync = transport.commands[1].state;
    expect(resync).toBeDefined();
    expect(resync?.cash).toBe(42);
    transport.emit(completed(transport.commands[1].commandId, 2, 3, 1));
    await p2;
  });

  it("a stale_base_revision rejection rebases via loadWorld and retries", async () => {
    const p = useGame.getState().advanceMultipleDays(1, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(1));
    const cmd1 = transport.commands[0];

    // Engine lost its authority (transport restart) — reject the command.
    transport.emit({
      type: "rejected",
      commandId: cmd1.commandId,
      reason: "stale_base_revision",
    });
    // The transport auto-answers loadWorld, so the retry advance queues
    // immediately after it: [advance, loadWorld, advance].
    await vi.waitFor(() => expect(transport.commands).toHaveLength(3));

    const load = transport.commands[1];
    expect(load.kind).toBe("loadWorld");
    expect(load.baseRevision).toBe(0); // store's engineRevision
    const retry = transport.commands[2];
    expect(retry.kind).toBe("advance");
    transport.emit(completed(retry.commandId, 1, 2, 1));
    await p;
    expect(useGame.getState().day).toBe(2);
  });

  it("interrupted range commits once; resume dispatches on the committed revision", async () => {
    const p1 = useGame.getState().advanceMultipleDays(10, false);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(1));
    const cmd1 = transport.commands[0];
    transport.emit({
      type: "interrupted",
      commandId: cmd1.commandId,
      revision: 1,
      state: committedState(4),
      logs: [],
      daysAdvanced: 3,
      raceId: "race-9",
      checksum: "abc",
    });
    await p1;

    const st = useGame.getState();
    expect(st.day).toBe(4);
    expect(st.engineRevision).toBe(1);
    expect(st.execution?.status).toBe("interrupted");
    expect(st.execution?.interruptRaceId).toBe("race-9");
    expect(st.execution?.remainingDays).toBe(7);

    // Resume the remaining 7 days — command carries baseRevision 1.
    const p2 = useGame.getState().advanceMultipleDays(7, true);
    await vi.waitFor(() => expect(transport.commands).toHaveLength(2));
    expect(transport.commands[1].baseRevision).toBe(1);
    transport.emit(completed(transport.commands[1].commandId, 2, 11, 7));
    await p2;
    expect(useGame.getState().day).toBe(11);
  });
});
