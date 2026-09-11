# Cross-Cutting Audit Findings

## `as any` casts

| Location          | Count     | Notes                                                                                                                                                                                   |
| ----------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/tests/`      | 1,711     | Overwhelmingly in test files for mocking. Expected but could be tightened.                                                                                                              |
| `src/core/`       | 4         | All in `src/core/npc/intents/insuranceIntents.ts:71-74` — accesses `(horse as any).currentGrade` and `(horse as any).racing?.speed` (non-existent properties). **PR #393 fixes these.** |
| `src/components/` | 0         | Clean.                                                                                                                                                                                  |
| **Total**         | **1,715** | Production code is nearly `any`-free; tests are the bulk.                                                                                                                               |

## `as unknown as` double-casts

506 occurrences across `src/`. These are escape hatches that bypass type checking. Should be reviewed in Phase 4 for legitimate vs abusive usage.

## `console.*` calls

111 occurrences across `src/`. Need to verify which are in production code (should be removed or routed to a logger) vs test code (acceptable).

## Native `title=` attributes (Palette PR pattern)

164 occurrences across `src/`. These should be converted to the app's `Tooltip` component for consistent accessibility. The Palette PRs (#394, #388) address a few; the rest are candidates for a follow-up sweep.

## Native `confirm()` calls (Groom PR pattern)

2 occurrences in `src/components/`:

1. `src/components/routes/HorseDetail.tsx:149` — `confirm(\`Retire ${horse.name} to stud?...\`)` — **PR #385 fixes this** (replaces with AlertDialog).
2. `src/components/horse/HorseManagementSection.tsx:33` — `confirm(\`Geld ${horse.name}?...\`)` — **NOT covered by any PR.** Additional fix needed in Phase 4.

## `tsc-results.txt` tracked in git

`tsc-results.txt` is a build artifact (output of `bun run typecheck:errors`) that is **wrongly tracked** in git. It appears in 2 PR diffs (#395, #388) and should be untracked and gitignored.

## `.jules/` artifacts

11 of 16 open PRs commit `.jules/*.md` files. These are gitignored locally but the PRs add them. Must be stripped during cherry-pick integration. Per AGENTS.md: "`.jules/` artifacts must not enter `main`."

## TODO/FIXME/HACK markers

_(To be populated from subagent findings.)_
