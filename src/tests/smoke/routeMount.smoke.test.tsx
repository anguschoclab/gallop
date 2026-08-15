import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

// Hoist matchMedia mock so it runs before any module-level code executes
vi.hoisted(() => {
  if (typeof globalThis !== "undefined") {
    const g = globalThis as any;
    if (!g.window?.matchMedia) {
      if (!g.window) g.window = {};
      g.window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      });
    }
  }
});

import { createElement } from "react";
import { cleanup } from "@testing-library/react";
import { createRouterMock, NotFoundError } from "@/test-utils/routerMock";

vi.mock("@tanstack/react-router", () => createRouterMock());

import { renderWithStore, midGameSeed } from "@/test-utils/renderWithStore";
import { routeCases as cases } from "@/test-utils/routeDiscovery";

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("route mount smoke (real store)", () => {
  it("discovers routes to test", () => {
    expect(cases.length).toBeGreaterThan(20);
  });

  it.each(cases)("$name mounts without throwing", ({ component }) => {
    try {
      renderWithStore(createElement(component), midGameSeed());
    } catch (e) {
      // Dynamic routes with dummy IDs correctly throw notFound() when the
      // entity doesn't exist — the component mounted and ran to the guard.
      if (e instanceof NotFoundError) return;
      throw e;
    }
  });
});
