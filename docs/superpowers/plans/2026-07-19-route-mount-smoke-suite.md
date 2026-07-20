# Route-Mount Smoke Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the "4,367 green tests but the page crashes on load" blind spot permanently — one parameterized suite that mounts **every** route component against the real Zustand store and fails if any of them throws.

**Architecture:** Extend the existing `renderWithStore` harness with a shared router mock, then drive a table of every route in `src/routes/` through a single `it.each`. Because the harness uses the _real_ store (not `vi.mock("@/game/store")`), React actually runs `useSyncExternalStore` — so render loops, missing imports, and null-deref crashes all surface as test failures instead of shipping.

**Tech Stack:** Vitest, Testing Library, the existing `src/test-utils/renderWithStore.tsx`, TanStack Router (mocked), Zustand.

---

## Context

This codebase's signature failure is a page that crashes on load while the test suite stays green. It has happened repeatedly: three live pages (dashboard, `/racing`, the regional calendar) were rendering nothing but an error boundary while 1,500+ tests passed, and just this week `src/routes/facilities.tsx:16` shipped a fresh unstable-selector landmine to `main`.

The reason tests miss it is structural: component tests `vi.mock("@/game/store")` (returning `selector(mockState)` directly) and/or use `renderToStaticMarkup`. Neither exercises Zustand's real `useSyncExternalStore`, which is the exact mechanism that loops. The ESLint guardrail added earlier blocks the _known_ offender syntax (`?? []`), but it can't catch a crash from a missing import, a null deref, or a loop introduced through a helper hook.

The fix already half-exists: `src/test-utils/renderWithStore.tsx` mounts against the real store and was proven to catch a loop (reverting the `WeatherForecastStrip` fix made it fail with `Maximum update depth exceeded`). Today it's used by a handful of hand-picked components in `src/tests/smoke/storeSubscription.smoke.test.tsx`. This plan generalizes it to all **54 route files** so coverage is automatic rather than remembered.

**Outcome:** Any route that can't mount fails CI. New routes are covered by default (the suite enumerates the directory), so the guarantee doesn't decay.

---

## File Structure

**New files**

- `src/test-utils/routerMock.tsx` — one shared TanStack Router mock (Link/useNavigate/useSearch/getRouteApi/etc.).
- `src/tests/smoke/routeMount.smoke.test.tsx` — the parameterized all-routes suite.

**Modified files**

- `src/test-utils/renderWithStore.tsx` — add a seed preset representing "a real mid-game save" so routes have data to render.

**Reused as-is:** `renderWithStore`/`seedStore`, `createDefaultGameState` (`src/game/store/state`), the existing `storeSubscription.smoke.test.tsx` (keep it — it stays useful for non-route components).

---

## Conventions

- Route files live in `src/routes/*.tsx` and export `Route` from `createFileRoute(...)`. The component is at `Route.options.component`.
- Some routes are **redirect-only** (`beforeLoad` throws `redirect(...)`, no `component`) — e.g. `gazette.tsx`, `recap.tsx`, `awards.tsx`. These must be skipped, not failed.
- Dynamic routes (`race.$raceId.tsx`, `stable.$horseId.tsx`) need params; the router mock supplies them.
- Run one file: `bunx vitest run src/tests/smoke/routeMount.smoke.test.tsx`.

---

## Task 1: Shared router mock

**Files:** Create `src/test-utils/routerMock.tsx`

- [ ] **Step 1: Write it**

