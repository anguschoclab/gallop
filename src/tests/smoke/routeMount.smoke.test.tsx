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
import { componentRouteCases, redirectRouteCases } from "@/test-utils/routeDiscovery";

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("route mount smoke (real store)", () => {
  it("discovers 46 component routes", () => {
    expect(componentRouteCases.length).toBe(46);
  });

  it("discovers 16 redirect-only routes", () => {
    expect(redirectRouteCases.length).toBe(16);
  });

  it.each(componentRouteCases)("$name mounts without throwing", ({ component }) => {
    try {
      renderWithStore(createElement(component), midGameSeed());
    } catch (e) {
      // Dynamic routes with dummy IDs correctly throw notFound() when the
      // entity doesn't exist — the component mounted and ran to the guard.
      if (e instanceof NotFoundError) return;
      throw e;
    }
  });

  it.each(redirectRouteCases)(
    "$name redirect executes without unexpected error",
    ({ beforeLoad }) => {
      try {
        beforeLoad();
        // If beforeLoad doesn't throw, that's a failure — redirect routes must throw
        throw new Error("beforeLoad did not throw (expected redirect or notFound)");
      } catch (e) {
        if (e instanceof NotFoundError) return;
        // redirect() returns a plain object with a `to` property — verify it's a redirect
        if (e instanceof Error) throw e;
        const thrown = e as Record<string, unknown>;
        if (typeof thrown.to === "string") return;
        throw new Error(`beforeLoad threw unexpected value: ${JSON.stringify(e)}`);
      }
    },
  );

  it("__root.tsx module loads with Route export", async () => {
    const mod = await import("@/routes/__root");
    expect(mod.Route).toBeDefined();
  });
});
