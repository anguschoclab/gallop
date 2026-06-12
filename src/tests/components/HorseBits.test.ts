import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/core/common/formatting";

describe("formatCurrency", () => {
  it("formats zero as $0", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats positive numbers with USD currency", () => {
    expect(formatCurrency(1000)).toBe("$1,000");
    expect(formatCurrency(10000)).toBe("$10,000");
    expect(formatCurrency(100000)).toBe("$100,000");
  });

  it("formats large numbers correctly", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000");
    expect(formatCurrency(5000000)).toBe("$5,000,000");
  });

  it("handles decimal values by rounding to 0 decimal places", () => {
    expect(formatCurrency(1234.56)).toBe("$1,235");
    expect(formatCurrency(1234.49)).toBe("$1,234");
  });

  it("always uses USD currency format", () => {
    expect(formatCurrency(100)).toContain("$");
    expect(formatCurrency(100)).not.toContain("€");
    expect(formatCurrency(100)).not.toContain("£");
  });
});
