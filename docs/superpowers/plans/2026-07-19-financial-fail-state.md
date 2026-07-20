# Financial Pressure & Fail State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player something to lose. Debt now has consequences — creditor warnings, then forced horse sales, and finally a dignified "legacy epilogue" game over — so every breeding, training, and race-entry decision carries weight.

**Architecture:** One new pipeline phase (`solvency`) that runs right after `upkeep`, reading player cash and emitting escalating consequences through the existing intent/impact resolver. A pure `deriveSolvencyState(cash, thresholds)` decides the tier (healthy → warning → forced-sale → insolvent), so the rules are unit-testable without running the sim. Forced sales reuse the existing valuation helpers; the epilogue reuses the Hall of Fame as the ending screen.

**Tech Stack:** The time pipeline (`PipelinePhase`), the resolver's impact system, `src/core/horse/pricing.ts`, Zustand store, React 19 + TanStack Router, Vitest.

---

## Context

Right now **the player cannot lose.** The upkeep phase ([src/core/time/phases/upkeep.ts](src/core/time/phases/upkeep.ts)) charges $50/horse/day plus staff salaries and facility maintenance, and emits `cash_change` impacts — but nothing checks the player's balance afterward. Cash can sit at negative infinity forever with no consequence.

The irony is that the _NPCs_ already have this modeled: [upkeep.ts:143](src/core/time/phases/upkeep.ts) defines `BANKRUPTCY_THRESHOLD = -10000`, `BANKRUPTCY_INJECTION = 50000`, and a 365-day cooldown, so rival stables get bailed out and keep competing. The player gets neither the bailout nor the consequence.

Why this matters more than it sounds: the game has extraordinary simulation depth (genetics, dosage, Beyer figures, a graded stakes ladder) and, since recent work, real legibility — but **no stakes**. A sandbox where the downside is zero makes every decision weightless: there is no reason to prefer a sound cheap horse over an unsound expensive one, no cost to over-breeding, no tension in a claiming race. Consequence is what converts a simulator into a game.

**Design stance — pressure, not punishment.** The point is to make choices matter, not to delete saves. So: escalate visibly with plenty of warning, always give the player agency (sell something yourself before creditors choose), and make the ending a _legacy retrospective_ rather than a failure screen. A player who loses should want to start a new stable immediately.

**Outcome:** Debt has teeth, the player is warned before it bites, and the run can end in a way that feels like the close of a story.

---

## The escalation ladder

| Tier          | Trigger (player cash)                                | Consequence                                                                                           |
| ------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `healthy`     | ≥ 0                                                  | none                                                                                                  |
| `warning`     | < 0                                                  | inbox letter from the bank; dashboard shows a debt banner. Interest begins accruing daily.            |
| `forced_sale` | ≤ −$25,000 for 7 consecutive days                    | creditors sell the single most valuable non-foal horse at ~70% of value; inbox notice names the horse |
| `insolvent`   | ≤ −$100,000, or a forced sale with no sellable horse | run ends → legacy epilogue                                                                            |

Thresholds live in `src/constants/gameConstants.ts` so they're tunable without touching logic. The consecutive-day requirement on `forced_sale` prevents a single expensive stud fee from instantly costing a horse.

---

## File Structure

**New files**

- `src/core/financial/solvency.ts` — thresholds, `SolvencyTier`, pure `deriveSolvencyState()` and `selectForcedSaleHorse()`.
- `src/core/time/phases/solvency.ts` — the pipeline phase.
- `src/components/dashboard/DebtBanner.tsx` — persistent warning on the dashboard.
- `src/routes/epilogue.tsx` — the legacy retrospective / game-over screen.
- Tests: `src/tests/core/financial/solvency.test.ts`.

**Modified files**

- `src/constants/gameConstants.ts` — thresholds + `PHASE_ORDER_SOLVENCY`.
- `src/core/time/phases/index.ts` — register the phase.
- `src/game/store/slices/` — persist `solvency` progress (days in debt, run-ended flag).
- `src/routes/index.tsx` — render `DebtBanner` when in debt.
- `src/core/dashboard/nextAction.ts` — a debt state outranks routine suggestions.

**Reused as-is:** `horsePrice` / `calculateBaseHorseValue` ([src/core/horse/pricing.ts](src/core/horse/pricing.ts)), the inbox system, the Hall of Fame data for the epilogue, the `cash_change` impact type.

