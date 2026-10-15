# Consolidation Baseline V5

**Date:** 2026-10-15 · **Auditor:** Devin · **Base:** `main` @ `438fc7a9` · **Branch:** `consolidation/integration-v5`

## Gate results — clean main (pre-repair)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `bun run typecheck:errors` | **0 errors, 0 warnings** |
| Lint | `bun run lint` | **10 errors** — 1 real layering violation (`NotificationSettingsCard.tsx` → `@/core/settings/settingsTypes` direct import), 9 prettier-fixable across `useRivalCareerFilters.ts`, `rankings-history.tsx`, `rankingsHistory.test.ts`, `npcMilestoneAlerts.test.ts`, `useRivalCareerFilters.test.ts` |
| Architecture | `bunx vitest run src/tests/architecture/` | **1 failure** — `namingConventions`: `routes/rankings-history.tsx` kebab-case not in baseline (route added post-V4 without baseline regen) |
| Build | `bun run build` | not yet run at baseline point |
| Full test suite | `bun run test` | **deferred** — user instruction: skip slow suite this session, run ad hoc later |

## Baseline repair — commit `59bbfa8c`

| Item | Fix | Verdict |
|---|---|---|
| `NotificationSettingsCard` layering violation | New `src/services/settings/settingsFacade.ts` (`NotificationSettings` + `RivalMilestoneAlertSettings` type re-exports); component import rerouted | FIXED — non-behavioral, exempt from test-first per invariant |
| `rankings-history.tsx` missing from naming baseline | `bun scripts/generate-naming-baseline.ts` → 46 violations total (+1) | FIXED — kebab-case routes are the baseline'd convention (V4 BUG-V4-003 precedent) |
| 9 prettier errors | `prettier --write` on 5 files | FIXED |

## Post-repair gates

| Gate | Result |
|---|---|
| Typecheck | 0 errors, 0 warnings |
| Lint | 0 errors, 0 warnings |
| Architecture (4 suites) | 22/22 pass |
| Build | clean (nitro + cloudflare) |

## Main delta since V4 merge (`5b58d707..438fc7a9`)

~30 commits — user feature work: rankings-history route + `recordRankingsHistory` (market), price alerts & filters (`alert prefs`), stable campaign page, plan effectiveness scoring, jockey stamina refactor (bonus/penalty stored on runner for next-tick application), inline editing + search params, milestone→record linking, `structuredClone` for test deep-clones, JSDoc + facade exports, prettier sweep, gelding-eligibility award fix (`438fc7a9`, itself the completion of a V4 residual audit item).

## Inventory snapshot

- `src/` ≈ 2,343 files, ~389k LOC, 885 test files
- 40 open PRs (#510–#549; #549 arrived during Phase-0 fetch), 40 remote PR branches
- ~500 closed PRs to re-audit (Phase 3)
- CI gate (`ci.yml`): bun install → router-cli generate → tsc → lint → test → build
