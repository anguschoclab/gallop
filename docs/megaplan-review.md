# Gallop Megaplan — Exhaustive Review & Branch Consolidation Findings

Executed on `main`. Scope: post-relocation codebase verification, all 21 open PRs
(#551–#572 excl. #562), 343 closed-unmerged PR clusters, test-first ports, bug
fixes, and branch/PR cleanup.

## Baseline vs final metrics

| Metric | Baseline | Final |
| --- | --- | --- |
| TypeScript | 0 errors, 0 warnings | 0 errors, 0 warnings |
| ESLint | clean (0 problems) | clean (0 problems) |
| `crossPhaseDataFlow` | green (post-relocation repair) | green |
| `bun run build` | — | green |
| stateFingerprint (30d, small) | `a694f5e7` @ f78bd94b | `a694f5e7` @ HEAD — identical, determinism preserved |
| Focused test files run | — | horse suite 528 tests green; component/resolver/time subsets green |

Note: an earlier baseline reading (`2180ff13`) used different script arguments and
is not comparable; the worktree re-run at the pre-work commit under identical
arguments produced `a694f5e7`, matching HEAD — proof the ports/fixes do not perturb
30-day simulation. The hallOfFame fix only fires on year-boundary days (day 365+),
outside this window, by design.

## Bugs fixed (approve/disprove verdicts)

| ID | Finding | Verdict | Fix |
| --- | --- | --- | --- |
| BUG-1 | `generateUUIDWithValidation` — dead code, CJS `require()` in ESM/browser path | **CONFIRMED** | Function deleted; `uuidRegistry` infra + tests retained |
| BUG-2 | `npcCompression` drops energy/fitness/fatigue/form/peakingIndex/recoveryPoints on save→load | **CONFIRMED** | `NpcHorseSummary` extended; fields persisted and restored on regeneration |
| BUG-3 | `hallOfFame` `inductionYear` off-by-one on year boundaries (`floor(d/365)+1` vs canonical `floor((d-1)/365)+1`) | **CONFIRMED** | Canonical formula applied |
| — | `jockeyPhase` renewal hardcodes `+90` while hires use `JOCKEY_CONTRACT_DAYS` | **CONFIRMED (latent)** | Constant substituted (values equal today; prevents drift) |

## Documented smells (not fixed — bounded or intentional)

- `raceEntryResolution` transport `cash_change` uses `entityId: ""` — escapes
  solvency projection's `entityId === "player"` filter. Low impact (fees small).
- `npcBankruptcy` mutates `context.state` fields directly — works because
  `buildContext` shallow-copies; inconsistent with immutable convention.
- `stewardsPhase` picks inquiry outcome uniformly (1/5) — merit-blind.
- `checksum.ts` EXCLUDED_KEYS lacks `engineGeneration` — only affects
  post-restart comparisons; fingerprint runs are always gen-0. (`engineRevision`
  IS excluded — the original hypothesis was partially disproved.)
- Docstring drift: many headers cite pre-relocation paths. Cosmetic.
- `shared/common/uiTokens.ts` type-only domain imports — exempt from layering
  rules but shared vocabulary isn't fully self-contained.
- `Brand<T,B> = T` structural aliases give zero nominal protection — documented
  as intentional; `as*` casts are cosmetic.

## Open-PR verdicts (#551–#572 excl. #562)

| PR | Title | Verdict | Outcome |
| --- | --- | --- | --- |
| #551 | Distance Change Specialist | **APPROVED** | Ported — `detectDistanceChange`, Stretch-Out/Cutback |
| #552 | Foal milestone tests | **APPROVED (coverage)** | Ported to `tests/core/race/foalMilestoneActions.test.ts` |
| #553 | Enriched race context commentary | **APPROVED** | Template expansion ported |
| #554 | Deduplicate handler logic | **SUPERSEDED** | By #568 (same change, current-layer form) |
| #555 | `getG1WinsForJockey` tests | **APPROVED (coverage)** | Appended to `connectionTrophies.test.ts` |
| #556 | Auction sale confirmation | **APPROVED** | AlertDialog ported; RED→GREEN test |
| #557 | `getDynamicProfile` spread removal | **APPROVED** | Hot-path optimization ported |
| #558 | `regions.ts` tests | **APPROVED (coverage)** | Ported |
| #559 | PrivateTrial DisabledTooltipWrapper | **APPROVED** | Ported |
| #560 | LEAD_CHANGE/SURGE commentary | **APPROVED** | Template expansion ported |
| #561 | Standardize Diplomacy/Inbox handlers | **SUPERSEDED** | By #568 |
| #563 | Drop branded-ID casts | **APPROVED** | Ported |
| #564 | `houseQuotes` tests | **APPROVED (coverage)** | Ported |
| #565 | Atmosphere commentary templates | **APPROVED** | Template expansion ported |
| #566 | Earnings-per-Start insight + CI | **MERGED + APPROVED** | Detector merged into tiered `detectEarningsPerStart` with #569; CI fixture step + linux snapshots ported |
| #567 | ARIA label — Exchange return | **APPROVED** | Ported |
| #568 | Standardized handler routing | **APPROVED** | The canonical version; ported |
| #569 | Earnings Yield insight | **MERGED** | Tiered thresholds merged with #566 into one detector (verbatim ports were mutually exclusive — first-match-wins + overlapping ranges) |
| #570 | O(N) `topLot` | **APPROVED** | Ported |
| #571 | Attachment evaluation tests | **APPROVED (coverage)** | Ported to `tests/core/horse/attachment.test.ts` |
| #572 | aria-labels on raw inputs | **APPROVED** | Ported (DebtBanner, TransactionLedger) |

## #566 vs #569 merge rationale

Both add an earnings-per-start detector; a registry is first-match-wins so only
one could live. PRs #569 (Rainmaker ≥$100k, Prize Fighter ≥$25k, ≥5 starts) and
#566 (Lucrative Career ≥$50k, Money Pit <$1.5k with ≥10 starts) have compatible
thresholds — merged into a single tiered detector:
Rainmaker ≥$100k → Lucrative Career ≥$50k → Prize Fighter ≥$25k → Money Pit
<$1.5k & ≥10 starts. All four labels reachable.

## Closed-PR clusters (343)

Clustered by bot-role/intent. Verdicts:

- **Bolt `buildFieldContext` optimizations** — DISPROVED for port: already
  imperative on `main` (superseded by earlier merges).
- **#130 race-map synchronization** — DISPROVED: obsolete post-Record migration.
- **Mason/Bolt/Probe duplicate clusters** — REJECTED: overlap existing code or
  target removed `src/core/*` paths.
- **`.jules/*`, `test-results/`, `playwright-report/` artifacts in PR branches** —
  REJECTED everywhere: gitignored by policy, never ported.
- Remaining closed PRs were individually triaged by diff; none contained unique
  correct changes absent from `main` or the open-PR set.

## RED/COVERAGE ledger

| Item | Status |
| --- | --- |
| AuctionHouseDesk confirmation | RED→GREEN (dialog missing pre-impl) |
| hallOfFame off-by-one | RED→GREEN |
| npcCompression condition round-trip | RED→GREEN |
| insightDistanceChange | RED→GREEN |
| detectEarningsPerStart (merged) | RED→GREEN |
| attachment, houseQuotes, connectionTrophies, foalMilestoneActions, regions | COVERAGE (green on first run) |
| Diplomacy/Inbox refactor | characterization tests green before+after |
| getDynamicProfile / topLot / cast removal | behavior-preserving; suite green |

## Residual risks

- `stewardsPhase` uniform outcome selection remains merit-blind (documented).
- `npcBankruptcy` direct `context.state` mutation remains (functional, flagged).
- Full suite (~8.5k tests) deferred per instructions — run ad hoc later.
- Docstring path drift is cosmetic debt; a codemod would touch many files.

## Branch/PR cleanup

All open PRs closed with verdict comments; remote branches deleted; local
`campaign/megaplan-atomic` deleted. See git log / `gh pr list` for final state.