---

## Conventions

- Phases implement `PipelinePhase { name, order, execute(ctx) }` and are registered in `src/core/time/phases/index.ts`; order constants live in `@/constants` as `PHASE_ORDER_*`. Model the new phase on `src/core/time/phases/awards.ts`.
- Phases must **not** mutate state directly — emit impacts onto `context.impacts` and let the resolver apply them, exactly as `upkeep.ts` does with `cash_change`.
- Determinism matters: use `context.dailyRng` for anything random. Forced-sale selection below is deliberately deterministic (highest value first) so tests and replays are stable.
- Run one test: `bunx vitest run <path>`.

---

## Task 1: Solvency rules (pure)

**Files:** Create `src/core/financial/solvency.ts`; test `src/tests/core/financial/solvency.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/core/financial/solvency.test.ts
import { describe, it, expect } from "vitest";
import {
  deriveSolvencyState,
  selectForcedSaleHorse,
  SOLVENCY_THRESHOLDS,
  type SolvencyInput,
} from "@/core/financial/solvency";

const base: SolvencyInput = { cash: 100_000, consecutiveDaysInDebt: 0 };

describe("deriveSolvencyState", () => {
  it("is healthy with positive cash", () => {
    expect(deriveSolvencyState(base).tier).toBe("healthy");
  });

  it("warns as soon as cash goes negative", () => {
    expect(deriveSolvencyState({ cash: -1, consecutiveDaysInDebt: 1 }).tier).toBe("warning");
  });

  it("does not force a sale until the debt has persisted", () => {
    expect(deriveSolvencyState({ cash: -30_000, consecutiveDaysInDebt: 3 }).tier).toBe("warning");
  });

  it("forces a sale after sustained deep debt", () => {
    expect(deriveSolvencyState({ cash: -30_000, consecutiveDaysInDebt: 7 }).tier).toBe(
      "forced_sale",
    );
  });

  it("goes insolvent past the hard floor regardless of duration", () => {
    expect(deriveSolvencyState({ cash: -120_000, consecutiveDaysInDebt: 1 }).tier).toBe(
      "insolvent",
    );
  });

  it("reports how far from the next consequence the player is", () => {
    const s = deriveSolvencyState({ cash: -5_000, consecutiveDaysInDebt: 2 });
    expect(s.cashToRecover).toBe(5_000);
  });
});

describe("selectForcedSaleHorse", () => {
  const horses = [
    { id: "a", owned: true, age: 0, value: 90_000 },
    { id: "b", owned: true, age: 4, value: 60_000 },
    { id: "c", owned: true, age: 5, value: 120_000 },
    { id: "d", owned: false, age: 5, value: 500_000 },
  ];

  it("picks the most valuable owned horse", () => {
    expect(selectForcedSaleHorse(horses)?.id).toBe("c");
  });

  it("never sells a foal (age 0) or an unowned horse", () => {
    const onlyFoalsAndRivals = horses.filter((h) => h.age === 0 || !h.owned);
    expect(selectForcedSaleHorse(onlyFoalsAndRivals)).toBeNull();
  });

  it("returns null when there is nothing to sell", () => {
    expect(selectForcedSaleHorse([])).toBeNull();
  });
});

describe("thresholds", () => {
  it("exposes tunable constants", () => {
    expect(SOLVENCY_THRESHOLDS.forcedSaleCash).toBeLessThan(0);
    expect(SOLVENCY_THRESHOLDS.insolventCash).toBeLessThan(SOLVENCY_THRESHOLDS.forcedSaleCash);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`bunx vitest run src/tests/core/financial/solvency.test.ts`).

- [ ] **Step 3: Implement**

```ts
// src/core/financial/solvency.ts
export const SOLVENCY_THRESHOLDS = {
  /** Cash at or below this, sustained, triggers a creditor sale. */
  forcedSaleCash: -25_000,
  /** Consecutive days below forcedSaleCash before creditors act. Gives the player time to trade out. */
  forcedSaleDays: 7,
  /** Hard floor — the run ends. */
  insolventCash: -100_000,
  /** Fraction of market value a distressed sale realises. */
  distressSaleRate: 0.7,
  /** Daily interest applied to negative balances. */
  dailyInterestRate: 0.001,
} as const;

