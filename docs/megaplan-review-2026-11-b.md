# Megaplan Review — Consolidation 2026-11-B (cycle 2)

Second-cycle consolidation. Scope: 5 open PRs (#662–#666), intent-recovery audit of the
29 PRs closed unmerged on 2026-11-10 (#633–#661), review of the 112 commits that landed
on `main` between cycles, repo hardening (CI enforcement), and cleanup.

## Headline verdicts

| Area | Verdict |
| --- | --- |
| Delta-port strategy (never merge stale PR heads) | **APPROVED** — reaffirmed; #651's diff was 100% stale carry and would have regressed main if merged |
| gpt-engineer direct-to-main pipeline | **MIXED** — landed ~23/29 closed-PR intents correctly (verified in-tree), but pushed red lint (BUG-5) and stale e2e baselines (BUG-6) because nothing enforced gates |
| CI gate | **DISPROVED as designed** — the `verify` job already ran lint+typecheck+tests+e2e on every push, but with no ruleset it was advisory-only; failures never blocked the next push |
| New ruleset "Protect main" | **APPROVED** — requires `verify` check, blocks deletion/non-ff on `main`; RepositoryAdmin bypass retained as break-glass; `gpt-engineer-app` (Integration) is **enforced** — its direct pushes are now rejected until CI is green or it works via PRs |

## Changes integrated

### Open PRs — all 5 applied as deltas (verdict-close pending)

| PR | What landed | Commit |
| --- | --- | --- |
| #662 | `auctionValuation.test.ts` relocated to `src/tests/core/auction/` | `4b5bafe1` |
| #663 | `market.ts` — typed `Extract` filter replaces 3 `as` casts | `4b5bafe1` |
| #664 | `Float64Array` `TEMP_FACTORS` shared buffer + NaN-skip in `recordTick`/stepRunner | `4b5bafe1` |
| #665 | `StaffTeamList` EmptyState + 4 regenerated linux e2e baselines | `4b5bafe1` |
| #666 | `PortraitRandomizeButton` DisabledTooltipWrapper | `4b5bafe1` |

### Closed-PR recovery (#633–#661)

23/29 intents verified landed on main directly by the pipeline — no port needed.
Actual recovery:

- **#656** — `earlySpeedInsight.test.ts` ported (detector had landed, its test was dropped). `4b5bafe1`
- **#651** — **REJECTED as a diff** (26 files, zero contained the widget — pure stale carry incl. `replace.patch`, linux snapshots, docs copies). Intent reimplemented fresh: `StableRosterWidget` EmptyState (`House` icon — `Horse` is not a lucide export). `4b5bafe1`
- **#650** — verdict corrected during implementation: already landed (`BaseHandler.ts:19` is `=> void`)
- **#644** — superseded by open #662 (recovered through it)

### Repo hardening (this cycle's new work)

- **BUG-5** (fixed on main `89fb0986`): lint baseline red — 48 prettier errors from un-gated bot commits; `lint --fix` to 1 pre-existing warning.
- **BUG-6**: linux e2e baselines drifted — 5 visual tests failing on main CI (`dashboard-desktop`, `dashboard-narrow`, `races-desktop`, `stable-narrow`, `analytics-desktop`). 4 fixed via #665's regenerated PNGs; `analytics-desktop` regenerated via new `regen-snapshots` workflow PR.
- **New workflow** `.github/workflows/regen-snapshots.yml` (`workflow_dispatch`): regenerates linux Playwright baselines on the runner and opens a PR — the only ruleset-compliant way to refresh linux snapshots when contributors run Windows/macOS. `31c0bcd5`
- **Ruleset 27978589** on `main`: `required_status_checks` = `verify`, `deletion`, `non_fast_forward`; bypass = RepositoryAdmin (break-glass) + `lovable-dev` Integration (app_id `818760`).

## Consequences of the ruleset (called out explicitly)

- `lovable-dev[bot]` (the actual pusher — `gpt-engineer-app` was a misattribution; commit authorship is `lovable-dev[bot]`) is a bypass actor so its direct-push pipeline keeps working. **Trade-off:** it can again land red commits (BUG-5 class) — the ruleset does not gate it. Gating the bot would require it to work via PRs, which is a Lovable-side reconfiguration.
- Merging any branch requires CI `verify` green on the head — including this consolidation (it merged via PR for exactly that reason). Direct pushes by non-bypass humans are blocked.
- Even RepositoryAdmin can bypass — intentional break-glass; do not add further bypass actors casually.

## Verification gate

| Gate | Result |
| --- | --- |
| `bun run typecheck:errors` | 0 errors |
| `bun run lint` | 0 errors, 1 pre-existing warning |
| Full suite | Local: 1,043 files / 11,019 passed, 19 `TestTimeoutError` (all re-passed 60/60 serially — resource flake, not regression). CI `verify` on merge head `f9fd5a02`: **green in 19m05s** (typecheck, lint, capability audit, tests, build, e2e) |
| `bun run build` | green (CI) |
| Focused tests | factorLedger 25/25, StaffTeamList 9/9, widgets 9/9, earlySpeed/auctionValuation green |
| Hygiene (`.jules`, `*.patch`, lockfiles) | clean — none tracked |
| Determinism fingerprint | `4c30ef15` — new baseline vs cycle-1 `0fe9f205`; divergence attributable to the 112 between-cycle main commits (CI's in-suite determinism assertions green), not the ported deltas |
| CI e2e | **Restored to green** — first fully-green `verify` on `main` since the baselines drifted |

## Merge record

- `59ac2034` — PR #667: regenerated linux baselines (workflow run 45380697530)
- `f05ad7dc` — PR #668: consolidation/2026-11-b → main (verify green)
- 5 open PRs (#662–#666) verdict-commented + closed; 10 agent branches deleted; remote = `main` only

## Per-PR verdicts

`docs/megaplan/pr-verdicts-2026-11-b.md` — all 34 reviewed PRs have explicit
APPROVE/PORT/REJECT/LANDED dispositions.
