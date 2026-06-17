# Selector-Stability Guardrail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the render-loop bug class (unstable Zustand `useGame` selectors) impossible to write and impossible to ship green — via an ESLint rule that bans the pattern and a real-store test harness that actually exercises the subscription mechanism.

**Architecture:** Two independent layers. (1) **Lint:** a `no-restricted-syntax` rule set targeting `useGame(s => …)` selectors that return a freshly-constructed array/object (the exact shape that makes `getSnapshot` unstable). (2) **Test:** a `renderWithStore` helper that mounts components against the _real_ Zustand store (no `vi.mock("@/game/store")`), so an infinite loop throws `Maximum update depth exceeded` in CI — plus smoke tests for the components that were shipping broken.

**Tech Stack:** ESLint flat config (`typescript-eslint`), Vitest + Testing Library, Zustand v5 (`useGame` singleton store), React 19.

---

## Context

This codebase has a **chronic, recurring** class of bug: a `useGame((s) => s.x ?? [])` selector returns a new array/object reference every render, so Zustand's `useSyncExternalStore` snapshot never compares equal → infinite re-render → `Maximum update depth exceeded`. This session alone, three live pages were crashing into the error boundary from it (dashboard, `/racing`, regional calendar), and `git log` shows a trail of prior fixes (`Fixed founder selector loop`, `Stabilize selectors to prevent re-render loops`).

Two systemic failures let it keep happening:

1. **Nothing prevents writing it.** Every selector is hand-authored; the mistake is one `?? []` away.
2. **The test suite is blind to it.** Component tests do `vi.mock("@/game/store")` (returning `selector(mockState)` directly) and use `renderToStaticMarkup`, so they never run the real `useSyncExternalStore` — the only thing that loops. 1,573 tests pass while pages crash.

The safe alternatives already exist in the codebase: `useGameWithShallow` ([src/game/store/index.ts:365](src/game/store/index.ts)) for `?? []`/`?? {}` fallbacks (shallow equality treats empty arrays as equal), and module-level stable constants (e.g. `EMPTY_FORECAST` in [WeatherForecastStrip.tsx](src/components/race/WeatherForecastStrip.tsx)). This plan makes those the _only_ writable options and adds a net that catches regressions.

**Outcome:** A new unstable selector fails `bun run lint`; a component that loops fails `bun run test`. The bug class stops costing recurring debugging time.

---

## File Structure

**New files**

- `src/test-utils/renderWithStore.tsx` — seeds the real store + renders; the harness that makes loops throw.
- `src/tests/smoke/storeSubscription.smoke.test.tsx` — mounts the previously-broken components against the real store.

**Modified files**

- `eslint.config.js` — add a `no-restricted-syntax` block scoped to files that use the store.

**Reused as-is**

- `useGame`, `useGameWithShallow` from `@/game/store`.
- `createDefaultGameState` from `@/game/store/state` ([index.ts:61](src/game/store/state/index.ts)).

---

## Conventions (read before starting)

- ESLint is **flat config** (`eslint.config.js`, `tseslint.config(...)`). Rules go in a config object's `rules` map; scope with `files`.
- Run lint: `bun run lint`. Run one test file: `bunx vitest run <path>`.
- The store is a **singleton** (`useGame` created once). Tests must reseed it per-test; `useGame.setState(partial)` _merges_ (keeps action methods), so never pass the `replace=true` second arg.
- `createDefaultGameState()` returns the data fields only (no action methods) — merging it resets data while preserving the store's actions.

---

## Task 1: `renderWithStore` test harness

**Files:**

