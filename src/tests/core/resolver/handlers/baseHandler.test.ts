import { describe, it, expect } from "vitest";
import { ALL_HANDLERS } from "@/platform/resolver/handlers";
import { BaseHandler } from "@/platform/resolver/handlers/BaseHandler";

describe("BaseHandler consolidation (Mason cluster)", () => {
  it("all 10 registered handlers extend BaseHandler", () => {
    expect(ALL_HANDLERS).toHaveLength(10);
    for (const handler of ALL_HANDLERS) {
      expect(handler).toBeInstanceOf(BaseHandler);
    }
  });

  it("dispatch contract: canHandle(type) is true iff the handler's map contains it", () => {
    for (const handler of ALL_HANDLERS) {
      const h = handler as unknown as { handlers?: Record<string, unknown> };
      const keys = Object.keys(h.handlers ?? {});
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(handler.canHandle(key)).toBe(true);
      }
      expect(handler.canHandle("__nonexistent__")).toBe(false);
    }
  });
});
