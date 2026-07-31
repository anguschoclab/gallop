/**
 * Integration tests for pipeline phase ordering
 * Verifies that new AI phases (worldAssessment, diplomacy, narrative, economy)
 * execute in the correct order relative to existing phases.
 */

import { describe, it, expect } from "vitest";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases/index";

describe("Pipeline Phase Order: AI phases in correct positions", () => {
  function getOrder(name: string): number {
    const phase = GAME_PIPELINE_PHASES.find((p) => p.name === name);
    if (!phase) throw new Error(`Phase '${name}' not found in pipeline`);
    return phase.order;
  }

  it("worldAssessment phase exists and runs before intentCollection", () => {
    const wa = getOrder("worldAssessment");
    const ic = getOrder("intentCollection");
    expect(wa).toBeLessThan(ic);
  });

  it("economyPhase exists and runs before market", () => {
    const econ = getOrder("economy");
    const market = getOrder("market");
    expect(econ).toBeLessThan(market);
  });

  it("diplomacyPhase exists and runs after npcCycle", () => {
    const dip = getOrder("diplomacy");
    const cycle = getOrder("npcCycle");
    expect(dip).toBeGreaterThan(cycle);
  });

  it("narrativePhase exists and runs after seasonStandings", () => {
    const narrative = getOrder("narrative");
    const standings = getOrder("seasonStandings");
    expect(narrative).toBeGreaterThan(standings);
  });

  it("narrativePhase runs before impactApplication", () => {
    const narrative = getOrder("narrative");
    const impact = getOrder("impactApplication");
    expect(narrative).toBeLessThan(impact);
  });

  it("diplomacyPhase runs before scheduler", () => {
    const dip = getOrder("diplomacy");
    const scheduler = getOrder("scheduler");
    expect(dip).toBeLessThan(scheduler);
  });

  it("all phases are sorted by order in GAME_PIPELINE_PHASES", () => {
    for (let i = 1; i < GAME_PIPELINE_PHASES.length; i++) {
      expect(GAME_PIPELINE_PHASES[i].order).toBeGreaterThanOrEqual(
        GAME_PIPELINE_PHASES[i - 1].order,
      );
    }
  });

  it("all new AI phases are present in the pipeline", () => {
    const names = GAME_PIPELINE_PHASES.map((p) => p.name);
    expect(names).toContain("worldAssessment");
    expect(names).toContain("economy");
    expect(names).toContain("diplomacy");
    expect(names).toContain("narrative");
  });

  it("worldAssessment runs before privateSaleExpiry", () => {
    const wa = getOrder("worldAssessment");
    const pse = getOrder("privateSaleExpiry");
    expect(wa).toBeLessThan(pse);
  });

  it("economyPhase runs after npcBreeding", () => {
    const econ = getOrder("economy");
    const breeding = getOrder("npcBreeding");
    expect(econ).toBeGreaterThan(breeding);
  });
});
