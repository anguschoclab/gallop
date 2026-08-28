import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CashPressureTuningEditor } from "@/components/debug/CashPressureTuningEditor";
import {
  getCashPressureTuning,
  setCashPressureTuningOverrides,
  resetCashPressureTuningOverrides,
  getCashPressureTuningFileConfig,
} from "@/core/stable/cashPressureTuning";

describe("CashPressureTuningEditor", () => {
  afterEach(() => resetCashPressureTuningOverrides());

  it("renders all numeric field labels", () => {
    render(<CashPressureTuningEditor />);
    expect(screen.getByText("comfortDays")).toBeTruthy();
    expect(screen.getByText("crisisDays")).toBeTruthy();
    expect(screen.getByText("maxThresholdDiscount")).toBeTruthy();
    expect(screen.getByText("pressureCurveExponent")).toBeTruthy();
    expect(screen.getByText("softeningCurveExponent")).toBeTruthy();
  });

  it("renders label threshold fields", () => {
    render(<CashPressureTuningEditor />);
    expect(screen.getByText("desperate")).toBeTruthy();
    expect(screen.getByText("strained")).toBeTruthy();
    expect(screen.getByText("tight")).toBeTruthy();
  });

  it("renders the decision trace checkbox", () => {
    render(<CashPressureTuningEditor />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeTruthy();
  });

  it("Apply button sets runtime overrides", () => {
    render(<CashPressureTuningEditor />);
    const applyButton = screen.getByText("Apply");
    fireEvent.click(applyButton);
    // After apply, the effective values should match the file config (no changes made)
    const effective = getCashPressureTuning();
    const file = getCashPressureTuningFileConfig();
    expect(effective.comfortDays).toBe(file.comfortDays);
    expect(effective.crisisDays).toBe(file.crisisDays);
  });

  it("Reset button clears runtime overrides", () => {
    setCashPressureTuningOverrides({ comfortDays: 999 });
    expect(getCashPressureTuning().comfortDays).toBe(999);

    render(<CashPressureTuningEditor />);
    const resetButton = screen.getByText("Reset");
    fireEvent.click(resetButton);
    expect(getCashPressureTuning().comfortDays).toBe(getCashPressureTuningFileConfig().comfortDays);
  });

  it("shows effective values section", () => {
    render(<CashPressureTuningEditor />);
    expect(screen.getByText(/comfortDays:/)).toBeTruthy();
    expect(screen.getByText(/crisisDays:/)).toBeTruthy();
    expect(screen.getByText(/maxDiscount:/)).toBeTruthy();
  });

  it("shows in-memory warning", () => {
    render(<CashPressureTuningEditor />);
    expect(screen.getByText(/In-memory only/)).toBeTruthy();
  });
});
