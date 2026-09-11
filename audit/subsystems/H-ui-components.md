# Audit: UI Components — PR-touched & Failing-test (Subsystem H)

**Scope:** 8 component files + their test files

## Verdicts at a glance

| File                        | Verdict | Main reason                                                      |
| --------------------------- | ------- | ---------------------------------------------------------------- |
| `DefaultErrorComponent.tsx` | FIX     | `error: Error` instead of `unknown` (TanStack contract)          |
| `HQOpsWidget.tsx`           | FIX     | Accesses non-existent `Facility.rank`, uses `[string, any]` cast |
| `LiveAnnualTimeline.tsx`    | FIX     | Native `title` instead of Tooltip/aria-label                     |
| `HorseDetail.tsx`           | FIX     | Native `confirm()` instead of AlertDialog                        |
| `ReplaysLibrary.tsx`        | FIX     | Missing a11y labels, roles, attributes                           |
| `RivalIntelTab.tsx`         | KEEP    | Correct `playerDominance`/`type` per AGENTS.md                   |
| `HorseConditionSection.tsx` | FIX     | TanStack `<Link>` crashes outside RouterProvider — 8 tests fail  |
| `HorseBenchmarkDialog.tsx`  | KEEP    | Component sound; 3 test failures are brittle tests               |

## Detailed findings

### FIX: `DefaultErrorComponent.tsx:3`

Current: `{ error: Error; reset: () => void }` — TanStack's `ErrorComponentProps` types `error` as `unknown`. `error.message` at l.31-34 is unsafe.
**PR #397 has the best fix** (canonical version).

### FIX: `HQOpsWidget.tsx:61,70`

- l.61: `[key, f]: [string, any]` — explicit any cast
- l.70: `f?.rank ?? 1` — `Facility` has no `rank` field (only `level`). **Every facility always renders "LVL 1".**
  **PR #382 fixes this** (maps `Facility.level` to rank).

### FIX: `LiveAnnualTimeline.tsx:219,238-240,330`

Native `title` attributes instead of Tooltip. Filter buttons (l.155-188) lack `aria-pressed`.
**PR #394 fixes the remove button.** Additional fixes needed for other title attrs and filter buttons.

### FIX: `HorseDetail.tsx:149`

`confirm(\`Retire ${horse.name} to stud?...\`)`— native confirm, blocks UI thread.
**PR #385 fixes this.** Note:`HorseManagementSection.tsx:33`has another`confirm()` not covered by any PR.

### FIX: `ReplaysLibrary.tsx:46-67,105`

- Search input (l.46-52): no `<label>` or `aria-label`
- Filter buttons (l.55-67): no `aria-pressed`, active state not conveyed
- ReplayCard Links (l.105): no `aria-label`
- Decorative icons not `aria-hidden`
  **PR #388 fixes these (but also introduces `as any` in priceAlerts — reject that hunk).**

### KEEP: `RivalIntelTab.tsx`

Verified: uses `playerDominance` (l.279) and `type` (l.313) — correct per AGENTS.md. The `playerStrength`/`action` bug is already fixed.
Smells: `as NpcAIManager` cast (l.24), `new Map` every render (l.26), `d.level as DistressLevel` (l.233), `s.strategicDirectives!` (l.297).

### FIX: `HorseConditionSection.tsx:20-25`

**Root cause of 8 failing tests:** TanStack `<Link to="/vet">` calls `useRouter()` which throws outside a RouterProvider. The test harness `renderWithStore` doesn't wrap in RouterProvider. All 8 tests crash before assertions.
**Fix:** Replace `<Link>` with plain `<a href="/vet">` or a router-agnostic wrapper.

### KEEP: `HorseBenchmarkDialog.tsx`

Component is sound. 3 test failures are brittle tests:

- l.80: `expect(screen.getByText("All (15)"))` — hard-coded dataset size
- l.128-137: hard-coded horse names (`Black Caviar`, `Secretariat`)
- Incomplete Race mocks held together with `as Race`
- No cleanup between renders
  **Fix:** Mock the benchmark dataset, add cleanup, loosen assertions.
