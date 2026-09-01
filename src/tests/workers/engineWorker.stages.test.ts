import { describe, it, expect } from "vitest";
import { STAGE_RANGES, STAGE_PHASES } from "@/workers/pipelineStages";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";

describe("Worker pipeline stage boundaries", () => {
  it("T5: Stage 1 filters phases with order 1-14 (no overlap)", () => {
    const stage1 = STAGE_PHASES[0];
    expect(stage1.length).toBeGreaterThan(0);
    for (const phase of stage1) {
      expect(phase.order).toBeGreaterThanOrEqual(1);
      expect(phase.order).toBeLessThanOrEqual(14);
    }
  });

  it("T6: Stage 2 filters phases with order 15-48 (no overlap)", () => {
    const stage2 = STAGE_PHASES[1];
    expect(stage2.length).toBeGreaterThan(0);
    for (const phase of stage2) {
      expect(phase.order).toBeGreaterThanOrEqual(15);
      expect(phase.order).toBeLessThanOrEqual(48);
    }
  });

  it("T7: Stage 3 filters phases with order 50-95 (no overlap)", () => {
    const stage3 = STAGE_PHASES[2];
    expect(stage3.length).toBeGreaterThan(0);
    for (const phase of stage3) {
      expect(phase.order).toBeGreaterThanOrEqual(50);
      expect(phase.order).toBeLessThanOrEqual(95);
    }
  });

  it("T8: Stage 4 filters phases with order 100-165 (no overlap)", () => {
    const stage4 = STAGE_PHASES[3];
    expect(stage4.length).toBeGreaterThan(0);
    for (const phase of stage4) {
      expect(phase.order).toBeGreaterThanOrEqual(100);
      expect(phase.order).toBeLessThanOrEqual(165);
    }
  });

  it("T9: Stage 5 filters phases with order 190-201 (no overlap)", () => {
    const stage5 = STAGE_PHASES[4];
    expect(stage5.length).toBeGreaterThan(0);
    for (const phase of stage5) {
      expect(phase.order).toBeGreaterThanOrEqual(190);
      expect(phase.order).toBeLessThanOrEqual(201);
    }
  });

  it("T10: Union of all 5 stage arrays equals GAME_PIPELINE_PHASES (no missing phases)", () => {
    const allStagePhases = STAGE_PHASES.flat();
    expect(allStagePhases.length).toBe(GAME_PIPELINE_PHASES.length);

    const allPhaseNames = new Set(GAME_PIPELINE_PHASES.map((p) => p.name));
    const stagedNames = new Set(allStagePhases.map((p) => p.name));
    expect(stagedNames.size).toBe(allPhaseNames.size);
    for (const name of allPhaseNames) {
      expect(stagedNames.has(name)).toBe(true);
    }
  });

  it("T11: Intersection of any two stage arrays is empty (no overlap)", () => {
    for (let i = 0; i < STAGE_PHASES.length; i++) {
      for (let j = i + 1; j < STAGE_PHASES.length; j++) {
        const setI = new Set(STAGE_PHASES[i].map((p) => p.name));
        const setJ = new Set(STAGE_PHASES[j].map((p) => p.name));
        const intersection = [...setI].filter((name) => setJ.has(name));
        expect(intersection).toEqual([]);
      }
    }
  });

  it("T12: Each phase appears in exactly one stage array", () => {
    const allStagedPhases = STAGE_PHASES.flat();
    const nameCounts = new Map<string, number>();
    for (const phase of allStagedPhases) {
      nameCounts.set(phase.name, (nameCounts.get(phase.name) ?? 0) + 1);
    }
    for (const [name, count] of nameCounts) {
      expect(count).toBe(1);
    }
  });
});