```tsx
// src/test-utils/routerMock.tsx
/**
 * A single TanStack Router mock shared by smoke tests. Routing context is
 * incidental to what these tests check (does the component mount against the
 * real store?), so we stub the router rather than standing up a real one.
 *
 * Params are permissive on purpose: dynamic routes ask for whatever id they
 * need and get a stable dummy, so the component renders its "not found" or
 * empty state instead of throwing.
 */
import { createElement, type ReactNode } from "react";

export const MOCK_PARAMS: Record<string, string> = {
  raceId: "mock-race-id",
  horseId: "mock-horse-id",
  stableId: "mock-stable-id",
  jockeyId: "mock-jockey-id",
  regionId: "usa",
  saleId: "mock-sale-id",
  stallionId: "mock-stallion-id",
};

const noop = () => {};

export function createRouterMock() {
  const routeApi = {
    useSearch: () => ({}),
    useNavigate: () => noop,
    useParams: () => MOCK_PARAMS,
    useLoaderData: () => ({}),
  };

  return {
    Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
    Outlet: () => null,
    useNavigate: () => noop,
    useSearch: () => ({}),
    useParams: () => MOCK_PARAMS,
    useRouter: () => ({ navigate: noop, history: { back: noop } }),
    useRouterState: () => ({ location: { pathname: "/", search: {} } }),
    getRouteApi: () => routeApi,
    notFound: () => new Error("notFound"),
    redirect: (opts: unknown) => opts,
    // createFileRoute must return a factory that echoes the options back, so
    // route modules still expose Route.options.component to the suite.
    createFileRoute: () => (options: unknown) => ({ options }),
  };
}
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/test-utils/routerMock.tsx
git commit -m "test: shared TanStack Router mock for smoke suites"
```

---

## Task 2: A realistic mid-game seed

Routes that render an empty store exercise almost nothing (most bail early on "no horses"). Seeding a small but real game makes the suite meaningful.

**Files:** Modify `src/test-utils/renderWithStore.tsx`

- [ ] **Step 1: Add a seed preset**

Append to `renderWithStore.tsx`:

```tsx
import { createHorse } from "@/core/horse/horseFactory";
import type { GameState } from "@/game/types";

/**
 * A minimal but non-empty game: a few owned horses, some cash, a player profile.
 * Routes that early-return on an empty roster will actually render their real
 * content with this, which is what makes the smoke suite worth running.
 *
 * @returns partial state suitable for seedStore/renderWithStore overrides
 */
export function midGameSeed(): Partial<GameState> {
  return {
    day: 120,
    cash: 250_000,
    playerProfile: {
      stableName: "Smoke Test Stables",
      ownerName: "QA",
    } as GameState["playerProfile"],
  };
}
```

> **Step 0 check:** confirm `createHorse`'s exported name and signature (`grep -n "export function create" src/core/horse/horseFactory.ts`) and the required shape of `playerProfile` (`grep -n "playerProfile" src/game/store/state/*.ts`). If seeding horses through the factory is awkward, ship the seed with cash + profile + `day` only — the suite still catches crashes; richer seeds can come later.

- [ ] **Step 2: Type-check + commit**

```bash
bunx tsc --noEmit
git add src/test-utils/renderWithStore.tsx
git commit -m "test: mid-game seed preset for route smoke tests"
```

---

## Task 3: The all-routes smoke suite

**Files:** Create `src/tests/smoke/routeMount.smoke.test.tsx`

- [ ] **Step 1: Write the suite**

