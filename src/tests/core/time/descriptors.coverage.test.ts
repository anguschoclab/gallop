import { describe, it, expect } from "vitest";
import { GAME_PIPELINE_PHASES } from "@/platform/time/phases";
import { GAME_PHASE_DESCRIPTORS, GAME_SCHEDULE } from "@/platform/time/phases/descriptors";

describe("production descriptor registry", () => {
  it("every registered phase has exactly one descriptor", () => {
    const phaseSet = new Set(GAME_PHASE_DESCRIPTORS.map((d) => d.phase));
    expect(GAME_PHASE_DESCRIPTORS.length).toBe(GAME_PIPELINE_PHASES.length);
    for (const p of GAME_PIPELINE_PHASES) {
      expect(phaseSet.has(p)).toBe(true);
    }
  });

  it("descriptor ids are unique and match phase names", () => {
    const ids = GAME_PHASE_DESCRIPTORS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("compiled schedule contains every phase exactly once", () => {
    const names = GAME_SCHEDULE.phases.map((d) => d.id);
    expect(new Set(names).size).toBe(GAME_PIPELINE_PHASES.length);
  });

  it("dependsOn edges are respected in compiled order", () => {
    const order = new Map(GAME_SCHEDULE.phases.map((d, i) => [d.id, i]));
    for (const d of GAME_PHASE_DESCRIPTORS) {
      for (const dep of d.dependsOn ?? []) {
        expect(order.get(dep)!).toBeLessThan(order.get(d.id)!);
      }
    }
  });

  it("requires edges run after their providers", () => {
    const order = new Map(GAME_SCHEDULE.phases.map((d, i) => [d.id, i]));
    const provider = new Map<string, string>();
    for (const d of GAME_PHASE_DESCRIPTORS) {
      for (const p of d.provides ?? []) provider.set(p, d.id);
    }
    for (const d of GAME_PHASE_DESCRIPTORS) {
      for (const req of d.requires ?? []) {
        expect(order.get(provider.get(req)!)!).toBeLessThan(order.get(d.id)!);
      }
    }
  });

  it("cadence-gated phases declare a lastRunField", () => {
    for (const d of GAME_PHASE_DESCRIPTORS) {
      if (d.cadence === "weekly" || d.cadence === "seasonal" || d.cadence === "yearly") {
        expect(d.lastRunField, `${d.id} missing lastRunField`).toBeTruthy();
      }
    }
  });
});
