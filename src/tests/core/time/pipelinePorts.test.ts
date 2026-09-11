/**
 * Tests for pipeline port injection.
 *
 * Verifies that PipelineContext accepts an optional `ports` field and
 * that phases use injected ports when available, falling back to
 * direct core imports when ports are not provided.
 *
 * These tests assert the port injection mechanism works correctly
 * for testability and decoupling.
 */

import { describe, it, expect, vi } from "vitest";
import type { PipelineContext } from "@/core/time/pipeline";
import type { RaceResolutionPorts, NarrativePorts } from "@/core/time/pipelinePorts";

describe("PipelineContext ports field", () => {
  it("accepts an optional ports field", () => {
    const ctx: PipelineContext = {
      previousDay: 0,
      newDay: 1,
      state: {} as never,
      logs: [],
      dailyRng: { next: () => 0 } as never,
      intents: [],
      impacts: [],
      impactLog: [],
      horseMap: new Map(),
      raceMap: new Map(),
      stableMap: new Map(),
      jockeyMap: new Map(),
      ports: {
        raceResolution: {
          simulate: vi.fn(),
          generateImpacts: vi.fn(),
          resolveClaiming: vi.fn(),
          recordRaceHistory: vi.fn(),
          checkHallOfFame: vi.fn(),
          checkTrackRecords: vi.fn(),
        },
      },
    };
    expect(ctx.ports).toBeDefined();
    expect(ctx.ports?.raceResolution).toBeDefined();
  });

  it("works without ports (backward compatible)", () => {
    const ctx: PipelineContext = {
      previousDay: 0,
      newDay: 1,
      state: {} as never,
      logs: [],
      dailyRng: { next: () => 0 } as never,
      intents: [],
      impacts: [],
      impactLog: [],
      horseMap: new Map(),
      raceMap: new Map(),
      stableMap: new Map(),
      jockeyMap: new Map(),
    };
    expect(ctx.ports).toBeUndefined();
  });
});

describe("RaceResolutionPorts", () => {
  it("defines all 6 required port methods", () => {
    const ports: RaceResolutionPorts = {
      simulate: vi.fn(),
      generateImpacts: vi.fn(),
      resolveClaiming: vi.fn(),
      recordRaceHistory: vi.fn(),
      checkHallOfFame: vi.fn(),
      checkTrackRecords: vi.fn(),
    };
    expect(ports.simulate).toBeTypeOf("function");
    expect(ports.generateImpacts).toBeTypeOf("function");
    expect(ports.resolveClaiming).toBeTypeOf("function");
    expect(ports.recordRaceHistory).toBeTypeOf("function");
    expect(ports.checkHallOfFame).toBeTypeOf("function");
    expect(ports.checkTrackRecords).toBeTypeOf("function");
  });
});

describe("NarrativePorts", () => {
  it("defines both required port methods", () => {
    const ports: NarrativePorts = {
      generateFlavor: vi.fn(),
      generateWeeklyFlavor: vi.fn(),
    };
    expect(ports.generateFlavor).toBeTypeOf("function");
    expect(ports.generateWeeklyFlavor).toBeTypeOf("function");
  });
});

describe("port resolution helper", () => {
  it("returns injected race port when available", async () => {
    const { resolveRacePort } = await import("@/core/time/pipelinePorts");
    const fakeFn = vi.fn();
    const port = resolveRacePort({ raceResolution: { simulate: fakeFn } } as never, "simulate");
    expect(port).toBe(fakeFn);
  });

  it("falls back to default race implementation when port is not injected", async () => {
    const { resolveRacePort } = await import("@/core/time/pipelinePorts");
    const port = resolveRacePort(undefined, "simulate");
    expect(port).toBeTypeOf("function");
  });

  it("returns injected narrative port when available", async () => {
    const { resolveNarrativePort } = await import("@/core/time/pipelinePorts");
    const fakeFn = vi.fn();
    const port = resolveNarrativePort(
      { narrative: { generateFlavor: fakeFn } } as never,
      "generateFlavor",
    );
    expect(port).toBe(fakeFn);
  });

  it("falls back to default narrative implementation when port is not injected", async () => {
    const { resolveNarrativePort } = await import("@/core/time/pipelinePorts");
    const port = resolveNarrativePort(undefined, "generateFlavor");
    expect(port).toBeTypeOf("function");
  });
});
