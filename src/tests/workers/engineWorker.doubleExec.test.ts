import { describe, it, expect, vi } from "vitest";
import { executePipeline, type PipelineContext, type PipelinePhase } from "@/core/time/pipeline";
import { STAGE_PHASES } from "@/workers/pipelineStages";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
import { makePipelineContext } from "@/tests/helpers/sampleGameState";

function makeContext(): PipelineContext {
  return makePipelineContext({ newDay: 2 }) as PipelineContext;
}

function makeMockPhases(): { spies: Map<string, ReturnType<typeof vi.fn>>; mocks: PipelinePhase[] } {
  const spies = new Map<string, ReturnType<typeof vi.fn>>();
  const mocks = GAME_PIPELINE_PHASES.map((phase) => {
    const spy = vi.fn((ctx: PipelineContext) => ctx);
    spies.set(phase.name, spy);
    return { name: phase.name, order: phase.order, execute: spy };
  });
  return { spies, mocks };
}

function runAllStages(mocks: PipelinePhase[], ctx: PipelineContext): PipelineContext {
  let current = ctx;
  for (const stagePhases of STAGE_PHASES) {
    const stageMocks = mocks.filter((m) =>
      stagePhases.some((sp) => sp.name === m.name),
    );
    current = executePipeline(stageMocks, current);
  }
  return current;
}

describe("Worker double execution prevention", () => {
  it("T13: raceResolution phase executes exactly once per advanceDay", () => {
    const { spies, mocks } = makeMockPhases();
    runAllStages(mocks, makeContext());
    expect(spies.get("raceResolution")?.mock.calls.length).toBe(1);
  });

  it("T14: npcCycle phase executes exactly once per advanceDay", () => {
    const { spies, mocks } = makeMockPhases();
    runAllStages(mocks, makeContext());
    expect(spies.get("npcCycle")?.mock.calls.length).toBe(1);
  });

  it("T15: impactApplication phase executes exactly once per advanceDay", () => {
    const { spies, mocks } = makeMockPhases();
    runAllStages(mocks, makeContext());
    expect(spies.get("impactApplication")?.mock.calls.length).toBe(1);
  });

  it("T16: pregnancy phase executes exactly once per advanceDay", () => {
    const { spies, mocks } = makeMockPhases();
    runAllStages(mocks, makeContext());
    expect(spies.get("pregnancy")?.mock.calls.length).toBe(1);
  });

  it("T17: auctions phase executes exactly once per advanceDay", () => {
    const { spies, mocks } = makeMockPhases();
    runAllStages(mocks, makeContext());
    expect(spies.get("auctions")?.mock.calls.length).toBe(1);
  });

  it("T18: awards phase executes exactly once per advanceDay", () => {
    const { spies, mocks } = makeMockPhases();
    runAllStages(mocks, makeContext());
    expect(spies.get("awards")?.mock.calls.length).toBe(1);
  });

  it("T19: scheduler phase executes exactly once per advanceDay", () => {
    const { spies, mocks } = makeMockPhases();
    runAllStages(mocks, makeContext());
    expect(spies.get("scheduler")?.mock.calls.length).toBe(1);
  });

  it("T20: total phase execution count equals GAME_PIPELINE_PHASES.length per advanceDay", () => {
    const { spies, mocks } = makeMockPhases();
    runAllStages(mocks, makeContext());
    let totalCalls = 0;
    for (const spy of spies.values()) {
      totalCalls += spy.mock.calls.length;
    }
    expect(totalCalls).toBe(GAME_PIPELINE_PHASES.length);
  });
});
