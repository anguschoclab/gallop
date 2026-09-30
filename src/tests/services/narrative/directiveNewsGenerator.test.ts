import { describe, it, expect } from "vitest";
import { generateDirectiveChangeNews } from "@/services/narrative/directiveNewsGenerator";
import type { StrategicDirective } from "@/core/ai/strategicCoordinator";
import type { NewsItem } from "@/services/narrative/newsTypes";

describe("generateDirectiveChangeNews", () => {
  const stable = { id: "s1", name: "Thunder Stables", personality: "aggressive" } as any;

  it("returns null when no previous directives", () => {
    const result = generateDirectiveChangeNews(
      stable,
      null,
      [{ type: "racing_focus", priority: 1, weight: 1.0 }],
      10,
    );
    expect(result).toBeNull();
  });

  it("returns null when top directive is unchanged", () => {
    const oldDirectives: StrategicDirective[] = [
      { type: "racing_focus", priority: 1, weight: 1.0 },
      { type: "expansion", priority: 2, weight: 0.5 },
    ];
    const newDirectives: StrategicDirective[] = [
      { type: "racing_focus", priority: 1, weight: 0.9 },
      { type: "consolidation", priority: 2, weight: 0.4 },
    ];
    const result = generateDirectiveChangeNews(stable, oldDirectives, newDirectives, 10);
    expect(result).toBeNull();
  });

  it("generates news when top directive changes", () => {
    const oldDirectives: StrategicDirective[] = [
      { type: "racing_focus", priority: 1, weight: 1.0 },
    ];
    const newDirectives: StrategicDirective[] = [
      { type: "breeding_expansion", priority: 1, weight: 1.0 },
    ];
    const result = generateDirectiveChangeNews(stable, oldDirectives, newDirectives, 15);
    expect(result).not.toBeNull();
    expect(result!.category).toBe("stable");
    expect(result!.importance).toBe("medium");
    expect(result!.day).toBe(15);
    expect(result!.headline).toContain("Thunder Stables");
    expect(result!.entityLinks).toBeDefined();
    expect(result!.entityLinks!.some((l) => l.type === "stable" && l.id === "s1")).toBe(true);
  });

  it("generates high importance news for financial distress shift", () => {
    const oldDirectives: StrategicDirective[] = [
      { type: "aggressive_expansion", priority: 1, weight: 1.0 },
    ];
    const newDirectives: StrategicDirective[] = [
      { type: "financial_distress", priority: 1, weight: 1.0 },
    ];
    const result = generateDirectiveChangeNews(stable, oldDirectives, newDirectives, 20);
    expect(result).not.toBeNull();
    expect(result!.importance).toBe("high");
  });

  it("returns null when both directive arrays are empty", () => {
    const result = generateDirectiveChangeNews(stable, [], [], 10);
    expect(result).toBeNull();
  });

  it("distress shift template pool has at least 14 variants", () => {
    const oldDirectives: StrategicDirective[] = [
      { type: "aggressive_expansion", priority: 1, weight: 1.0 },
    ];
    const newDirectives: StrategicDirective[] = [
      { type: "financial_distress", priority: 1, weight: 1.0 },
    ];

    const headlines = new Set<string>();
    const bodies = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const stableWithDiffId = { ...stable, id: `s${i}` };
      const result = generateDirectiveChangeNews(stableWithDiffId, oldDirectives, newDirectives, 20 + i);
      if (result) {
        headlines.add(result.headline);
        bodies.add(result.body);
      }
    }

    expect(headlines.size).toBeGreaterThanOrEqual(14);
    expect(bodies.size).toBeGreaterThanOrEqual(14);
  });

  it("strategy shift template pool has at least 14 variants", () => {
    const oldDirectives: StrategicDirective[] = [
      { type: "racing_focus", priority: 1, weight: 1.0 },
    ];
    const newDirectives: StrategicDirective[] = [
      { type: "breeding_expansion", priority: 1, weight: 1.0 },
    ];

    const headlines = new Set<string>();
    const bodies = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const stableWithDiffId = { ...stable, id: `s${i}` };
      const result = generateDirectiveChangeNews(stableWithDiffId, oldDirectives, newDirectives, 20 + i);
      if (result) {
        headlines.add(result.headline);
        bodies.add(result.body);
      }
    }

    expect(headlines.size).toBeGreaterThanOrEqual(14);
    expect(bodies.size).toBeGreaterThanOrEqual(14);
  });
});
