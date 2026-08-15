import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = join(__dirname, "..", "..", "..", "..", "..");
const marketPath = join(PROJECT_ROOT, "src", "core", "time", "phases", "market.ts");
const marketText = readFileSync(marketPath, "utf-8");

const npcCyclePath = join(PROJECT_ROOT, "src", "core", "time", "phases", "npcCycle.ts");
const npcCycleText = readFileSync(npcCyclePath, "utf-8");

describe("Cross-Phase Data Flow (economicTrend consumption)", () => {
  it("market phase reads context.economicTrend", () => {
    expect(marketText).toContain("economicTrend");
  });

  it("npcCycle phase reads context.economicTrend or context.worldAssessment", () => {
    // npcCycle should use cross-phase data for NPC decision-making
    expect(npcCycleText).toMatch(/economicTrend|worldAssessment/);
  });
});
