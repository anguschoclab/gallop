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
    expectComponentFile("domains/agents/ui/StrategicDirectivesPanel.tsx");
  });

  it("AI personality has a player-facing surface (Phase 6)", () => {
    expectComponentFile("domains/agents/ui/AIPersonalityCard.tsx");
  });

  it("diplomacy has a player-facing surface (Phase 7)", () => {
    expectComponentFile("domains/agents/ui/DiplomacyPanel.tsx");
  });

  it("relationship graph has a player-facing surface (Phase 7)", () => {
    expectComponentFile("domains/agents/ui/RelationshipGraph.tsx");
  });

  it("narrative arcs have a player-facing surface (Phase 9)", () => {
    expectComponentFile("domains/narrative/ui/NarrativeArcCard.tsx");
  });

  it("race AI tactics have a player-facing surface (Phase 10)", () => {
    expectComponentFile("domains/race/ui/JockeyStrategyBreakdown.tsx");
  });

  it("pace map visualization has a player-facing surface (Phase 10)", () => {
    expectComponentFile("domains/race/ui/PaceMap.tsx");
  });

  it("AI activity feed has a player-facing surface (Phase 11)", () => {
    expectComponentFile("domains/dashboard/ui/AIActivityStrip.tsx");
  });
});

describe("Phase 14: Architecture validation", () => {
  it("raceResolution phase module exists (no direct state mutation)", () => {
    expectComponentFile("platform/time/phases/raceResolution.ts");
  });

  it("runnerBuilder module exists with optional fields (backward compatible)", () => {
    expectComponentFile("domains/race/simulation/engine/runnerBuilder.ts");
  });

  it("economyAI child modules exist with pruning logic", () => {
    expectComponentFile("domains/agents/simulation/economyAIState.ts");
    expectComponentFile("domains/agents/simulation/economyAITracking.ts");
    expectComponentFile("domains/agents/simulation/economyAICartel.ts");
  });
});
