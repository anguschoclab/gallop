import { describe, it, expect, afterEach } from "vitest";
import {
  getCashPressureTuning,
  setCashPressureTuningOverrides,
  resetCashPressureTuningOverrides,
  getCashPressureTuningFileConfig,
} from "@/core/stable/cashPressureTuning";

describe("cashPressureTuning", () => {
  afterEach(() => resetCashPressureTuningOverrides());

  it("file config loads with expected defaults", () => {
    const file = getCashPressureTuningFileConfig();
    expect(file.comfortDays).toBe(120);
    expect(file.crisisDays).toBe(20);
    expect(file.maxThresholdDiscount).toBe(0.25);
    expect(file.pressureCurveExponent).toBe(1.0);
    expect(file.softeningCurveExponent).toBe(1.0);
    expect(file.enableDecisionTrace).toBe(false);
    expect(file.labelThresholds).toEqual({ desperate: 0.75, strained: 0.5, tight: 0.25 });
  });

  it("getCashPressureTuning returns file config by default", () => {
    const t = getCashPressureTuning();
    expect(t).toEqual(getCashPressureTuningFileConfig());
  });

  it("runtime override replaces individual fields", () => {
    setCashPressureTuningOverrides({ comfortDays: 200, maxThresholdDiscount: 0.4 });
    const t = getCashPressureTuning();
    expect(t.comfortDays).toBe(200);
    expect(t.maxThresholdDiscount).toBe(0.4);
    // Untouched fields keep file defaults
    expect(t.crisisDays).toBe(20);
    expect(t.pressureCurveExponent).toBe(1.0);
  });

  it("runtime override merges labelThresholds partially", () => {
    setCashPressureTuningOverrides({ labelThresholds: { tight: 0.3 } });
    const t = getCashPressureTuning();
    expect(t.labelThresholds.tight).toBe(0.3);
    expect(t.labelThresholds.desperate).toBe(0.75);
    expect(t.labelThresholds.strained).toBe(0.5);
  });

  it("reset restores file config", () => {
    setCashPressureTuningOverrides({ comfortDays: 999 });
    expect(getCashPressureTuning().comfortDays).toBe(999);
    resetCashPressureTuningOverrides();
    expect(getCashPressureTuning().comfortDays).toBe(120);
  });

  it("enableDecisionTrace override toggles the flag", () => {
    expect(getCashPressureTuning().enableDecisionTrace).toBe(false);
    setCashPressureTuningOverrides({ enableDecisionTrace: true });
    expect(getCashPressureTuning().enableDecisionTrace).toBe(true);
    resetCashPressureTuningOverrides();
    expect(getCashPressureTuning().enableDecisionTrace).toBe(false);
  });
});
