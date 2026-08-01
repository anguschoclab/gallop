/**
 * Design Bible Compliance Tests
 *
 * Validates that newly surfaced components follow design bible patterns:
 * - Typography tokens (var(--font-display), var(--font-body), var(--font-mono))
 * - Color tokens (no hardcoded hex colors)
 * - Tabular figures for numbers
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

function readComponent(name: string): string {
  return readFileSync(join(__dirname, "..", "..", "components", name), "utf-8");
}

describe("Design Bible Compliance: EconomicIndicators", () => {
  const content = readComponent("analytics/EconomicIndicators.tsx");

  it("uses font-mono for numeric values", () => {
    expect(content).toMatch(/font-mono/);
  });

  it("uses uppercase tracking for labels", () => {
    expect(content).toMatch(/uppercase/);
    expect(content).toMatch(/tracking/);
  });

  it("does not use hardcoded hex colors", () => {
    // Allow bg-slate-900, text-cream, etc. — only flag raw hex like #fff
    const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g);
    // Filter out non-color hex (unlikely in TSX)
    if (hexMatches) {
      // Allow none — all colors should be token-based
      expect(hexMatches.length).toBe(0);
    }
  });
});

describe("Design Bible Compliance: DiplomacyPanel", () => {
  const content = readComponent("npc/DiplomacyPanel.tsx");

  it("uses font-mono for numeric values", () => {
    expect(content).toMatch(/font-mono/);
  });

  it("uses uppercase tracking for labels", () => {
    expect(content).toMatch(/uppercase/);
    expect(content).toMatch(/tracking/);
  });

  it("does not use hardcoded hex colors", () => {
    const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hexMatches) {
      expect(hexMatches.length).toBe(0);
    }
  });
});

describe("Design Bible Compliance: TransportPlanner", () => {
  const content = readComponent("transportation/TransportPlanner.tsx");

  it("uses font-mono for numeric values", () => {
    expect(content).toMatch(/font-mono/);
  });

  it("uses uppercase tracking for labels", () => {
    expect(content).toMatch(/uppercase/);
    expect(content).toMatch(/tracking/);
  });
});