- Create: `src/test-utils/renderWithStore.tsx`
- Test: (covered by Task 2's smoke test)

- [ ] **Step 1: Implement the harness**

```tsx
// src/test-utils/renderWithStore.tsx
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import type { GameState } from "@/game/types";

/**
 * Reset the real store to default data (preserving action methods) with optional
 * field overrides. Merge semantics: never pass replace=true or the slices'
 * action methods are wiped.
 *
 * @param overrides - partial GameState fields to set for the test
 */
export function seedStore(overrides: Partial<GameState> = {}): void {
  useGame.setState({ ...createDefaultGameState(), ...overrides });
}

/**
 * Render a component against the REAL Zustand store (no vi.mock of @/game/store).
 * This exercises useSyncExternalStore, so an unstable selector throws
 * "Maximum update depth exceeded" instead of silently passing.
 *
 * @param ui - the element to render
 * @param overrides - partial GameState fields to seed before rendering
 * @returns the Testing Library render result
 */
export function renderWithStore(
  ui: ReactElement,
  overrides: Partial<GameState> = {},
): RenderResult {
  seedStore(overrides);
  return render(ui);
}
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors from `renderWithStore.tsx`. (If `createDefaultGameState`'s return type is not assignable to `Partial<GameState>`, widen the spread with `as Partial<GameState>` on the `createDefaultGameState()` call — do not change the source.)

- [ ] **Step 3: Commit**

```bash
git add src/test-utils/renderWithStore.tsx
git commit -m "test: real-store render harness to catch selector loops"
```

---

## Task 2: Smoke test that fails on a loop

This test mounts the components that were shipping broken. It must **not** mock `@/game/store` (that is the whole point). It mocks only the router, because routing context is incidental to the loop.

**Files:**

- Create: `src/tests/smoke/storeSubscription.smoke.test.tsx`

- [ ] **Step 1: Write the smoke test**

```tsx
// src/tests/smoke/storeSubscription.smoke.test.tsx
/**
 * Mounts store-connected components against the REAL store so that an unstable
 * selector (fresh array/object each render) throws "Maximum update depth
 * exceeded". Router is mocked because routing context is incidental here.
 */
import { describe, it, expect, vi, afterEach, type ReactNode } from "vitest";
import { createElement } from "react";
import { cleanup } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
  getRouteApi: () => ({
    useSearch: () => ({}),
    useNavigate: () => () => {},
    useParams: () => ({}),
  }),
}));

import { renderWithStore } from "@/test-utils/renderWithStore";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";

afterEach(() => cleanup());

