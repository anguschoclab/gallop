import { describe, it, expect } from "vitest";
import {
  compileSchedule,
  describePhase,
  phaseIsDue,
  ScheduleError,
  type PhaseDescriptor,
} from "@/core/time/scheduler";
import { createPhase, type PipelineContext } from "@/core/time/pipeline";
import { makePipelineContext } from "@/tests/helpers/sampleGameState";

function fakePhase(name: string, order: number) {
  return createPhase(name, order, (ctx) => ctx);
}

function descriptor(name: string, order: number, meta: Partial<PhaseDescriptor> = {}) {
  return describePhase(fakePhase(name, order), {
    label: name,
    cadence: "daily",
    ...meta,
  });
}

describe("compileSchedule", () => {
  it("orders phases deterministically by order", () => {
    const s = compileSchedule([descriptor("b", 20), descriptor("a", 10), descriptor("c", 30)]);
    expect(s.phases.map((d) => d.id)).toEqual(["a", "b", "c"]);
  });

  it("honors dependsOn edges over order", () => {
    const s = compileSchedule([
      descriptor("late", 50, { dependsOn: ["early"] }),
      descriptor("early", 10),
    ]);
    expect(s.phases.map((d) => d.id)).toEqual(["early", "late"]);
  });

  it("throws on duplicate ids", () => {
    expect(() => compileSchedule([descriptor("a", 1), descriptor("a", 2)])).toThrow(ScheduleError);
  });

  it("throws on missing dependency", () => {
    expect(() => compileSchedule([descriptor("a", 1, { dependsOn: ["ghost"] })])).toThrow(
      /missing phase 'ghost'/,
    );
  });

  it("throws on dependency cycles", () => {
    expect(() =>
      compileSchedule([
        descriptor("a", 1, { dependsOn: ["b"] }),
        descriptor("b", 2, { dependsOn: ["a"] }),
      ]),
    ).toThrow(/cycle/);
  });

  it("throws when a required product has no producer", () => {
    expect(() => compileSchedule([descriptor("a", 1, { requires: ["assessment"] })])).toThrow(
      /no phase provides/,
    );
  });

  it("throws on duplicate product producers", () => {
    expect(() =>
      compileSchedule([
        descriptor("a", 1, { provides: ["x"] }),
        descriptor("b", 2, { provides: ["x"] }),
      ]),
    ).toThrow(/produced by both/);
  });

  it("throws when two phases write the same slice with no ordering", () => {
    expect(() =>
      compileSchedule([
        descriptor("a", 5, { writes: ["horses"] }),
        descriptor("b", 5, { writes: ["horses"] }),
      ]),
    ).toThrow(/both write/);
  });

  it("allows shared writers when ordered by order field", () => {
    const s = compileSchedule([
      descriptor("a", 5, { writes: ["horses"] }),
      descriptor("b", 6, { writes: ["horses"] }),
    ]);
    expect(s.phases).toHaveLength(2);
  });

  it("throws on interval cadence without intervalDays", () => {
    expect(() => compileSchedule([descriptor("a", 1, { cadence: "interval" })])).toThrow(
      /intervalDays/,
    );
  });

  it("throws on parallel descriptor missing reducer contract", () => {
    expect(() =>
      compileSchedule([
        descriptor("a", 1, { parallel: { kind: "pure", mergeKey: "", seedNamespace: "" } }),
      ]),
    ).toThrow(/parallel/);
  });
});

describe("phaseIsDue", () => {
  const ctx = makePipelineContext({ newDay: 7 }) as PipelineContext;

  it("daily phases always run", () => {
    expect(phaseIsDue(descriptor("a", 1, { cadence: "daily" }), ctx)).toBe(true);
  });

  it("weekly phases run on boundary", () => {
    expect(phaseIsDue(descriptor("a", 1, { cadence: "weekly" }), ctx)).toBe(true);
    const ctx8 = {
      ...ctx,
      newDay: 8,
      state: { ...ctx.state, lastRun: 7 },
    } as PipelineContext;
    expect(
      phaseIsDue(descriptor("a", 1, { cadence: "weekly", lastRunField: "lastRun" }), ctx8),
    ).toBe(false);
  });
});
