/**
 * TransportPlanner Component Tests
 *
 * Verifies that TransportPlanner is imported and rendered within a route.
 * Before Phase 3.2, TransportPlanner was an orphaned component — fully
 * implemented but never imported by any route.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const STABLE_ROUTE_PATH = join(__dirname, "..", "..", "components", "routes", "HorseDetail.tsx");

describe("TransportPlanner Wiring", () => {
  it("TransportPlanner is imported in the horse detail component", () => {
    const content = readFileSync(STABLE_ROUTE_PATH, "utf-8");
    expect(content).toMatch(/TransportPlanner/);
  });

  it("TransportPlanner is rendered in the horse detail component JSX", () => {
    const content = readFileSync(STABLE_ROUTE_PATH, "utf-8");
    // Should appear as a JSX component, not just in a comment
    expect(content).toMatch(/<TransportPlanner/);
  });

  it("TransportPlanner component exists and is exported", async () => {
    const mod = await import("@/components/transportation/TransportPlanner");
    expect(mod.TransportPlanner).toBeDefined();
    expect(typeof mod.TransportPlanner).toBe("function");
  });
});
