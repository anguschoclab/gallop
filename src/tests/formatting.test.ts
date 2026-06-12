/**
 * formatting.test.ts - Pure string formatting utilities tests
 *
 * Tests for formatCurrency and formatTime functions.
 */

import { describe, it, expect } from "vitest";
import { formatCurrency, formatTime } from "@/core/common/formatting";

describe("formatCurrency", () => {
  it("should format zero as $0", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("should format positive integer with comma separators", () => {
    expect(formatCurrency(1000)).toBe("$1,000");
  });

  it("should format large numbers with multiple comma separators", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000");
  });

  it("should format small positive numbers", () => {
    expect(formatCurrency(1)).toBe("$1");
  });

  it("should format negative numbers", () => {
    expect(formatCurrency(-100)).toBe("-$100");
  });

  it("should round decimal values to whole dollars", () => {
    expect(formatCurrency(1234.56)).toBe("$1,235");
  });

  it("should round down decimal values", () => {
    expect(formatCurrency(1234.49)).toBe("$1,234");
  });
});

describe("formatTime", () => {
  it("should format time with 2 decimal places by default", () => {
    expect(formatTime(92.412)).toBe("92.41s");
  });

  it("should format time with 1 decimal place when specified", () => {
    expect(formatTime(92.412, 1)).toBe("92.4s");
  });

  it("should format whole number time with 2 decimals", () => {
    expect(formatTime(100)).toBe("100.00s");
  });

  it("should format whole number time with 1 decimal", () => {
    expect(formatTime(100, 1)).toBe("100.0s");
  });

  it("should format small time values", () => {
    expect(formatTime(9.87)).toBe("9.87s");
  });

  it("should format large time values", () => {
    expect(formatTime(123.456)).toBe("123.46s");
  });

  it("should round properly for 2 decimal places", () => {
    expect(formatTime(92.415)).toBe("92.42s");
  });

  it("should round properly for 1 decimal place", () => {
    expect(formatTime(92.45, 1)).toBe("92.5s");
  });

  it("should handle zero time", () => {
    expect(formatTime(0)).toBe("0.00s");
  });
});