export type SolvencyTier = "healthy" | "warning" | "forced_sale" | "insolvent";

export interface SolvencyInput {
  cash: number;
  consecutiveDaysInDebt: number;
}

export interface SolvencyState {
  tier: SolvencyTier;
  /** Cash needed to get back to zero; 0 when healthy. Drives the debt banner copy. */
  cashToRecover: number;
}

/**
 * Classify the player's financial position into an escalation tier.
 *
 * Checked worst-first. The sustained-days requirement on forced sales exists so
 * a single large expense (a stud fee, an auction win) can't instantly cost a
 * horse — the player always gets a window to trade their way out.
 *
 * @param input - current cash and how long the player has been under water
 * @returns the tier plus how much cash would clear the debt
 */
export function deriveSolvencyState(input: SolvencyInput): SolvencyState {
  const cashToRecover = input.cash < 0 ? Math.abs(input.cash) : 0;

  if (input.cash <= SOLVENCY_THRESHOLDS.insolventCash) {
    return { tier: "insolvent", cashToRecover };
  }
  if (
    input.cash <= SOLVENCY_THRESHOLDS.forcedSaleCash &&
    input.consecutiveDaysInDebt >= SOLVENCY_THRESHOLDS.forcedSaleDays
  ) {
    return { tier: "forced_sale", cashToRecover };
  }
  if (input.cash < 0) {
    return { tier: "warning", cashToRecover };
  }
  return { tier: "healthy", cashToRecover: 0 };
}

export interface SellableHorse {
  id: string;
  owned: boolean;
  age: number;
  value: number;
}

/**
 * Choose which horse creditors seize: the most valuable owned runner.
 *
 * Foals are exempt — selling an unraced foal is both cruel and useless (low
 * value, high future cost to the player's line), and it reads as a bug to
 * players. Deterministic by design so replays and tests are stable.
 *
 * @param horses - candidate horses with precomputed market values
 * @returns the horse to sell, or null when nothing is eligible
 */
