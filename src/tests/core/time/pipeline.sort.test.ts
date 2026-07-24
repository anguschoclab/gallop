import { describe, it, expect, vi } from "vitest";
import { executePipeline, type PipelineContext, type PipelinePhase } from "@/core/time/pipeline";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
import { makePipelineContext } from "@/tests/helpers/sampleGameState";

describe("Pipeline sort optimizations", () => {
  it("T1: GAME_PIPELINE_PHASES is sorted by order after module load", () => {
    for (let i = 0; i < GAME_PIPELINE_PHASES.length - 1; i++) {
      expect(GAME_PIPELINE_PHASES[i].order).toBeLessThan(GAME_PIPELINE_PHASES[i + 1].order);
    }
  });

  it("T2: executePipeline does not re-sort if input is already sorted", () => {
    const ctx = makePipelineContext() as PipelineContext;
    const sortedPhases = [...GAME_PIPELINE_PHASES];
    const sortSpy = vi.spyOn(sortedPhases, "sort");

    executePipeline(sortedPhases, ctx);

    expect(sortSpy).not.toHaveBeenCalled();

    sortSpy.mockRestore();
  });

  it("T3: executePipeline with unsorted input still executes in order", () => {
    const ctx = makePipelineContext() as PipelineContext;
    const executionOrder: string[] = [];

    const phases: PipelinePhase[] = GAME_PIPELINE_PHASES.map((p) => ({
      name: p.name,
      order: p.order,
      execute: (c: PipelineContext) => {
        executionOrder.push(p.name);
        return c;
      },
    }));

    // Reverse the array to ensure it's unsorted
    const reversed = [...phases].reverse();

    executePipeline(reversed, ctx);

    // Verify execution happened in sorted order (matching GAME_PIPELINE_PHASES order)
    const expectedOrder = GAME_PIPELINE_PHASES.map((p) => p.name);
    expect(executionOrder).toEqual(expectedOrder);
  });

  it("T4: Phases at same order execute in array order (stable sort guarantee)", () => {
    const ctx = makePipelineContext() as PipelineContext;
    const executionOrder: string[] = [];

    const sameOrderPhases: PipelinePhase[] = [
      {
        name: "first",
        order: 50,
        execute: (c) => {
          executionOrder.push("first");
          return c;
        },
      },
      {
        name: "second",
        order: 50,
        execute: (c) => {
          executionOrder.push("second");
          return c;
        },
      },
      {
        name: "third",
        order: 50,
        execute: (c) => {
          executionOrder.push("third");
          return c;
        },
      },
    ];

    executePipeline(sameOrderPhases, ctx);

    expect(executionOrder).toEqual(["first", "second", "third"]);
  });
});