describe("store subscription stability (smoke)", () => {
  it("WeatherForecastStrip mounts without an update loop when a track has no forecast", () => {
    expect(() =>
      renderWithStore(
        createElement(WeatherForecastStrip, { trackId: "no-such-track", trackCondition: "fast" }),
      ),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it — expect PASS (the fix from this session is already in place)**

Run: `bunx vitest run src/tests/smoke/storeSubscription.smoke.test.tsx`
Expected: PASS. (To prove the harness actually catches loops, temporarily revert `EMPTY_FORECAST` in `WeatherForecastStrip.tsx` back to `?? []`, run again, confirm it FAILS with "Maximum update depth exceeded", then restore.)

- [ ] **Step 3: Add the other previously-broken components to the same describe block**

Append these cases. Each seeds the minimum state the component reads. If a component needs more props, pass the smallest valid values; the assertion is only "does not throw".

```tsx
it("RacesTab feed mounts without a loop (empty weather/forecast)", async () => {
  const { RacesTab } = await import("@/components/racing/RacesTab");
  expect(() => renderWithStore(createElement(RacesTab))).not.toThrow();
});
```

(Repeat the `await import(...)` + `renderWithStore` pattern for any component a future regression should guard — e.g. dashboard widgets. Keep each case to one `it`. Use dynamic `import()` inside the test so a render-time import error is attributed to the right case.)

- [ ] **Step 4: Run the file**

Run: `bunx vitest run src/tests/smoke/storeSubscription.smoke.test.tsx`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/tests/smoke/storeSubscription.smoke.test.tsx
git commit -m "test: smoke tests for store-connected components against real store"
```

---

## Task 3: ESLint rule banning unstable `useGame` selectors

**Files:**

- Modify: `eslint.config.js`

- [ ] **Step 1: Add a scoped `no-restricted-syntax` config block**

Insert this as a **new config object** in the `tseslint.config(...)` array in `eslint.config.js`, after the existing blocks. It targets only files that read the store, and bans the four shapes that produce a fresh reference from a `useGame` selector.

```js
  // Guardrail: ban unstable useGame selectors (fresh array/object each render
  // → unstable useSyncExternalStore snapshot → infinite re-render loop).
  // Use useGameWithShallow for `?? []`/`?? {}`, or a module-level stable const.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/tests/**", "src/test-utils/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='useGame'] > ArrowFunctionExpression > LogicalExpression[operator='??'][right.type='ArrayExpression']",
          message:
            "Unstable useGame selector: `?? []` returns a new array each render and causes an infinite re-render loop. Use useGameWithShallow, or a module-level EMPTY const.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] > ArrowFunctionExpression > LogicalExpression[operator='??'][right.type='ObjectExpression']",
          message:
            "Unstable useGame selector: `?? {}` returns a new object each render and causes an infinite re-render loop. Use useGameWithShallow, or a module-level EMPTY const.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] > ArrowFunctionExpression[body.type='ArrayExpression']",
          message:
            "Unstable useGame selector: returning an array literal creates a new reference each render. Use useGameWithShallow.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] > ArrowFunctionExpression[body.type='ObjectExpression']",
          message:
            "Unstable useGame selector: returning an object literal creates a new reference each render. Use useGameWithShallow.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] > ArrowFunctionExpression[body.type='CallExpression'][body.callee.type='MemberExpression'][body.callee.property.name=/^(map|filter|slice|sort|concat|reduce|flat|flatMap)$/]",
          message:
            "Unstable useGame selector: an array transform (.map/.filter/.slice/…) returns a new array each render. Select the raw value and transform in a useMemo, or use useGameWithShallow.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] ArrowFunctionExpression BlockStatement ReturnStatement > LogicalExpression[operator='??'][right.type='ArrayExpression']",
          message:
            "Unstable useGame selector: `?? []` in a block-body return creates a new array each render. Use useGameWithShallow, or a module-level EMPTY const.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] ArrowFunctionExpression BlockStatement ReturnStatement > LogicalExpression[operator='??'][right.type='ObjectExpression']",
          message:
            "Unstable useGame selector: `?? {}` in a block-body return creates a new object each render. Use useGameWithShallow, or a module-level EMPTY const.",
        },
      ],
    },
  },
```

- [ ] **Step 2: Run lint — expect CLEAN (this session already removed the known offenders)**

Run: `bun run lint`
Expected: no `no-restricted-syntax` errors. (The three known offenders — WeatherForecastStrip, useNpcStableDetail, useAnalyticsData — were already fixed this session.)

- [ ] **Step 3: Prove the rule bites**

Temporarily add this line to any file under `src/hooks/` and run `bun run lint`:

```ts
const _x = useGame((s) => s.horses ?? []);
```

Expected: lint FAILS with the "Unstable useGame selector: `?? []`…" message. Remove the line.

- [ ] **Step 4: Confirm safe patterns are NOT flagged**

Verify these (already present in the codebase) produce **no** error: `useGameWithShallow((s) => s.x ?? [])`, `useGame((s) => s.horses)`, `useGame((s) => s.weather?.byTrack?.[id]?.slice(-1)[0])` (returns an element, not a fresh array). If any false-positives appear, narrow the offending selector — do not weaken to a warning.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js
git commit -m "lint: ban unstable useGame selectors (render-loop guardrail)"
```

---

## Verification (whole-plan)

- [ ] `bun run lint` — clean, and demonstrably fails on a hand-added `?? []` selector (Task 3 Step 3).
- [ ] `bunx vitest run src/tests/smoke/storeSubscription.smoke.test.tsx` — passes, and demonstrably fails if `WeatherForecastStrip`'s fix is reverted (Task 2 Step 2).
- [ ] `bun run test` — full suite still green (no regressions from the new test file).
- [ ] `bunx tsc --noEmit` — clean.

## Self-review notes

- **Spec coverage:** Improvement #1 had two parts — "(a) lint rule banning the pattern; (b) a real-store test harness." Task 3 = (a); Tasks 1–2 = (b). Both delivered.
- **No placeholders:** every selector string, message, and helper is concrete.
- **Type consistency:** `seedStore`/`renderWithStore` signatures used identically in Tasks 1 and 2.
- **Known false-positive risk:** the `.map/.filter/.slice` selector (5th) is the most aggressive. If it flags a legitimate already-stable case, prefer selecting raw + `useMemo` (the correct fix) over loosening the rule. Block-body literal returns (`return {…}`) are intentionally **not** caught to avoid false positives on computed primitives; the `??`-fallback block selectors cover the common offender.
