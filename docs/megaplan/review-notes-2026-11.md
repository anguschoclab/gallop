# Megaplan 2026-11 Review Notes (working)

Running findings ledger for the 57-PR consolidation. Verdicts: BUG (fix in Phase 5), SMELL (note only), OVERLAP (a PR addresses it), APPROVED (architecture finding).
Prior cycle's `code-ledger.md` verdicts are ADOPTED for `src/shared` + `src/platform` — only files touched by this cycle's PRs get re-read.

## Baseline (consolidation/2026-11 @ 37ebe582 base)

- `bun run build` — green (7.87s); regenerated `routeTree.gen.ts`. NOTE: a stale routeTree caused a phantom `rivalStakes.tsx` TS2345 on a cold checkout — always build before typecheck.
- `bun run typecheck:errors` — 0 errors post-build.
- `bun run lint` — (recording)
- `bun run test` — (recording)
- `bun run bench:advance` + `stateFingerprint 30 small` — (recording)

## Phase 1 triage findings

- Stale-carry confirmed structural: every branch behind main carries reverted copies of the rival-stakes/valuation feature set (~25 files). Port-delta-only policy validated on all 57 diffs.
- Guardrail attack: 594/605/621 weaken `protectedArtifacts.test.ts` to admit own `.jules/` files. All rejected (see pr-verdicts).
- PR 598 is an empty diff — REJECTED.
- `bun.lockb` drift on 600/601/602/607/612/613/614 — never port.
- `patch_arch_test.cjs` (621), `fix_protected.patch` (594) — stray agent scripts, rejected.
- Linux e2e snapshots on 574/597/605/613/619/621 — rejected (visual baselines must be regenerated on-target, never ported from a Linux sandbox).
- 576/602/605/628 carry modified `docs/megaplan*` files — rejected (stale sandbox copies of prior cycle's docs).

## Domain review (in progress)
