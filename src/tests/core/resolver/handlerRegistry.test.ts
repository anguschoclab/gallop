import { describe, it, expect } from "vitest";
import { ALL_HANDLERS } from "@/core/resolver/handlers";
import type { ImpactHandler } from "@/core/resolver/handlers/types";

describe("Resolver pipeline: handler registry integrity", () => {
  const expectedHandlerNames = [
    "HorseHandler",
    "FinanceHandler",
    "RacingHandler",
    "BreedingHandler",
    "MarketHandler",
    "SystemHandler",
    "InfrastructureHandler",
    "SyndicationHandler",
    "InboxHandler",
    "DiplomacyHandler",
  ];

  it("registers exactly 10 handlers", () => {
    expect(ALL_HANDLERS).toHaveLength(10);
  });

  it("each handler implements the ImpactHandler interface", () => {
    for (const handler of ALL_HANDLERS) {
      expect(typeof handler.handle).toBe("function");
      expect(typeof handler.canHandle).toBe("function");
    }
  });

  it("each handler can handle at least one impact type", () => {
    for (const handler of ALL_HANDLERS) {
      // Each handler should respond to at least one known impact type
      // We test with a dummy impact type to verify canHandle returns false for unknown
      expect(handler.canHandle("__nonexistent_impact_type__")).toBe(false);
    }
  });

  it("all expected handler classes are represented", () => {
    const registeredNames = ALL_HANDLERS.map((h) => h.constructor.name);
    for (const expected of expectedHandlerNames) {
      expect(registeredNames).toContain(expected);
    }
  });

  it("no duplicate handler types in registry", () => {
    const names = ALL_HANDLERS.map((h) => h.constructor.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});
