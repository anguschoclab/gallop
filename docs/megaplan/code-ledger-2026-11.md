# Megaplan 2026-11 Code Ledger

Per-file review ledger. Verdicts: `clean` / `fixed:<id>` / `noted:<smell>` / `generated` / `data` / `asset` / `adopted:<prior>`.

## Adopted from prior cycle (docs/megaplan/code-ledger.md)

- `src/shared` — COMPLETE, adopted. (`Brand<T,_B>=T` structural — Anvil-style cast PRs are cosmetic-only.)
- `src/platform` — engine/time/persistence COMPLETE, adopted. Re-read only files in this cycle's PR scope: `platform/resolver/handlers/*` (Mason), `platform/time/phases/*` (stale-carry only — no intent).
- Prior BUG-1/2/3 verified fixed on current main.

## Expected-red catalogue (Phase 3 test-first)

Tests written in Phase 3 that MUST fail until their implementation batch lands. Premature-green = intent already covered → re-triage.

| Test file / case | Encodes | Batch |
| --- | --- | --- |
| (populated in Phase 3) | | |

## Files reviewed this cycle
