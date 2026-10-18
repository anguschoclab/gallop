import { describe, it, expect, beforeEach } from "vitest";
import type { GameState } from "@/platform/game/types";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makePlayerOwned } from "@/domains/horse/simulation/ownership";
import { EngineClient } from "@/platform/engine/client";
import { LocalTransport } from "@/platform/engine/transports";
import { SimulationEngine } from "@/platform/engine/engine";

/**
 * Production-path tests: commands go through the real EngineClient →
 * LocalTransport → SimulationEngine → SimulationExecutor stack — the same
 * code that runs in the engine worker.
 */
function makeClient() {
  return new EngineClient(new LocalTransport(new SimulationEngine()));
}

describe("Engine batch advance (production path)", () => {
  let baseState: GameState;

  beforeEach(() => {
    baseState = makeGameState({ day: 1, cash: 100000 }) as GameState;
  });

  it("advances day by 5 in a single command", async () => {
    const client = makeClient();
    const result = await client.submit({
      days: 5,
      headless: true,
      state: baseState,
      checksum: true,
    });
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.daysAdvanced).toBe(5);
      expect(result.state.day).toBe(6);
      expect(result.checksum).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it("returns accumulated logs from all days", async () => {
    const client = makeClient();
    const result = await client.submit({ days: 5, headless: true, state: baseState });
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.logs.length).toBeGreaterThan(0);
    }
  });

  it("stops before a player race day and reports interruption", async () => {
    const state: GameState = {
      ...baseState,
      races: {
        "race-1": {
          id: "race-1",
          name: "Player Race",
          day: 3,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [{ horseId: "horse-1", ownership: makePlayerOwned(), npc: false }],
          resolved: false,
        } as never,
      },
      horses: {
        "horse-1": {
          ...createTestHorse({ id: "horse-1", name: "Test", ownership: makePlayerOwned() }),
          age: 3,
        },
      },
    };

    const client = makeClient();
    const result = await client.submit({ days: 5, headless: false, state });
    expect(result.status).toBe("interrupted");
    if (result.status === "interrupted") {
      expect(result.raceId).toBe("race-1");
      expect(result.daysAdvanced).toBe(1); // day 2 advanced, stopped at race day 3
      expect(result.state.day).toBe(2);
    }
  });

  it("headless=true ignores player races and advances all days", async () => {
    const state: GameState = {
      ...baseState,
      races: {
        "race-1": {
          id: "race-1",
          name: "Player Race",
          day: 3,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [{ horseId: "horse-1", ownership: makePlayerOwned(), npc: false }],
          resolved: false,
        } as never,
      },
      horses: {
        "horse-1": {
          ...createTestHorse({ id: "horse-1", name: "Test", ownership: makePlayerOwned() }),
          age: 3,
        },
      },
    };

    const client = makeClient();
    const result = await client.submit({ days: 5, headless: true, state });
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.daysAdvanced).toBe(5);
      expect(result.state.day).toBe(6);
    }
  });

  it("serializes sequential commands on one client with ordered revisions", async () => {
    const client = makeClient();
    const r1 = client.submit({ days: 3, headless: true, state: baseState });
    const r2 = client.submit({ days: 2, headless: true, state: baseState });
    const [res1, res2] = await Promise.all([r1, r2]);
    expect(res1.status).toBe("completed");
    expect(res2.status).toBe("completed");
    if (res1.status === "completed" && res2.status === "completed") {
      expect(res2.revision).toBeGreaterThan(res1.revision);
    }
  });
});
