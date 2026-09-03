/**
 * prestigeTypes.test.ts - Boundary tests for getPrestigeTier
 *
 * Written BEFORE the M2 table-driven refactor (Phase 0.6). Locks down the exact
 * boundary semantics so the refactor can be verified against it.
 */

import { describe, it, expect } from "vitest";
import {
  getPrestigeTier,
  formatPrestigeTier,
  PRESTIGE_TIER_LABELS,
} from "@/core/prestige/prestigeTypes";

describe("getPrestigeTier", () => {
  it("returns 'world' at exactly 90", () => {
    expect(getPrestigeTier(90)).toBe("world");
  });

  it("returns 'premier' just below 90 and at exactly 72", () => {
    expect(getPrestigeTier(89)).toBe("premier");
    expect(getPrestigeTier(72)).toBe("premier");
  });

  it("returns 'national' just below 72 and at exactly 52", () => {
    expect(getPrestigeTier(71)).toBe("national");
    expect(getPrestigeTier(52)).toBe("national");
  });

  it("returns 'regional' just below 52 and at exactly 30", () => {
    expect(getPrestigeTier(51)).toBe("regional");
    expect(getPrestigeTier(30)).toBe("regional");
  });

  it("returns 'provincial' just below 30 and at 0", () => {
    expect(getPrestigeTier(29)).toBe("provincial");
    expect(getPrestigeTier(0)).toBe("provincial");
  });

  it("clamps above 100 to 'world'", () => {
    expect(getPrestigeTier(100)).toBe("world");
    expect(getPrestigeTier(150)).toBe("world");
  });

  it("handles negative scores as 'provincial'", () => {
    expect(getPrestigeTier(-10)).toBe("provincial");
  });
});

describe("formatPrestigeTier", () => {
  it("returns the human label for each tier", () => {
    expect(formatPrestigeTier(95)).toBe(PRESTIGE_TIER_LABELS.world);
    expect(formatPrestigeTier(75)).toBe(PRESTIGE_TIER_LABELS.premier);
    expect(formatPrestigeTier(55)).toBe(PRESTIGE_TIER_LABELS.national);
    expect(formatPrestigeTier(35)).toBe(PRESTIGE_TIER_LABELS.regional);
    expect(formatPrestigeTier(10)).toBe(PRESTIGE_TIER_LABELS.provincial);
  });
});
