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
  it("identifies complete intent coverage across producers and handlers", () => {
    const coverage = scanIntentCoverage(SRC_ROOT);
    expect(coverage.allIntents.length).toBeGreaterThan(0);
    expect(new Set(coverage.allIntents).size).toBe(coverage.allIntents.length);
    expect(coverage.handled).toEqual(coverage.allIntents);
  });

  it("requires every tracked dormant-AI probe to have a production caller", () => {
    const dormant = scanDormantAiFunctions(SRC_ROOT);
    expect(dormant.checkedFunctions).toContain("shouldWithdrawForTrackCondition");
    for (const fn of dormant.checkedFunctions) {
      expect(dormant.callers[fn]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("requires every facility type to have an outpost footprint", () => {
    const parity = scanFacilityTypeParity(SRC_ROOT);
    expect(parity.facilityTypes).toContain("jockey_academy");
    expect(parity.facilityTypes).toContain("museum");
    expect(parity.missingFootprints).toEqual([]);
  });

  it("runs the full capability audit without dangling contracts", () => {
    const result = runOrphanAudit(PROJECT_ROOT);
    expect(result.intents.unhandled).toEqual([]);
    expect(result.intents.unproduced).toEqual([]);
    expect(result.impacts.unhandled).toEqual([]);
    expect(result.phases.undescribed).toEqual([]);
    expect(result.phases.unregisteredDescriptors).toEqual([]);
  });
});
