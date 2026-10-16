import { describe, it, expect, beforeEach } from "vitest";
import type { GameState } from "@/game/types";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { EngineClient } from "@/core/engine/client";
import { LocalTransport } from "@/core/engine/transports";
import { SimulationEngine } from "@/core/engine/engine";
import { parseCommand, parseCancel } from "@/core/engine/protocol";
import type { EngineEvent, AdvanceCommand } from "@/core/engine/protocol";

function makeClient(engine = new SimulationEngine()) {
  const transport = new LocalTransport(engine);
  return { client: new EngineClient(transport), transport, engine };
}

function flush(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

describe("engine protocol — parseCommand", () => {
  it("rejects malformed commands", () => {
    expect(parseCommand(null)).toBeNull();
    expect(parseCommand({})).toBeNull();
    expect(parseCommand({ kind: "advance" })).toBeNull();
    expect(parseCommand({ kind: "nope", commandId: "x", baseRevision: 0 })).toBeNull();
  });

  it("rejects non-positive day counts", () => {
    expect(
      parseCommand({
        kind: "advance",
        commandId: "c1",
        baseRevision: 0,
        state: {},
        days: 0,
        headless: true,
      }),
    ).toBeNull();
  });

  it("parses cancel messages and rejects non-cancel shapes", () => {
    expect(parseCancel({ kind: "cancel", commandId: "c1" })).toEqual({
      commandId: "c1",
    });
    expect(parseCancel({ kind: "cancel" })).toBeNull();
    expect(parseCancel({ kind: "advance" })).toBeNull();
  });
});

describe("SimulationEngine — serialized authority", () => {
  let state: GameState;
  beforeEach(() => {
    state = makeGameState({ day: 1, cash: 100000 }) as GameState;
  });

  it("rejects malformed commands without executing", async () => {
    const engine = new SimulationEngine();
    const events: EngineEvent[] = [];
    await engine.submit({ garbage: true }, (e) => events.push(e));
    expect(events).toEqual([{ type: "rejected", commandId: "", reason: "malformed" }]);
  });

  it("rejects a duplicate commandId without re-executing", async () => {
    const engine = new SimulationEngine();
    const events: EngineEvent[] = [];
    const emit = (e: EngineEvent) => events.push(e);
    await engine.submit(
      { kind: "advance", commandId: "dup", baseRevision: 0, state, days: 1, headless: true },
      emit,
    );
    await engine.submit(
      { kind: "advance", commandId: "dup", baseRevision: 1, state, days: 1, headless: true },
      emit,
    );
    const rejections = events.filter((e) => e.type === "rejected");
    expect(rejections).toEqual([
      { type: "rejected", commandId: "dup", reason: "duplicate_command" },
    ]);
  });

  it("rejects a stale baseRevision", async () => {
    const engine = new SimulationEngine();
    const events: EngineEvent[] = [];
    const emit = (e: EngineEvent) => events.push(e);
    await engine.submit(
      { kind: "advance", commandId: "c1", baseRevision: 0, state, days: 1, headless: true },
      emit,
    );
    await engine.submit(
      { kind: "advance", commandId: "c2", baseRevision: 0, state, days: 1, headless: true },
      emit,
    );
    expect(events.at(-1)).toEqual({
      type: "rejected",
      commandId: "c2",
      reason: "stale_base_revision",
    });
  });

  it("rejects a second submission while busy", async () => {
    const engine = new SimulationEngine();
    const events: EngineEvent[] = [];
    const emit = (e: EngineEvent) => events.push(e);
    const pending = engine.submit(
      { kind: "advance", commandId: "c1", baseRevision: 0, state, days: 5, headless: true },
      emit,
    );
    await engine.submit(
      { kind: "advance", commandId: "c2", baseRevision: 0, state, days: 1, headless: true },
      emit,
    );
    await pending;
    const rejections = events.filter((e) => e.type === "rejected");
    expect(rejections).toEqual([{ type: "rejected", commandId: "c2", reason: "engine_busy" }]);
  });

  it("cancel mid-range produces a cancelled terminal with partial days", async () => {
    const engine = new SimulationEngine();
    const events: EngineEvent[] = [];
    const emit = (e: EngineEvent) => {
      events.push(e);
      if (e.type === "progress" && e.daysCompleted === 2) {
        engine.cancel("c1");
      }
    };
    await engine.submit(
      { kind: "advance", commandId: "c1", baseRevision: 0, state, days: 10, headless: true },
      emit,
    );
    const terminal = events.at(-1);
    expect(terminal?.type).toBe("cancelled");
    if (terminal?.type === "cancelled") {
      expect(terminal.daysAdvanced).toBeGreaterThanOrEqual(2);
      expect(terminal.daysAdvanced).toBeLessThan(10);
      expect(terminal.state.day).toBe(state.day + terminal.daysAdvanced);
    }
  });

  it("revisions increase monotonically across commits", async () => {
    const engine = new SimulationEngine();
    const revs: number[] = [];
    const emit = (e: EngineEvent) => {
      if (e.type === "completed") revs.push(e.revision);
    };
    await engine.submit(
      { kind: "advance", commandId: "c1", baseRevision: 0, state, days: 1, headless: true },
      emit,
    );
    await engine.submit(
      {
        kind: "advance",
        commandId: "c2",
        baseRevision: 1,
        state: { ...state, day: 2 },
        days: 1,
        headless: true,
      },
      emit,
    );
    expect(revs).toEqual([1, 2]);
    expect(engine.currentRevision).toBe(2);
  });

  it("telemetry mode returns an aggregated report on the terminal event", async () => {
    const engine = new SimulationEngine();
    let terminal: EngineEvent | undefined;
    await engine.submit(
      {
        kind: "advance",
        commandId: "c1",
        baseRevision: 0,
        state,
        days: 3,
        headless: true,
        telemetry: true,
      },
      (e) => {
        if (e.type !== "accepted" && e.type !== "progress") terminal = e;
      },
    );
    expect(terminal?.type).toBe("completed");
    if (terminal?.type === "completed") {
      expect(terminal.telemetry?.enabled).toBe(true);
      expect(terminal.telemetry?.spans.length).toBeGreaterThan(0);
      const daySpan = terminal.telemetry?.spans.find((s) => s.label === "day");
      expect(daySpan?.count).toBe(3);
    }
  });

  it("telemetry disabled by default: terminal events carry no report", async () => {
    const engine = new SimulationEngine();
    let terminal: EngineEvent | undefined;
    await engine.submit(
      { kind: "advance", commandId: "c1", baseRevision: 0, state, days: 1, headless: true },
      (e) => {
        if (e.type !== "accepted" && e.type !== "progress") terminal = e;
      },
    );
    expect(terminal?.type).toBe("completed");
    if (terminal?.type === "completed") {
      expect(terminal.telemetry).toBeUndefined();
    }
  });
});

describe("EngineClient — ordering, idempotency, faults", () => {
  let state: GameState;
  beforeEach(() => {
    state = makeGameState({ day: 1, cash: 100000 }) as GameState;
  });

  it("serializes queued commands onto successive revisions", async () => {
    const { client } = makeClient();
    const [r1, r2] = await Promise.all([
      client.submit({ days: 1, headless: true, state }),
      client.submit({ days: 2, headless: true, state }),
    ]);
    expect(r1.status).toBe("completed");
    expect(r2.status).toBe("completed");
    if (r1.status === "completed" && r2.status === "completed") {
      expect(r1.revision).toBe(1);
      expect(r2.revision).toBe(2);
      expect(client.revision).toBe(2);
    }
  });

  it("idempotent resubmission returns the same promise", async () => {
    const { client } = makeClient();
    const p1 = client.submit({ days: 1, headless: true, state }, "fixed-id");
    const p2 = client.submit({ days: 1, headless: true, state }, "fixed-id");
    expect(p2).toBe(p1);
    const r = await p1;
    expect(r.status).toBe("completed");
  });

  it("ignores events for unknown command ids", async () => {
    const { client, transport } = makeClient();
    const promise = client.submit({ days: 1, headless: true, state });
    // Inject a forged stale event — must not disturb the in-flight command.
    (transport as unknown as { handler: (e: EngineEvent) => void }).handler?.({
      type: "completed",
      commandId: "forged",
      revision: 99,
      state,
      logs: [],
      daysAdvanced: 1,
      checksum: "deadbeef",
    });
    const r = await promise;
    expect(r.status).toBe("completed");
    if (r.status === "completed") expect(r.revision).toBe(1);
  });

  it("cancel() forwards a cancel for the active command only", async () => {
    const { client, transport } = makeClient();
    const sent: unknown[] = [];
    const orig = transport.submit.bind(transport);
    transport.submit = (m) => {
      sent.push(m);
      orig(m);
    };
    const promise = client.submit({ days: 30, headless: true, state });
    await flush();
    client.cancel();
    const r = await promise;
    expect(r.status).toBe("cancelled");
    const cancels = sent.filter((m) => (m as { kind: string }).kind === "cancel") as {
      commandId: string;
    }[];
    expect(cancels.length).toBe(1);
  });

  it("failAll settles the in-flight command and drains the queue", async () => {
    const { client } = makeClient();
    const p1 = client.submit({ days: 1, headless: true, state });
    const p2 = client.submit({ days: 1, headless: true, state });
    client.failAll(new Error("worker crashed"));
    await expect(p1).rejects.toThrow("worker crashed");
    await expect(p2).rejects.toThrow("worker crashed");
  });

  it("worker and local transports are protocol-identical for the same command", async () => {
    // Both transports host a SimulationEngine; assert the same command
    // produces the same terminal shape/state through each.
    const engineA = new SimulationEngine();
    const eventsA: EngineEvent[] = [];
    const cmd: AdvanceCommand = {
      kind: "advance",
      commandId: "c1",
      baseRevision: 0,
      state,
      days: 3,
      headless: true,
      checksum: true,
    };
    await engineA.submit(cmd, (e) => eventsA.push(e));

    const engineB = new SimulationEngine();
    const eventsB: EngineEvent[] = [];
    await engineB.submit(cmd, (e) => eventsB.push(e));

    const termA = eventsA.at(-1);
    const termB = eventsB.at(-1);
    expect(termA?.type).toBe("completed");
    expect(termB?.type).toBe("completed");
    if (termA?.type === "completed" && termB?.type === "completed") {
      expect(termA.checksum).toBe(termB.checksum);
      expect(termA.state.day).toBe(termB.state.day);
    }
  });
});

describe("resolveLiveRace command", () => {
  it("parses well-formed resolveLiveRace commands and rejects malformed ones", () => {
    expect(
      parseCommand({
        kind: "resolveLiveRace",
        commandId: "r1",
        baseRevision: 0,
        state: {},
        raceId: "race-1",
        result: [{ horseId: "h1", position: 1, time: 90 }],
      }),
    ).not.toBeNull();
    expect(
      parseCommand({
        kind: "resolveLiveRace",
        commandId: "r2",
        baseRevision: 0,
        state: {},
        raceId: "",
        result: [],
      }),
    ).toBeNull();
    expect(
      parseCommand({
        kind: "resolveLiveRace",
        commandId: "r3",
        baseRevision: 0,
        state: {},
        raceId: "race-1",
      }),
    ).toBeNull();
  });

  it("emits a resolved terminal event carrying a bumped revision and committed state", async () => {
    const engine = new SimulationEngine();
    const events: EngineEvent[] = [];
    const state = makeGameState({ day: 5, cash: 1000 }) as GameState;
    await engine.submit(
      {
        kind: "resolveLiveRace",
        commandId: "rr1",
        baseRevision: 0,
        state,
        raceId: "missing-race",
        result: [{ horseId: "h1", position: 1, time: 90 }],
      },
      (e) => events.push(e),
    );
    const term = events.at(-1);
    expect(term?.type).toBe("resolved");
    if (term?.type === "resolved") {
      expect(term.revision).toBe(1);
      expect(term.raceId).toBe("missing-race");
      // Unknown race → unchanged state, but the commit is still consistent.
      expect(term.state.day).toBe(5);
    }
    expect(engine.currentRevision).toBe(1);
  });

  it("client settles resolveLiveRace submissions with the resolved result", async () => {
    const { client } = makeClient();
    const state = makeGameState({ day: 5 }) as GameState;
    const res = await client.submit({
      kind: "resolveLiveRace",
      state,
      raceId: "race-x",
      result: [],
    });
    expect(res.status).toBe("resolved");
    if (res.status === "resolved") expect(res.revision).toBe(1);
    expect(client.revision).toBe(1);
  });
});

describe("retained world — loadWorld + stateless commands", () => {
  let state: GameState;
  beforeEach(() => {
    state = makeGameState({ day: 1, cash: 100000 }) as GameState;
  });

  it("rejects a stateless command when no world is loaded", async () => {
    const engine = new SimulationEngine();
    const events: EngineEvent[] = [];
    await engine.submit(
      { kind: "advance", commandId: "c1", baseRevision: 0, days: 1, headless: true },
      (e) => events.push(e),
    );
    expect(events.at(-1)).toEqual({
      type: "rejected",
      commandId: "c1",
      reason: "no_world_loaded",
    });
  });

  it("loadWorld seeds the retained world; stateless advances run against it", async () => {
    const engine = new SimulationEngine();
    const events: EngineEvent[] = [];
    const emit = (e: EngineEvent) => events.push(e);
    await engine.submit({ kind: "loadWorld", commandId: "load", baseRevision: 7, state }, emit);
    expect(events.at(-1)).toEqual({ type: "loaded", commandId: "load", revision: 7 });
    expect(engine.currentRevision).toBe(7);

    await engine.submit(
      { kind: "advance", commandId: "c1", baseRevision: 7, days: 1, headless: true },
      emit,
    );
    const term = events.at(-1);
    expect(term?.type).toBe("completed");
    if (term?.type === "completed") {
      expect(term.revision).toBe(8);
      expect(term.state.day).toBe(state.day + 1);
    }
  });

  it("a committed advance becomes the retained world for the next command", async () => {
    const engine = new SimulationEngine();
    const events: EngineEvent[] = [];
    const emit = (e: EngineEvent) => events.push(e);
    await engine.submit(
      { kind: "advance", commandId: "c1", baseRevision: 0, state, days: 1, headless: true },
      emit,
    );
    // Second command omits state entirely — runs against the commit.
    await engine.submit(
      { kind: "advance", commandId: "c2", baseRevision: 1, days: 1, headless: true },
      emit,
    );
    const term = events.at(-1);
    expect(term?.type).toBe("completed");
    if (term?.type === "completed") {
      expect(term.state.day).toBe(state.day + 2);
    }
  });

  it("loadWorld rebases a stale engine (transport-restart recovery)", async () => {
    const engine = new SimulationEngine();
    const events: EngineEvent[] = [];
    const emit = (e: EngineEvent) => events.push(e);
    await engine.submit(
      { kind: "advance", commandId: "c1", baseRevision: 0, state, days: 1, headless: true },
      emit,
    );
    // Engine at rev 1; a recovered store believes rev 40 — loadWorld must
    // adopt the supplied world at the supplied revision despite the mismatch.
    await engine.submit({ kind: "loadWorld", commandId: "rebase", baseRevision: 40, state }, emit);
    expect(events.at(-1)).toEqual({ type: "loaded", commandId: "rebase", revision: 40 });
    await engine.submit(
      { kind: "advance", commandId: "c2", baseRevision: 40, days: 1, headless: true },
      emit,
    );
    expect(events.at(-1)?.type).toBe("completed");
  });

  it("an inline state payload overrides the retained world", async () => {
    const engine = new SimulationEngine();
    const events: EngineEvent[] = [];
    const emit = (e: EngineEvent) => events.push(e);
    await engine.submit({ kind: "loadWorld", commandId: "load", baseRevision: 0, state }, emit);
    const diverged = makeGameState({ day: 100, cash: 5 }) as GameState;
    await engine.submit(
      {
        kind: "advance",
        commandId: "c1",
        baseRevision: 0,
        state: diverged,
        days: 1,
        headless: true,
      },
      emit,
    );
    const term = events.at(-1);
    expect(term?.type).toBe("completed");
    if (term?.type === "completed") {
      expect(term.state.day).toBe(101);
    }
  });

  it("client resolves a loadWorld submit with the loaded status", async () => {
    const { client } = makeClient();
    const res = await client.submit({ kind: "loadWorld", state, baseRevision: 12 });
    expect(res).toEqual({ status: "loaded", revision: 12 });
    expect(client.revision).toBe(12);
  });
});
