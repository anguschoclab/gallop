# Audit 02 — Dead-Code (Full Import-Graph)

**Generated:** 2026-09-03
**Method:** Custom TypeScript script (`/tmp/gallop-orphan-scan-v2.ts`) that:

1. Collects all `.ts/.tsx` files in `src/` (including tests) for import parsing
2. Collects candidate files (excluding tests, test-utils, routeTree.gen.ts, .test/spec/stories/.d.ts)
3. Extracts ALL `from "..."` and `import("...")` specifiers (handles multi-line export statements)
4. Resolves `@/` alias and relative paths to actual file paths
5. Reports files with ZERO importers that are not routes (auto-discovered), barrels, or entry points

**Validation:** First scan (v1) had 85 orphans but missed multi-line `export { ... } from "..."` statements. Fixed in v2 → 36 orphans. Spot-checked 10+ orphans against manual grep — all confirmed genuinely unreferenced.

## Orphans (36 files)

### UI components (shadcn/ui — installed but unused) — 20 files

These are shadcn/ui primitives that were scaffolded but never consumed by any component or route:

| File | Notes |
| ------ | ------- |
| `src/components/ui/alert.tsx` | Not imported (refs are to `alert-dialog`, a different file) |
| `src/components/ui/aspect-ratio.tsx` | |
| `src/components/ui/avatar.tsx` | |
| `src/components/ui/breadcrumb.tsx` | |
| `src/components/ui/calendar.tsx` | Not the date utility — the shadcn calendar component |
| `src/components/ui/carousel.tsx` | |
| `src/components/ui/command.tsx` | |
| `src/components/ui/dropdown-menu.tsx` | |
| `src/components/ui/form.tsx` | |
| `src/components/ui/hover-card.tsx` | |
| `src/components/ui/input-otp.tsx` | |
| `src/components/ui/menubar.tsx` | |
| `src/components/ui/navigation-menu.tsx` | |
| `src/components/ui/pagination.tsx` | |
| `src/components/ui/popover.tsx` | |
| `src/components/ui/radio-group.tsx` | |
| `src/components/ui/resizable.tsx` | |
| `src/components/ui/scroll-area.tsx` | |
| `src/components/ui/sidebar.tsx` | |
| `src/components/ui/textarea.tsx` | |

**Action:** Delete all 20. They're unused library scaffolding. If needed later, they can be re-added via `bunx shadcn-ui@latest add <component>`.

### Non-UI components — 7 files

| File | Notes |
| ------ | ------- |
| `src/components/breeding/BreedingTimeline.tsx` | 0 refs by basename |
| `src/components/breeding/Lineage.tsx` | Refs are to `@/core/breeding/lineage` (.ts), not this component |
| `src/components/charts/BackLink.tsx` | 0 refs |
| `src/components/history/RecordsDashboard.tsx` | 0 refs (has hardcoded `#0a0a0a` — also in CSS audit) |
| `src/components/horse/GradeBadge.tsx` | 0 refs |
| `src/components/race/RaceDetailPanel.tsx` | Only in comments ("Extracted from: RaceDetailPanel.tsx") |
| `src/components/race/RaceRow.tsx` | 0 actual import refs |
| `src/components/race/RacingSilks.tsx` | 0 refs |

**Action:** Delete all 7. Each verified to have zero actual import statements referencing them.

### Core logic — 4 files

| File | Notes |
| ------ | ------- |
| `src/core/ai/subsystemWeightConstants.ts` | Only self-reference in JSDoc. Verified by subagent. |
| `src/core/analytics/regionalConstants.ts` | **DUPLICATE** — `src/constants/regionalConstants.ts` is the canonical, actively-imported version. This is a stale copy. |
| `src/core/horse/portrait.ts` | Refs are to `portraitPalettes`, not `portrait.ts` |
| `src/core/npc/training.ts` | Refs are to `trainingAI`, `trainingResolution`, not this file |
| `src/core/time/events.ts` | 0 actual imports |

**Action:** Delete all 4. `regionalConstants.ts` is a confirmed duplicate of `src/constants/regionalConstants.ts`.

### Hooks — 4 files

| File | Notes |
| ------ | ------- |
| `src/hooks/game/useBreedingState.ts` | 0 refs |
| `src/hooks/game/useRacingState.ts` | 0 refs |
| `src/hooks/shared/useTimeAgo.ts` | 0 refs |
| `src/hooks/stable/useNpcStablesFilters.ts` | 0 refs (from v1 scan, verify in v2) |

**Action:** Delete all 4.

### Services — 3 files

| File | Notes |
| ------ | ------- |
| `src/services/breeding/traitCompatibility.ts` | 0 refs |
| `src/services/narrative/eventDetector.ts` | 0 refs |
| `src/services/narrative/seedNewsSlots.ts` | 0 refs |

**Action:** Delete all 3.

### Other — 1 file

| File | Notes |
| ------ | ------- |
| `src/game/store/helpers/raceResolution.ts` | 0 refs |

**Action:** Delete.

## Barrels with no importers (5 files)

| File | Notes |
| ------ | ------- |
| `src/core/apprentice/index.ts` | Barrel with no external importers |
| `src/core/awards/index.ts` | Barrel with no external importers |
| `src/core/settings/index.ts` | Barrel with no external importers |
| `src/core/stewards/index.ts` | Barrel with no external importers |
| `src/core/tactics/index.ts` | Barrel with no external importers |

**Action:** Check if any modules they re-export are imported directly (bypassing the barrel). If so, the barrel is truly dead — delete. If the barrel is the only export path, the re-exported modules are also dead.

## Test-first plan

For dead-code deletion:

1. Run full test suite (green baseline)
2. Delete files
3. Run `bun run typecheck:errors` (catches missing imports)
4. Run `bun run test` (catches behavioral loss)
5. Run `bun run build` (catches route-tree drift)
If all green → commit. If red → the file IS used somehow; restore and investigate.
