/**
 * personRenderPlan.test.ts - Memoized render-plan resolver contracts
 */

import { describe, it, expect } from "vitest";
import {
  resolvePersonRenderPlan,
  personRenderPlanCacheSize,
} from "@/domains/person/application/renderPlan";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import { createStubPersonIdentity } from "@/domains/person/model/fixtures";

const identity = () => createStubPersonIdentity({ id: "plan-test" });

describe("resolvePersonRenderPlan", () => {
  it("returns a plan with identity, context, size, silk, and label", () => {
    const plan = resolvePersonRenderPlan({
      identity: identity(),
      context: "jockey-racewear",
      width: 55,
      height: 66,
      silk: { primary: "#f00", secondary: "#fff", cap: "#00f", pattern: "hoops" },
    });
    expect(plan.identity.id).toBe("plan-test");
    expect(plan.context).toBe("jockey-racewear");
    expect(plan.width).toBe(55);
    expect(plan.height).toBe(66);
    expect(plan.silk?.primary).toBe("#f00");
    expect(plan.label).toBe("Stub Person portrait");
  });

  it("memoizes — identical inputs return the same object", () => {
    const a = resolvePersonRenderPlan({ identity: identity() });
    const b = resolvePersonRenderPlan({ identity: identity() });
    expect(a).toBe(b);
  });

  it("memoization key includes revision — rerolled identity gets a fresh plan", () => {
    const base = identity();
    const p1 = resolvePersonRenderPlan({ identity: base });
    const rerolled = {
      ...base,
      appearance: { ...base.appearance, revision: 1 },
    };
    const p2 = resolvePersonRenderPlan({ identity: rerolled });
    expect(p2).not.toBe(p1);
    expect(p2.identity.appearance.revision).toBe(1);
  });

  it("memoization key includes context and silk", () => {
    const id = identity();
    const casual = resolvePersonRenderPlan({ identity: id, context: "jockey-casual" });
    const race = resolvePersonRenderPlan({ identity: id, context: "jockey-racewear" });
    expect(race).not.toBe(casual);
    const withSilk = resolvePersonRenderPlan({
      identity: id,
      context: "jockey-racewear",
      silk: { primary: "#000", secondary: "#111", cap: "#222", pattern: "solid" },
    });
    expect(withSilk).not.toBe(race);
  });

  it("generated identities produce stable plans", () => {
    const gen = generatePersonIdentity({
      id: "gen-plan",
      displayName: "Gen Plan",
      role: "owner",
      ageBand: "adult",
    });
    const a = resolvePersonRenderPlan({ identity: gen, context: "owner-formal" });
    const b = resolvePersonRenderPlan({ identity: gen, context: "owner-formal" });
    expect(a).toBe(b);
    expect(a.label).toBe("Gen Plan portrait");
  });

  it("cache stays bounded under heavy use", () => {
    for (let i = 0; i < 800; i++) {
      resolvePersonRenderPlan({
        identity: createStubPersonIdentity({ id: `bulk-${i}` }),
        context: "compact",
      });
    }
    expect(personRenderPlanCacheSize()).toBeLessThanOrEqual(500);
  });

  it("custom label overrides the default", () => {
    const plan = resolvePersonRenderPlan({ identity: identity(), label: "Custom" });
    expect(plan.label).toBe("Custom");
  });
});
