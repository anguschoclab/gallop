/**
 * Tests for PipelineContext shared lookup maps (T1)
 *
 * Verifies that:
 * 1. Context maps match what each phase previously built locally
 * 2. executePipeline passes maps through to phases
 * 3. Maps work correctly with both array and record state shapes
 */

import { describe, it, expect, vi } from "vitest";
import { executePipeline, type PipelineContext, type PipelinePhase } from "@/core/time/pipeline";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import type { GameState } from "@/game/types";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("PipelineContext shared maps", () => {
  const horse1 = createTestHorse({ id: "h1", name: "Alpha" });
  const horse2 = createTestHorse({ id: "h2", name: "Beta" });
  const stable1 = { id: "s1", name: "Test Stable" } as any;
  const jockey1 = { id: "j1", name: "J Smith" } as any;
  const race1 = {
    id: "r1",
    name: "Test Race",
    day: 10,
    distance: 2000,
    raceClass: "Maiden",
    entryFee: 100,
    purse: 5000,
    minStat: 60,
    fieldSize: 8,
    entries: [],
    resolved: false,
  } as any;

  const makeState = (): GameState =>
    makeGameState({
      horses: h2r([horse1, horse2]),
      races: r2r([race1]),
      npcStables: [stable1],
      jockeys: [jockey1],
    }) as GameState;

  it("horseMap in context matches new Map(Object.values(state.horses).map(...))", () => {
    const state = makeState();
    const ctx = createMockPipelineContext({ state });
    expect(ctx.horseMap.get("h1")).toEqual(horse1);
    expect(ctx.horseMap.get("h2")).toEqual(horse2);
    expect(ctx.horseMap.size).toBe(2);
  });

  it("raceMap in context matches new Map(Object.values(state.races).map(...))", () => {
    const state = makeState();
    const ctx = createMockPipelineContext({ state });
    expect(ctx.raceMap.get("r1")).toEqual(race1);
    expect(ctx.raceMap.size).toBe(1);
  });

  it("stableMap in context matches new Map(state.npcStables.map(...))", () => {
    const state = makeState();
    const ctx = createMockPipelineContext({ state });
    expect(ctx.stableMap.get("s1")).toEqual(stable1);
    expect(ctx.stableMap.size).toBe(1);
  });

  it("jockeyMap in context matches new Map(state.jockeys.map(...))", () => {
    const state = makeState();
    const ctx = createMockPipelineContext({ state });
    expect(ctx.jockeyMap.get("j1")).toEqual(jockey1);
    expect(ctx.jockeyMap.size).toBe(1);
  });

  it("all 4 maps are present on the context object", () => {
    const state = makeState();
    const ctx = createMockPipelineContext({ state });
    expect(ctx.horseMap).toBeInstanceOf(Map);
    expect(ctx.raceMap).toBeInstanceOf(Map);
    expect(ctx.stableMap).toBeInstanceOf(Map);
    expect(ctx.jockeyMap).toBeInstanceOf(Map);
  });

  it("context horse from horseMap is the same object as in state.horses array", () => {
    const state = makeState();
    const ctx = createMockPipelineContext({ state });
    const fromMap = ctx.horseMap.get("h1");
    const fromArray = Object.values(state.horses).find((h: any) => h.id === "h1");
    expect(fromMap).toBe(fromArray);
  });

  it("executePipeline passes maps through to each phase", () => {
    const state = makeState();
    const receivedMaps: { horse: boolean; race: boolean; stable: boolean; jockey: boolean }[] = [];

    const spyPhase: PipelinePhase = {
      name: "spy",
      order: 1,
      execute: (ctx) => {
        receivedMaps.push({
          horse: ctx.horseMap instanceof Map,
          race: ctx.raceMap instanceof Map,
          stable: ctx.stableMap instanceof Map,
          jockey: ctx.jockeyMap instanceof Map,
        });
        return ctx;
      },
    };

    const ctx = createMockPipelineContext({ state });
    executePipeline([spyPhase], ctx);

    expect(receivedMaps).toHaveLength(1);
    expect(receivedMaps[0]).toEqual({ horse: true, race: true, stable: true, jockey: true });
  });

  it("a phase reading context.horseMap gets the same horse as state array", () => {
    const state = makeState();
    let capturedHorse: any = null;

    const readerPhase: PipelinePhase = {
      name: "reader",
      order: 1,
      execute: (ctx) => {
        capturedHorse = ctx.horseMap.get("h1");
        return ctx;
      },
    };

    const ctx = createMockPipelineContext({ state });
    executePipeline([readerPhase], ctx);

    expect(capturedHorse).toEqual(horse1);
  });

  it("empty state produces empty maps", () => {
    const state = makeGameState({ horses: {}, races: {}, npcStables: [], jockeys: [] }) as GameState;
    const ctx = createMockPipelineContext({ state });
    expect(ctx.horseMap.size).toBe(0);
    expect(ctx.raceMap.size).toBe(0);
    expect(ctx.stableMap.size).toBe(0);
    expect(ctx.jockeyMap.size).toBe(0);
  });
});