export function selectForcedSaleHorse<T extends SellableHorse>(horses: T[]): T | null {
  const eligible = horses.filter((h) => h.owned && h.age > 0);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, h) => (h.value > best.value ? h : best));
}
```

- [ ] **Step 4: Run — expect PASS** (10 tests). **Step 5: Commit**

```bash
git add src/core/financial/solvency.ts src/tests/core/financial/solvency.test.ts
git commit -m "feat(financial): solvency tiers and forced-sale selection"
```

---

## Task 2: The solvency pipeline phase

**Files:** Create `src/core/time/phases/solvency.ts`; modify `src/constants/gameConstants.ts`, `src/core/time/phases/index.ts`

- [ ] **Step 1: Add the phase order constant**

In `src/constants/gameConstants.ts`, add `PHASE_ORDER_SOLVENCY` with a value **immediately after** `PHASE_ORDER_UPKEEP` (check the existing values and pick the next slot) — solvency must read the balance _after_ the day's costs are applied.

- [ ] **Step 2: Write the phase**

Model it on `src/core/time/phases/awards.ts`. It should, each day:

1. Read player cash from `context.state`.
2. Track `consecutiveDaysInDebt` (increment when cash < 0, reset to 0 otherwise) and write it back through the store slice from Task 3.
3. Call `deriveSolvencyState`.
4. Act on the tier:
   - **warning** — on the _first_ day of debt only, push an inbox message (bank letter). Every day in debt, emit a `cash_change` impact for interest: `-Math.round(Math.abs(cash) * SOLVENCY_THRESHOLDS.dailyInterestRate)`.
   - **forced_sale** — build the candidate list from owned horses with `value: horsePrice(horse)`, call `selectForcedSaleHorse`, emit a `cash_change` of `+Math.round(value * distressSaleRate)`, remove the horse from the player's stable via the existing sale/transfer impact (find it: `grep -rn "sold\|transferOwnership\|horse_sale" src/core/resolver/impacts/`), reset `consecutiveDaysInDebt`, and push an inbox notice naming the horse and the price. If `selectForcedSaleHorse` returns null, escalate to insolvent.
   - **insolvent** — set the run-ended flag (Task 3) and push a final inbox message. Do not delete the save; the epilogue reads from it.
5. Emit nothing at all when `healthy` (keep the phase free in the common case).

Use `context.impacts.push(...)` for all state changes; do not mutate `context.state` directly.

- [ ] **Step 3: Register the phase**

In `src/core/time/phases/index.ts`, import `solvencyPhase` and add it to the exported phase array alongside the others.

- [ ] **Step 4: Test the phase**

Add `src/tests/core/time/solvencyPhase.test.ts` covering: no impacts when healthy; interest emitted while in debt; a forced sale fires only after `forcedSaleDays`; insolvency sets the run-ended flag. Build the context with the existing test helpers (`grep -rn "PipelineContext" src/tests | head` to find the house pattern for constructing one).

- [ ] **Step 5: Verify + commit**

```bash
bunx vitest run src/tests/core/time/solvencyPhase.test.ts
bun run test
git add src/core/time/phases/solvency.ts src/core/time/phases/index.ts src/constants/gameConstants.ts src/tests/core/time/solvencyPhase.test.ts
git commit -m "feat(financial): solvency phase — interest, creditor sales, insolvency"
```

---

## Task 3: Persisted solvency state

**Files:** New slice in `src/game/store/slices/`; modify `src/game/store/index.ts`

- [ ] **Step 1: Add the slice**

Fields: `consecutiveDaysInDebt: number` (default 0), `runEnded: boolean` (default false), `runEndedDay: number | null`. Actions: `setConsecutiveDaysInDebt(n)`, `endRun(day)`, `resetSolvency()`. Follow the house slice pattern (read `settingsSlice.ts` first) and add all three keys to the persisted-keys list in `src/game/store/index.ts` — losing this on reload would let a player escape consequences by refreshing.

- [ ] **Step 2: Verify + commit**

```bash
bunx tsc --noEmit && bun run test
git add src/game/store
git commit -m "feat(financial): persist debt duration and run-ended state"
```

---

## Task 4: Make the pressure visible

Consequences the player doesn't see coming feel arbitrary. This task is what makes the system fair.

**Files:** Create `src/components/dashboard/DebtBanner.tsx`; modify `src/routes/index.tsx`, `src/core/dashboard/nextAction.ts`

- [ ] **Step 1: Build the debt banner**

A red-accented card (mirror `NextActionBanner`'s shape) shown whenever `cash < 0`, stating: current debt, daily interest being charged, and — when `tier === "warning"` and cash is below `forcedSaleCash` — a countdown: "Creditors will sell a horse in N days unless you clear this." Link it to `/stable` (sell a horse yourself) and `/market`.

- [ ] **Step 2: Render it on the dashboard**

In `src/routes/index.tsx`, render `DebtBanner` above the next-action/tutorial banner when in debt. Select primitives only (`cash`, `consecutiveDaysInDebt`) — the dashboard is the screen that has hard-looped twice from unstable selectors, and the ESLint guardrail will reject `useGame((s) => ({...}))`.

- [ ] **Step 3: Let debt outrank routine suggestions**

In `src/core/dashboard/nextAction.ts`, add a `debt` kind at the **top** of the priority ladder (above `inbox`): when the player is in debt, "Cover your debt" is the next action, pointing at `/stable`. Extend `NextActionInput` with `inDebt: boolean` / `debtAmount: number`, add a test case to `src/tests/core/dashboard/nextAction.test.ts` asserting debt wins over an urgent message, and update the dashboard's `deriveNextAction` call site.

- [ ] **Step 4: Verify + commit**

```bash
bunx vitest run src/tests/core/dashboard/nextAction.test.ts
git add -A
git commit -m "feat(financial): debt banner and debt-first next action"
```

---

## Task 5: The legacy epilogue

**Files:** Create `src/routes/epilogue.tsx`; modify `src/components/AppShell.tsx` (or the root route guard)

- [ ] **Step 1: Build the epilogue screen**

Not a "GAME OVER" stamp — a retrospective that makes the run feel like it meant something. Full-bleed, in the style of `/start`. Include:

- Stable name, years operated (`gameYearNumber(runEndedDay) - startYear`), final record.
- **Best horses** — top earners / highest Beyer, pulled from the existing `horseLeaderboards`.
- **Hall of Fame inductees** from this run (`state.hallOfFame`) — this is the emotional payload; a player who bred a champion should see it here.
- Career totals: races won, stakes won, foals bred.
- Two actions: **Start a new stable** (→ `/new-game`) and **Review the record** (→ `/honors`).

- [ ] **Step 2: Route the player there when the run ends**

In the app shell / root guard where the "no save → `/start`" redirect already lives, add: if `runEnded` is true and the current route isn't `/epilogue` or `/new-game`, redirect to `/epilogue`. Find the existing guard: `grep -rn "start\b" src/components/AppShell.tsx src/routes/__root.tsx | head`.

- [ ] **Step 3: Verify in the preview**

Follow `.claude/skills/verify-gallop/references/preview-runtime.md`. Fastest path: start a game, then in the console set cash below the insolvency floor via the store and advance a day — e.g. drive it through the UI, or temporarily lower `SOLVENCY_THRESHOLDS.insolventCash` for the test and restore after. Confirm: the epilogue renders with real horse names and Hall of Fame entries, "Start a new stable" works, and the live error counter reads 0.

- [ ] **Step 4: Commit**

```bash
git add src/routes/epilogue.tsx src/components/AppShell.tsx
git commit -m "feat(financial): legacy epilogue when a run ends"
```

---

## Task 6: Tune it (do not skip)

Numbers invented at a desk make a game either trivial or brutal. Play it.

- [ ] **Step 1: Play each backstory for ~2 in-game years**

Especially **Bootstrapper** ($8,000, one horse — the hard start) and **The Inheritor** ($250,000, four horses — the easy start). Record when (or whether) each first goes into debt.

- [ ] **Step 2: Adjust the constants**

Target feel: a careless player on a standard start should feel real pressure within the first in-game year but be able to trade out of it; Bootstrapper should be genuinely precarious; The Inheritor should be safe unless the player over-extends on breeding or auctions. Tune `SOLVENCY_THRESHOLDS` — logic shouldn't need to change.

- [ ] **Step 3: Sanity-check the NPC asymmetry**

NPCs get a $50k bailout every 365 days ([upkeep.ts:143](src/core/time/phases/upkeep.ts)). Decide deliberately whether that stays (rationale: keeps the world populated with competitive rivals, and rivals disappearing would hollow out the racing calendar) and write the decision into a comment there so the asymmetry reads as intentional rather than an oversight.

- [ ] **Step 4: Commit tuned values**

```bash
git add src/core/financial/solvency.ts src/core/time/phases/upkeep.ts
git commit -m "balance: tune solvency thresholds from playtest"
```

---

## Verification (whole-plan)

- [ ] `bunx vitest run src/tests/core/financial/solvency.test.ts` — 10 tests pass.
- [ ] `bun run verify` (or tsc + lint + test individually) — all green.
- [ ] Playtest: a player driven into debt sees the banner and countdown **before** anything is taken; a forced sale names the horse in the inbox; crossing the floor ends the run in the epilogue.
- [ ] Reloading mid-debt preserves `consecutiveDaysInDebt` (consequences can't be dodged by refreshing).
- [ ] Preview live error counter 0 on dashboard and epilogue.

## Self-review notes

- **Spec coverage:** Improvement #4 = "below −$10k creditors force a horse sale; below a deeper threshold a legacy epilogue game-over; reuse upkeep and valuation." Tasks 1–2 are the mechanic, 3 persists it, 4 makes it visible/fair, 5 is the ending, 6 tunes it. (Thresholds are −$25k/−$100k rather than the −$10k sketched in the assessment; −$10k is what the _NPC_ bailout uses and is too tight for a player who just paid a stud fee — Task 6 exists to settle this empirically.)
- **Fairness is a design requirement, not polish:** Task 4 is deliberately not optional. A consequence that arrives unannounced reads as a bug.
- **Determinism:** forced-sale selection is highest-value-first rather than random, so replays and tests are stable.
- **Type consistency:** `SOLVENCY_THRESHOLDS`, `SolvencyTier`, `deriveSolvencyState`, `selectForcedSaleHorse` defined in Task 1 are consumed unchanged in Tasks 2 and 4.
- **Confirm against real code (inline steps):** the horse-sale/ownership impact name (Task 2 Step 4), `PipelineContext` test-construction pattern (Task 2 Step 4), the app-shell redirect seam (Task 5 Step 2), slice `set` signature (Task 3 Step 1).
