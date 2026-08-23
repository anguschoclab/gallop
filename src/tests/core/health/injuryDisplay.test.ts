import { describe, it, expect } from "vitest";
import { formatRecoveryDays } from "@/core/health/injuryDisplay";
import type { InjurySeverity } from "@/core/health/healthSystem";

describe("formatRecoveryDays", () => {
  it("returns 'Career-ending' for severity 'career-ending'", () => {
    expect(formatRecoveryDays(999, "career-ending")).toBe("Career-ending");
  });

  it("returns 'Career-ending' for severity 'career-ending' even with non-999 recoveryDays", () => {
    expect(formatRecoveryDays(500, "career-ending")).toBe("Career-ending");
  });

  it("returns 'Career-ending' when recoveryDays >= INJURY_RECOVERY_CAREER_ENDING regardless of severity", () => {
    expect(formatRecoveryDays(999, "major")).toBe("Career-ending");
    expect(formatRecoveryDays(1000, "moderate")).toBe("Career-ending");
  });

  it("returns '{N} days' for minor injuries", () => {
    expect(formatRecoveryDays(7, "minor")).toBe("7 days");
  });

  it("returns '{N} days' for moderate injuries", () => {
    expect(formatRecoveryDays(21, "moderate")).toBe("21 days");
  });

  it("returns '{N} days' for major injuries with recoveryDays < 999", () => {
    expect(formatRecoveryDays(120, "major")).toBe("120 days");
  });

  it("handles edge case: recoveryDays = 0", () => {
    expect(formatRecoveryDays(0, "minor")).toBe("0 days");
  });

  it("handles all valid InjurySeverity values without crashing", () => {
    const severities: InjurySeverity[] = ["minor", "moderate", "major", "career-ending"];
    for (const sev of severities) {
      expect(() => formatRecoveryDays(10, sev)).not.toThrow();
    }
  });
});
