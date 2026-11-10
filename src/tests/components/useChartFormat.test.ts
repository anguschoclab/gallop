/**
 * useChartFormat.test.ts - Chart formatter tests
 *
 * Tests for the Intl-based number/currency/day/percent formatters
 * in @/shared/ui/charts/useChartFormat (plain functions despite the name).
 */

import { describe, it, expect } from "vitest";
import {
  formatCurrencyCompact,
  formatCurrencyFull,
  formatNumberCompact,
  formatDay,
  formatPct,
} from "@/shared/ui/charts/useChartFormat";

describe("formatCurrencyCompact", () => {
  it.each<[number, string]>([
    [0, "$0"],
    [999, "$999"],
    [1500, "$1.5K"],
    [-1500, "-$1.5K"],
    [1_000_000, "$1M"],
    [2_500_000, "$2.5M"],
  ])("formats %d as %s", (n, expected) => {
    expect(formatCurrencyCompact(n)).toBe(expected);
  });
});

describe("formatCurrencyFull", () => {
  it.each<[number, string]>([
    [0, "$0"],
    [1234, "$1,234"],
    [1234.56, "$1,235"],
    [-1500, "-$1,500"],
    [1_000_000, "$1,000,000"],
  ])("formats %d as %s", (n, expected) => {
    expect(formatCurrencyFull(n)).toBe(expected);
  });
});

describe("formatNumberCompact", () => {
  it.each<[number, string]>([
    [999, "999"],
    [1500, "1.5K"],
    [1_000_000, "1M"],
  ])("formats %d as %s", (n, expected) => {
    expect(formatNumberCompact(n)).toBe(expected);
  });
});

describe("formatDay", () => {
  it.each<[number, string]>([
    [1, "D1"],
    [365, "D365"],
  ])("formats %d as %s", (day, expected) => {
    expect(formatDay(day)).toBe(expected);
  });
});

describe("formatPct", () => {
  it.each<[number, number | undefined, string]>([
    [0.5, undefined, "50%"],
    [0.1234, undefined, "12%"],
    [0.1234, 1, "12.3%"],
    [1, undefined, "100%"],
    [0, undefined, "0%"],
  ])("formats %d with %j digits as %s", (n, digits, expected) => {
    expect(formatPct(n, digits)).toBe(expected);
  });
});
