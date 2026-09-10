# Audit: Economy & Financials (Subsystem F)

**Scope:** `src/core/financial/`, `src/core/transactions/`, `src/core/transportation/`, `src/core/expenses/`, `src/core/prestige/`, `src/core/reputation/`

## AGENTS.md cross-check: `calculateNetCashFlow`

**CONFIRMED CORRECT** — `src/core/transactions/transactionTypes.ts:171-173` subtracts expenses:
```ts
export function calculateNetCashFlow(transactions: Transaction[]): number {
  return calculateTotalIncome(transactions) - calculateTotalExpenses(transactions);
}
```

## Cross-cutting checks

| Pattern | Hits |
|---------|------|
| `as any` | 0 |
| `as unknown as` | 0 |
| `console.*` | 0 |
| TODO/FIXME | 0 |

## Files requiring action

### FIX: `src/core/transportation/transportationTypes.ts:111-115`
`getTransportModeForDistance` has a gap: distances > 5,000 miles fall through to `road` (should select `air`):
```ts
if (distance >= 200 && distance <= 5000) return "air";
if (distance >= 50 && distance <= 2000) return "rail";
return "road";
```
Fix: change `distance <= 5000` to `distance > 200` for air, or add explicit handling for >5000.

### REFACTOR: `src/core/prestige/strategyPrestigeHelpers.ts`
- l.12: `PrestigeTier` redefined locally, shadows `prestigeTypes.ts` version — confusing.
- l.67: `race as { track?: string }` structural cast — hides real `Race` shape.

## Files: KEEP (with notes)

- `src/core/financial/reportBuilder.ts:149` — `weeklyHistory: []` is dead placeholder ("Phase 2")
- `src/core/financial/reportBuilder.ts` — `other_income`/`other_expense` not handled in switch (categorization gap)
- `src/core/transactions/transactionTypes.ts` — `Transaction.amount` has no sign convention; expenses must be stored as positive (convention fragility)
- `src/core/expenses/expenseTypes.ts:26-27` — `entry_fees`/`jockey_fees` (plural) vs `TransactionSubcategory` `entry_fee`/`jockey_fee` (singular) — naming mismatch
- `src/core/prestige/playerPrestige.ts:131-134` — `houseRank`/`courseRank` no tie-breaker
- `src/core/prestige/racecoursePrestige.ts:29` — module-level mutable cache, no reset for tests
- `src/core/prestige/prestigeTypes.ts:16` — `MIN_FAME_GAIN` declared but unused
- `src/core/reputation/reputationGating.ts:49,71,94` — returns current tier as `requiredTier` when gate absent (misleading UI label)
- `src/core/reputation/reputationTypes.ts:147-176` — `calculateRaceLossReputation` no input validation for `position > fieldSize`

## PR #386 note
The `expenseTypes.test.ts` file from PR #386 was NOT found in the working tree (on main). It only exists on the PR branch. This is expected — it's a new test file the PR adds.
