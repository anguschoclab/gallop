# CI Merge Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make red gates impossible to merge — clean the current breakage, then add a CI workflow that blocks any PR where `tsc`, `lint`, or `vitest` fails.

**Architecture:** Two phases in strict order. First **make it green** (the gate is meaningless if `main` is already red — you'd be blocking everyone on day one). Then add a single GitHub Actions workflow running the three existing scripts on push/PR, plus an optional local pre-push hook so agent branches fail fast before they ever reach CI.

**Tech Stack:** GitHub Actions, Bun, existing `package.json` scripts (`test`, `lint`, `format`), `tsc`.

---

## Context

There is **no CI in this repo at all** — no `.github/workflows`, no husky, no pre-commit hooks. Nothing has ever stopped a broken merge. The measured cost, right now:

- `bunx tsc --noEmit` → **15 errors** (9 in `src/tests/components/ImperialOutpostManager.tierLabels.test.tsx`, 6 in `src/tests/components/DashboardWidgets.tooltip.test.tsx`)
- `bun run test` → **5 failing tests across 3 files** (of 4,367)
- `bun run lint` → **53 errors** (39 `prettier/prettier`, 13 `jsdoc/*`, **1 `no-restricted-syntax`**)

That last one matters most: [src/routes/facilities.tsx:16](src/routes/facilities.tsx) reintroduced an unstable `?? []` `useGame` selector — the render-loop bug class that crashed three pages earlier. The guardrail _caught_ it, but since nothing runs lint on merge, it shipped to `main` anyway as a live landmine.

This repo merges parallel agent branches faster than a human can review. Gates that are advisory get ignored; gates that block get respected. This plan converts the whole existing quality stack (4,367 tests, the ESLint guardrail, the real-store harness) from advisory to enforced.

**Outcome:** `main` is green, and a PR that breaks types, lint, or tests cannot merge.

---

## File Structure

**New files**

- `.github/workflows/ci.yml` — the gate.
- `scripts/verify.sh` — one command that runs all three gates locally (shared by devs, hooks, and CI).

**Modified files**

- `package.json` — add a `verify` script.
- `src/routes/facilities.tsx` — fix the guardrail violation.
- The three failing test files + whatever they cover.

---

## Conventions

- Run gates from repo root: `bunx tsc --noEmit`, `bun run test`, `bun run lint`.
- `bun run format` (prettier --write) auto-fixes the `prettier/prettier` class.
- `jsdoc/require-jsdoc` / `require-returns` errors mean an exported function in a `.ts` file needs a JSDoc block with `@param`/`@returns`.
- Do **not** weaken a rule to make the gate pass. If a rule is genuinely wrong, that's a separate discussion; the default is fix the code.

---

## Task 1: Fix the guardrail violation (the live bug)

**Files:** Modify `src/routes/facilities.tsx`

- [ ] **Step 1: See the violation**

Run: `bunx eslint src/routes/facilities.tsx`
Expected: `16:35 error Unstable useGame selector: '?? []' returns a new array each render… no-restricted-syntax`

- [ ] **Step 2: Fix it**

Line 16 has a `useGame((s) => s.<field> ?? [])`. Replace with the shallow-equality variant (safe for `?? []` because shallow comparison treats empty arrays as equal):

```tsx
// before:  const x = useGame((s) => s.someField ?? []);
const x = useGameWithShallow((s) => s.someField ?? []);
```

Ensure `useGameWithShallow` is in the import from `@/game/store`. (The alternative fix — a module-level `const EMPTY: T[] = []` returned from plain `useGame` — is equally correct; match whatever the file already does.)

- [ ] **Step 3: Verify the fix and that the page mounts**

```bash
bunx eslint src/routes/facilities.tsx   # expect clean
```

Then add a smoke case so it can't regress silently — in `src/tests/smoke/storeSubscription.smoke.test.tsx`, inside the existing describe block:

```tsx
it("Facilities route mounts without an update loop", async () => {
  const { Route } = await import("@/routes/facilities");
  const Cmp = (Route.options as { component: React.ComponentType }).component;
  expect(() => renderWithStore(createElement(Cmp))).not.toThrow();
});
```

Run: `bunx vitest run src/tests/smoke/storeSubscription.smoke.test.tsx` → expect PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/facilities.tsx src/tests/smoke/storeSubscription.smoke.test.tsx
git commit -m "fix(facilities): stabilize useGame selector (render-loop guardrail catch)"
```

---

## Task 2: Fix the 15 type errors

**Files:** `src/tests/components/ImperialOutpostManager.tierLabels.test.tsx`, `src/tests/components/DashboardWidgets.tooltip.test.tsx`

Both files were sitting modified-and-uncommitted for a long time; they've drifted from the components they test.

- [ ] **Step 1: See the errors**

Run: `bunx tsc --noEmit 2>&1 | grep -E "tierLabels|DashboardWidgets"`
Read each error. They will be one of: a prop/type that the component no longer accepts, a renamed export, or a mock whose shape no longer matches `GameState`.

- [ ] **Step 2: Fix the tests to match current component APIs**

Read the components under test (`src/components/facilities/ImperialOutpostManager.tsx` and the dashboard widgets) and update the test's props/mocks to the current signatures. Fix the _tests_, not the components — the components are what ship and are presumed correct unless a test failure proves otherwise (Task 3 will tell you).

- [ ] **Step 3: Verify**

Run: `bunx tsc --noEmit` → expect **0 errors**.

- [ ] **Step 4: Commit**

```bash
git add src/tests/components/
git commit -m "test: realign outpost/dashboard-widget tests with current component APIs"
```

---

## Task 3: Fix the 5 failing tests

**Files:** the three failing test files (and any product code they legitimately catch)

The failures:

1. `runHeadToHeadSimulation (Monte Carlo) > returns win percentages that sum to 1.0`
2. `startNewGame atomic save > calls saveGameStateToIDB with state including playerProfile`
   3-5. `ImperialOutpostManager` tooltip-accessibility and tier-label assertions

- [ ] **Step 1: Triage each — is the test stale, or did it catch a real bug?**

Run: `bun run test 2>&1 | grep -A15 "Failed Tests"`

For each, decide honestly:

- **Monte Carlo sum-to-1.0** — a probability invariant. If win percentages no longer sum to 1, that is very likely a **real bug** in the simulation (a normalization step lost during a merge), not a stale test. Trace `runHeadToHeadSimulation` and fix the normalization if so.
- **startNewGame atomic save / playerProfile** — the save path changed (there are recent commits touching persistence). Determine whether `playerProfile` genuinely stopped being persisted (a real save-integrity bug — fix the code) or the test asserts an outdated call shape (fix the test).
- **ImperialOutpostManager a11y/tier labels** — assertions about `aria-label` presence and not rendering raw tier strings. If the component regressed on accessibility, fix the component; these assertions encode real UI-quality rules.

Write down which of the five you classified as stale-test vs real-bug before editing anything — that judgement is the whole task.

- [ ] **Step 2: Apply the fixes**

One file at a time; run that file after each: `bunx vitest run <path>`.

- [ ] **Step 3: Verify the whole suite**

Run: `bun run test`
Expected: **0 failed**, ~4,367 passing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve 5 failing tests (sim normalization, save integrity, outpost a11y)"
```

---

## Task 4: Clear the remaining lint errors

- [ ] **Step 1: Auto-fix formatting**

```bash
bun run format
bun run lint 2>&1 | grep -c "prettier/prettier"   # expect 0
```

- [ ] **Step 2: Fix the JSDoc errors**

Run: `bun run lint 2>&1 | grep -B3 "jsdoc/"`
For each flagged exported function in a `.ts` file, add a JSDoc block with a one-line description plus `@param` for every parameter and `@returns` when it returns a value. Example shape:

```ts
/**
 * Short description of what it does.
 *
 * @param foo - what foo is
 * @returns what comes back
 */
```

- [ ] **Step 3: Verify**

Run: `bun run lint`
Expected: **0 errors** (warnings from `react-hooks`/`react-refresh` are pre-existing and acceptable — they do not fail the run).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: clear lint errors (format + jsdoc)"
```

---

## Task 5: A single `verify` entrypoint

**Files:** Create `scripts/verify.sh`; modify `package.json`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# scripts/verify.sh — the gate. Runs every check CI runs, in fail-fast order
# (cheapest and most-informative first) so a broken branch fails in seconds.
set -euo pipefail

echo "▶ typecheck"
bunx tsc --noEmit

echo "▶ lint"
bun run lint

echo "▶ tests"
bun run test

echo "✅ all gates green"
```

Make it executable: `chmod +x scripts/verify.sh`

- [ ] **Step 2: Add the script to package.json**

In `"scripts"`, add:

```json
    "verify": "bash scripts/verify.sh",
```

- [ ] **Step 3: Run it**

Run: `bun run verify`
Expected: all three sections pass, ending in `✅ all gates green`. If not, return to Tasks 1–4 — do not proceed to Task 6 with a red tree.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify.sh package.json
git commit -m "chore: add bun run verify (typecheck + lint + tests)"
```

---

## Task 6: The CI workflow

**Files:** Create `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

# Cancel superseded runs on the same branch — agent branches push frequently.
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Typecheck
        run: bunx tsc --noEmit

      - name: Lint
        run: bun run lint

      - name: Tests
        run: bun run test

      - name: Build
        run: bun run build
```

Each gate is a **separate step** (not the combined `verify` script) so the GitHub UI shows exactly which one failed without opening logs. `build` is included because it validates the generated `routeTree.gen.ts` — route changes that don't compile are caught here.

- [ ] **Step 2: Push and confirm the workflow runs green**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add merge gate (typecheck, lint, tests, build)"
git push
```

Open the Actions tab and confirm a green run on the branch.

- [ ] **Step 3: Make it actually block (the step that matters)**

A passing workflow that isn't required still lets red merge. In **GitHub → Settings → Branches → Branch protection rules** for `main`:

- Add rule → Require status checks to pass before merging → select **`verify`**.
- Enable "Require branches to be up to date before merging."

This is a repo-settings change, not code — if you lack admin access, hand this step to whoever does. **The plan is not complete until this is on**, because it's the only step that converts advisory into enforced.

- [ ] **Step 4: Prove it blocks**

Open a throwaway PR that intentionally breaks one gate (e.g. add `const x: number = "nope";` to any `.ts` file). Confirm CI goes red and the merge button is disabled. Close the PR without merging.

---

## Task 7 (optional but recommended): fail fast locally

Agent branches waste a CI round-trip on trivial breakage. A pre-push hook catches it in seconds.

- [ ] **Step 1: Add the hook**

```bash
mkdir -p .githooks
cat > .githooks/pre-push <<'EOF'
#!/usr/bin/env bash
echo "running verify before push (skip with --no-verify)"
bun run verify
EOF
chmod +x .githooks/pre-push
git config core.hooksPath .githooks
```

- [ ] **Step 2: Document it**

Add to `README.md` (or `CONTRIBUTING.md`): contributors run `git config core.hooksPath .githooks` once to enable, and `git push --no-verify` bypasses in a pinch. Note the hook is local-only — CI remains the real gate.

- [ ] **Step 3: Commit**

```bash
git add .githooks README.md
git commit -m "chore: optional pre-push verify hook"
```

---

## Verification (whole-plan)

- [ ] `bun run verify` → green locally (0 tsc errors, 0 lint errors, 0 failing tests).
- [ ] `bun run build` → succeeds; `routeTree.gen.ts` committed, not dirty.
- [ ] CI runs green on a PR.
- [ ] A deliberately-broken PR shows a red required check and a disabled merge button (Task 6 Step 4).
- [ ] `bunx eslint src/routes/facilities.tsx` → clean, and the Facilities smoke case passes.

## Self-review notes

- **Spec coverage:** Improvement #1 = "a merge-blocking CI gate: tsc && lint && vitest". Tasks 1–4 make green (prerequisite), 5–6 build and enforce the gate, 7 adds local fast-fail.
- **Ordering is load-bearing:** the gate must go on _after_ green, or the first PR to touch anything is blocked by pre-existing breakage and the team disables the gate.
- **Judgement call flagged explicitly:** Task 3 Step 1 requires classifying each failure as stale-test vs real-bug rather than blanket-updating snapshots — the Monte Carlo sum-to-1.0 failure in particular looks like a genuine normalization regression.
- **No placeholders:** the workflow, script, hook, and smoke case are complete and runnable.
