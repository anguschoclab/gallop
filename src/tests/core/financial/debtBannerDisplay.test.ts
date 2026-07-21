import { describe, it, expect } from "vitest";
import {
  computeDebtBannerDisplay,
  computeDailyInterest,
  SOLVENCY_THRESHOLDS,
} from "@/core/financial/solvency";

describe("computeDebtBannerDisplay", () => {
  it("returns null when cash >= 0", () => {
    expect(
      computeDebtBannerDisplay({ cash: 0, consecutiveDaysInDebt: 0, imminentWarningDays: 2 }),
    ).toBeNull();
    expect(
      computeDebtBannerDisplay({ cash: 5000, consecutiveDaysInDebt: 0, imminentWarningDays: 2 }),
    ).toBeNull();
  });

  it("returns null on recovery (cash positive after debt)", () => {
    expect(
      computeDebtBannerDisplay({ cash: 500, consecutiveDaysInDebt: 0, imminentWarningDays: 2 }),
    ).toBeNull();
  });

  it("returns warning tier with correct label when cash is negative but above forced threshold", () => {
    const result = computeDebtBannerDisplay({
      cash: -500,
      consecutiveDaysInDebt: 1,
      imminentWarningDays: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("warning");
    expect(result!.label).toBe("Cash reserves depleted");
    expect(result!.approachingSale).toBe(false);
    expect(result!.belowForcedThreshold).toBe(false);
    expect(result!.showGraceBadge).toBe(false);
    expect(result!.daysUntilForcedSale).toBe(6);
    expect(result!.interestToday).toBe(computeDailyInterest(-500));
    expect(result!.nextAction).toContain("Interest continues");
  });

  it("returns warning below threshold, far from imminent", () => {
    const result = computeDebtBannerDisplay({
      cash: -26_000,
      consecutiveDaysInDebt: 2,
      imminentWarningDays: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.approachingSale).toBe(false);
    expect(result!.belowForcedThreshold).toBe(true);
    expect(result!.showGraceBadge).toBe(true);
    expect(result!.daysUntilForcedSale).toBe(5);
    expect(result!.nextAction).toContain("Forced sale in 5 days");
  });

  it("returns approachingSale=true at exactly the imminent day (default 2)", () => {
    const result = computeDebtBannerDisplay({
      cash: -26_000,
      consecutiveDaysInDebt: 5,
      imminentWarningDays: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.approachingSale).toBe(true);
    expect(result!.label).toBe("Forced sale imminent");
    expect(result!.tone).toContain("red");
    expect(result!.icon).toContain("red");
  });

  it("approachingSale=true with custom threshold=3", () => {
    const result = computeDebtBannerDisplay({
      cash: -26_000,
      consecutiveDaysInDebt: 4,
      imminentWarningDays: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.approachingSale).toBe(true);
    expect(result!.daysUntilForcedSale).toBe(3);
  });

  it("approachingSale=false when daysUntilForcedSale exceeds custom threshold=4", () => {
    const result = computeDebtBannerDisplay({
      cash: -26_000,
      consecutiveDaysInDebt: 2,
      imminentWarningDays: 4,
    });
    expect(result).not.toBeNull();
    expect(result!.approachingSale).toBe(false);
    expect(result!.daysUntilForcedSale).toBe(5);
  });

  it("returns forced_sale tier with correct label and nextAction", () => {
    const result = computeDebtBannerDisplay({
      cash: -26_000,
      consecutiveDaysInDebt: 7,
      imminentWarningDays: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("forced_sale");
    expect(result!.label).toBe("Creditors are moving in");
    expect(result!.tone).toContain("red-600");
    expect(result!.approachingSale).toBe(false);
    expect(result!.nextAction).toBe("Creditors seize your top horse (70% of value)");
  });

  it("returns insolvent tier with correct label and nextAction", () => {
    const result = computeDebtBannerDisplay({
      cash: -100_001,
      consecutiveDaysInDebt: 0,
      imminentWarningDays: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("insolvent");
    expect(result!.label).toBe("Insolvent");
    expect(result!.nextAction).toBe("Run ends — legacy epilogue");
  });

  it("reports cashToRecover as the absolute deficit", () => {
    const result = computeDebtBannerDisplay({
      cash: -12_345,
      consecutiveDaysInDebt: 1,
      imminentWarningDays: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.cashToRecover).toBe(12_345);
  });

  it("interestToday matches computeDailyInterest", () => {
    const cash = -30_000;
    const result = computeDebtBannerDisplay({
      cash,
      consecutiveDaysInDebt: 3,
      imminentWarningDays: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.interestToday).toBe(computeDailyInterest(cash));
  });

  it("clamps daysUntilForcedSale to 0", () => {
    const result = computeDebtBannerDisplay({
      cash: -26_000,
      consecutiveDaysInDebt: 10,
      imminentWarningDays: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.daysUntilForcedSale).toBe(0);
  });

  it("showGraceBadge is false for forced_sale and insolvent tiers", () => {
    const forced = computeDebtBannerDisplay({
      cash: -26_000,
      consecutiveDaysInDebt: 7,
      imminentWarningDays: 2,
    });
    expect(forced!.showGraceBadge).toBe(false);

    const insolvent = computeDebtBannerDisplay({
      cash: -100_001,
      consecutiveDaysInDebt: 0,
      imminentWarningDays: 2,
    });
    expect(insolvent!.showGraceBadge).toBe(false);
  });
});
