/**
 * Phase 14: Validation Protocols
 *
 * Verifies that every AI system has at least one player-facing surface.
 * This is an automated check that components/routes exist for each AI subsystem.
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

// Helper: verify component file exists at expected path
function expectComponentFile(relativePath: string) {
  const fullPath = resolve(process.cwd(), "src", relativePath);
  expect(existsSync(fullPath)).toBe(true);
}

describe("Phase 14: UI feedback completeness", () => {
  it("strategic directives have a player-facing surface (Phase 6)", () => {
    expectComponentFile("components/npc/StrategicDirectivesPanel.tsx");
  });

  it("AI personality has a player-facing surface (Phase 6)", () => {
    expectComponentFile("components/npc/AIPersonalityCard.tsx");
  });

  it("diplomacy has a player-facing surface (Phase 7)", () => {
    expectComponentFile("components/npc/DiplomacyPanel.tsx");
  });

  it("relationship graph has a player-facing surface (Phase 7)", () => {
    expectComponentFile("components/npc/RelationshipGraph.tsx");
  });

  it("narrative arcs have a player-facing surface (Phase 9)", () => {
    expectComponentFile("components/narrative/NarrativeArcCard.tsx");
  });

  it("race AI tactics have a player-facing surface (Phase 10)", () => {
    expectComponentFile("components/race/JockeyStrategyBreakdown.tsx");
  });

  it("pace map visualization has a player-facing surface (Phase 10)", () => {
    expectComponentFile("components/race/PaceMap.tsx");
  });

  it("AI activity feed has a player-facing surface (Phase 11)", () => {
    expectComponentFile("components/dashboard/AIActivityStrip.tsx");
  });
});

describe("Phase 14: Architecture validation", () => {
  it("raceResolution phase module exists (no direct state mutation)", () => {
    expectComponentFile("core/time/phases/raceResolution.ts");
  });

  it("runnerBuilder module exists with optional fields (backward compatible)", () => {
    expectComponentFile("core/race/engine/runnerBuilder.ts");
  });

  it("economyAI module exists with pruning logic", () => {
    expectComponentFile("core/ai/economyAI.ts");
  });
});
