import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  scanIntentCoverage,
  scanDormantAiFunctions,
  scanFacilityTypeParity,
  runOrphanAudit,
} from "../../../scripts/orphan-audit";

const PROJECT_ROOT = join(__dirname, "..", "..", "..");
const SRC_ROOT = join(PROJECT_ROOT, "src");

describe("orphan-audit script", () => {
  it("exports analysis functions", () => {
    expect(typeof scanIntentCoverage).toBe("function");
    expect(typeof scanDormantAiFunctions).toBe("function");
    expect(typeof scanFacilityTypeParity).toBe("function");
    expect(typeof runOrphanAudit).toBe("function");
  });

  it("identifies intent coverage across player, npc, and handlers", () => {
    const coverage = scanIntentCoverage(SRC_ROOT);
    expect(coverage).toBeDefined();
    expect(Array.isArray(coverage.allIntents)).toBe(true);
    expect(coverage.allIntents.length).toBeGreaterThanOrEqual(45);
    expect(coverage.npcGenerated).toBeDefined();
    expect(coverage.playerGenerated).toBeDefined();
    expect(coverage.handled).toBeDefined();
  });

  it("checks dormant AI functions and reports status", () => {
    const dormant = scanDormantAiFunctions(SRC_ROOT);
    expect(dormant).toBeDefined();
    expect(Array.isArray(dormant.checkedFunctions)).toBe(true);
    expect(dormant.checkedFunctions).toContain("shouldWithdrawForTrackCondition");
  });

  it("audits facility types vs outpost footprints parity", () => {
    const parity = scanFacilityTypeParity(SRC_ROOT);
    expect(parity).toBeDefined();
    expect(parity.outpostFootprints).toContain("jockey_academy");
    expect(parity.outpostFootprints).toContain("museum");
  });

  it("runs the full audit and produces a structured result", () => {
    const result = runOrphanAudit(PROJECT_ROOT);
    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(typeof result.summary.totalIntents).toBe("number");
  });
});
