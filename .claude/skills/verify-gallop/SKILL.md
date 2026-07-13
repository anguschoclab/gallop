---
name: verify-gallop
description: Verify that a change, bugfix, or plan implementation actually works in the Gallop game codebase — static gates plus real browser runtime. Use whenever the user says "verify", "is this broken", "does it actually work", "did we implement the plan/spec", "check that the fix works", "confirm this renders", or after finishing a feature/fix and before claiming it's done. ALSO trigger on any sign of the codebase's signature failure — "infinite loop", "Maximum update depth exceeded", "getSnapshot should be cached", a page that crashes into the error boundary, or a route that renders blank — because Gallop has a chronic Zustand selector render-loop bug class that the passing test suite is blind to. Prefer this over a generic "run the tests" response: green tests here do NOT mean the app boots.
---

# Verify Gallop

Confirm a change does what it's supposed to in this repo (TanStack Start + React 19 + Zustand, a single-player horse-racing sim). The core lesson, learned the hard way: **a green test suite is not proof the app works.** Three live pages once shipped crashing into the error boundary while 1,500+ tests passed, because the tests mock the store and never exercise the real subscription. So verification here is two layers — static gates _and_, when the change is browser-observable, real runtime in the preview.

## Decide the depth first

- **Static-only** is enough when the change can't be observed in the browser: pure logic, types, tooling, tests, a refactor with no rendered output.
- **Add runtime** when the change renders, routes, or is reachable in the running app (a component, a route/hub, a fix to a page that was crashing). For these, static gates can pass while the page still loops or blanks — you must load it.

When in doubt, do both. Reporting "tests pass" for a UI fix without loading the page is exactly the trap this skill exists to prevent.

## Static gates

Run from the repo root, in this order. Each catches a different class of problem; don't stop at the first green.

```bash
bunx tsc --noEmit          # types — must be clean
bun run test               # full vitest suite (currently ~3200 tests). Note: stderr from saveManager error-path tests is expected, not a failure
bun run lint               # eslint — 0 errors required; react-hooks/react-refresh WARNINGS are pre-existing and don't block
```

Notes that save time:

- The suite is large but fast (~45s). Run the whole thing for a regression check; run one file with `bunx vitest run <path>` while iterating.
- `bun run build` additionally validates the auto-generated `routeTree.gen.ts` — run it after adding/removing/redirecting routes, and confirm `routeTree.gen.ts` is committed (not left dirty).
- A lint run that's red on `prettier/prettier` is usually just formatting: `bun run format` fixes it. `jsdoc/require-param` / `jsdoc/require-returns` errors mean an exported (or JSDoc-commented) function in a `.ts` file is missing `@param`/`@returns` — add them.

## The render-loop bug class — check this every time

This is Gallop's signature, recurring bug. Internalize it; you will see it again.

**Cause:** a `useGame((s) => …)` selector that returns a _freshly-constructed_ reference each render — `?? []`, `?? {}`, an object/array literal, or a `.map`/`.filter`/`.slice` result. Zustand's `useSyncExternalStore` compares snapshots by identity, so a new reference every render means the snapshot never matches → React re-renders forever → `Maximum update depth exceeded` (often preceded by `getSnapshot should be cached`). The component named in the stack is where it _manifests_; the cause is the selector.

**Why the test suite misses it:** component tests do `vi.mock("@/game/store")` (returning `selector(mockState)` directly) and/or `renderToStaticMarkup`. Neither runs the real `useSyncExternalStore`, so the loop never happens in tests. This is why green ≠ working.

**Detect it** (run when verifying anything that renders, or when investigating a crash/blank page):

```bash
# Default-equality useGame selectors returning a fresh reference — the offenders.
# (useGameWithShallow is SAFE: shallow equality treats empty arrays/objects as equal.)
grep -rn "useGame(" src --include="*.ts" --include="*.tsx" | grep -v "useGameWithShallow" \
  | grep -E "\?\? *(\[\]|\{\})|=> *\[|=> *\(\{|\.(map|filter|slice|sort|concat|reduce)\("
# Block-body selectors that return a fresh object/array literal need eyeballing:
grep -rn "useGame((s) *=> *{" src --include="*.ts" --include="*.tsx" | grep -v "useGameWithShallow"
```

A block-body selector is fine if it returns a _primitive_ or an _existing element_ from the store (e.g. `buf.slice(-1)[0]` returns the same object reference) — only fresh-constructed returns loop.

**The fix** — two correct options:

1. `useGameWithShallow((s) => s.x ?? [])` — for `?? []`/`?? {}` fallbacks; shallow equality makes empty collections compare equal. Match the file's existing convention.
2. A module-level stable constant returned from a plain `useGame`: `const EMPTY: T[] = []; … useGame((s) => s.x ?? EMPTY)`.

**Prove a render-loop fix actually holds** (don't trust "it looks fixed"): there's a real-store test harness at `src/test-utils/renderWithStore.tsx` that mounts a component against the _real_ store, so a loop throws `Maximum update depth exceeded` in the test. Add/extend a smoke case in `src/tests/smoke/storeSubscription.smoke.test.tsx`, then prove it bites by reverting the fix and watching it fail. An ESLint guardrail (`no-restricted-syntax` in `eslint.config.js`) now blocks new offenders — `bun run lint` will catch a reintroduced `?? []`.

## Runtime verification

For browser-observable changes, load the actual page in the preview and confirm it renders without the loop. The headless preview has several non-obvious gotchas (save loss on reload, Radix tabs ignoring synthetic clicks, the stale console buffer) that will mislead you if you don't know them. The full step-by-step recipe — onboarding the new-game wizard headlessly, the live error counter, extracting entity IDs via React fiber — is in:

**→ `references/preview-runtime.md`** (read it before driving the preview; it will save you from false negatives)

The single most important runtime technique: **verify "no loop" with a live error counter, not the console log buffer.** The preview's `preview_console_logs` accumulates errors across the whole session and is not cleared by `location.assign`, so it shows stale crashes from before your fix. Patch `console.error` in-page to count only errors generated _after_ you install it, then navigate via SPA and read the count. Zero = clean. (This exact confusion once made a working fix look broken.)

## Report honestly

State plainly what you verified and how, and distinguish:

- **Verified** — you ran it and observed the result (quote the evidence: test counts, the live error count, what rendered).
- **Wired & code-verified but not observed** — the code is correct and type-checks but you couldn't exercise it at runtime (e.g. a slow sim never reached the end state). Say so; don't imply you watched it.
- **Pre-existing vs introduced** — if you find a bug while verifying, check `git log -2 -- <file>` and whether your change touches its render path before blaming the change. Several "regressions" this codebase produces are pre-existing loops newly _reached_ by a routing change, not caused by it.

A faithful "this part works, this part is wired but I couldn't watch it run" beats a confident "all good" every time.