```tsx
// src/tests/smoke/routeMount.smoke.test.tsx
/**
 * Mounts EVERY route component against the real Zustand store.
 *
 * Why this exists: component tests in this repo mock @/game/store, so they never
 * run useSyncExternalStore — the mechanism behind our recurring render-loop
 * crashes. A route can therefore have thousands of passing tests and still show
 * nothing but an error boundary in the browser. This suite is the backstop:
 * if a route can't mount, CI goes red.
 *
 * It enumerates src/routes/ at run time, so new routes are covered automatically.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createElement, type ComponentType } from "react";
import { cleanup } from "@testing-library/react";
import { createRouterMock } from "@/test-utils/routerMock";

vi.mock("@tanstack/react-router", () => createRouterMock());

import { renderWithStore, midGameSeed } from "@/test-utils/renderWithStore";

// Vite/Vitest glob: eager so failures attribute to the right case.
const routeModules = import.meta.glob("../../routes/**/*.tsx", { eager: true }) as Record<
  string,
  { Route?: { options?: { component?: ComponentType } } }
>;

// __root defines app shell/providers, not a page; it needs a real router.
const SKIP = [/__root/, /routeTree\.gen/];

const cases = Object.entries(routeModules)
  .filter(([path]) => !SKIP.some((re) => re.test(path)))
  .map(([path, mod]) => ({
    name: path.replace("../../routes/", ""),
    component: mod.Route?.options?.component,
  }))
  // Redirect-only routes (beforeLoad throws redirect) have no component — nothing to mount.
  .filter(
    (c): c is { name: string; component: ComponentType } => typeof c.component === "function",
  );

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("route mount smoke (real store)", () => {
  it("discovers routes to test", () => {
    // Guards against the glob silently matching nothing, which would make every
    // other assertion vacuously pass.
    expect(cases.length).toBeGreaterThan(20);
  });

  it.each(cases)("$name mounts without throwing", ({ component }) => {
    expect(() => renderWithStore(createElement(component), midGameSeed())).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it — expect failures on genuinely broken routes**

Run: `bunx vitest run src/tests/smoke/routeMount.smoke.test.tsx`

Expected on first run: most routes pass; some fail. **That is the point** — each failure is either a real crash or a route needing a bit more seed/mocking. Triage each:

- `Maximum update depth exceeded` → a real render loop. Fix it (`useGameWithShallow` or a module-level `EMPTY` const), don't skip the route.
- `X is not defined` / `Cannot read properties of undefined` → a real crash or a missing store field. Prefer widening `midGameSeed()` over skipping.
- Failures caused purely by the router stub (e.g. a route needing a loader) → extend `routerMock.tsx`.

Only add a route to `SKIP` if it genuinely cannot be mounted in isolation, and leave a comment saying why. Skips are how this suite decays — keep them rare and justified.

- [ ] **Step 3: Get to green**

Iterate until the file passes. Record in the commit message which failures were real bugs versus harness gaps — that's the evidence this suite earns its keep.

- [ ] **Step 4: Commit**

```bash
git add src/tests/smoke/routeMount.smoke.test.tsx
git commit -m "test: mount every route against the real store (crash backstop)"
```

---

## Task 4: Prove the suite actually bites

A backstop nobody has tested is a backstop nobody can trust.

- [ ] **Step 1: Reintroduce a loop deliberately**

Pick any route-rendered component and revert a stable selector to the unstable form, e.g. in `src/components/race/WeatherForecastStrip.tsx` change `?? EMPTY_FORECAST` back to `?? []`.

- [ ] **Step 2: Confirm the suite fails**

Run: `bunx vitest run src/tests/smoke/routeMount.smoke.test.tsx`
Expected: FAIL with `Maximum update depth exceeded` on the routes that render it.

- [ ] **Step 3: Restore and re-verify**

```bash
git checkout -- src/components/race/WeatherForecastStrip.tsx
bunx vitest run src/tests/smoke/routeMount.smoke.test.tsx   # green again
```

- [ ] **Step 4: Document the guarantee**

Add a short note to `.claude/skills/verify-gallop/SKILL.md` under the render-loop section: route-level crashes are now caught by `src/tests/smoke/routeMount.smoke.test.tsx`; when adding a route, no action is needed (the glob picks it up), and when a smoke case fails the default is to fix the route, not skip it.

```bash
git add .claude/skills/verify-gallop/SKILL.md
git commit -m "docs: note route-mount smoke coverage in verify-gallop skill"
```

---

## Verification (whole-plan)

- [ ] `bunx vitest run src/tests/smoke/routeMount.smoke.test.tsx` — green, and the discovery guard reports >20 routes.
- [ ] Deliberately reverting a selector fix turns it red (Task 4), and restoring turns it green.
- [ ] `bun run test` — full suite green, no regressions.
- [ ] `bunx tsc --noEmit` — clean.
- [ ] `SKIP` contains only entries with a written justification.

## Self-review notes

- **Spec coverage:** Improvement #2 = "extend renderWithStore into one parameterized test that mounts every route/hub against the real store." Task 1 (router mock) + Task 2 (seed) are prerequisites; Task 3 is the suite; Task 4 proves it works.
- **Decay resistance:** the suite globs the routes directory rather than listing files, so new routes are covered without anyone remembering. The `cases.length > 20` guard prevents a broken glob from making everything vacuously pass — a real risk with `it.each` over an empty array.
- **Type consistency:** `renderWithStore`/`midGameSeed` (Tasks 1–2) are consumed unchanged in Task 3; `createRouterMock` is the single mock source.
- **Confirm against real code (inline steps):** `createHorse`/`playerProfile` shapes (Task 2 Step 0); which routes are redirect-only (handled generically by the `typeof component === "function"` filter rather than a hardcoded list).
