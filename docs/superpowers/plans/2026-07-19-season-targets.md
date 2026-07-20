# Season Targets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player a reason _this season_ matters — a small set of yearly owner's targets ("win 2 stakes races", "earn $150,000", "get a 2yo to a graded start") that generate at the turn of the year, track automatically from existing game events, and pay out in cash and reputation.

**Architecture:** A pure `generateSeasonTargets(seed, context)` builds 3 targets scaled to the player's current standing at each year boundary. A pure `evaluateTargets(targets, stats)` re-derives progress from season statistics on every day-advance, so progress is always correct even if events were missed. One pipeline phase (`seasonTargets`) handles generation, evaluation, and payout at year end. A dashboard card shows progress.

**Tech Stack:** The time pipeline (`PipelinePhase`), Zustand store slice, existing reputation/awards/leaderboard systems, `src/core/calendar/dateFormatting.ts` (`dayOfYear`, `gameYearNumber`), React 19, Vitest.

---

## Context

Gallop now has a solid **short loop** (the `NextActionBanner` answers "what do I do in the next 30 seconds?") and an implicit **long loop** (build a dynasty, breed a champion, reach the Hall of Fame — measured in decades of game time). What's missing is the **middle**: a reason any particular season matters. Nothing marks the turn of a year; nothing says "here is what a good year looks like for a stable your size"; nothing rewards achieving it.

That gap is why the sandbox can feel directionless despite the depth. The player has 919 races to choose from and no framing for which ones are worth targeting. Season targets are the cheapest possible fix because **every system needed to measure them already exists**:

- Year boundaries — `dayOfYear()` / `gameYearNumber()` in [src/core/calendar/dateFormatting.ts](src/core/calendar/dateFormatting.ts), `DAYS_PER_YEAR = 365`.
- Race results, wins, and grades — race history on each horse, plus `src/core/race/grading.ts`.
- Earnings — the transactions ledger and horse earnings.
- Reputation — `src/core/reputation/` (a natural reward currency).
- A year-end phase to copy — [src/core/time/phases/awards.ts](src/core/time/phases/awards.ts) already runs regional award ceremonies at year end.

So this adds direction without adding simulation.

**Design stance — aspirational, not punitive.** Targets are goals to chase, never quotas that punish. Missing all three costs nothing but the reward. They must scale to the player's standing (a Bootstrapper stable and a 20-horse operation should not get the same "earn $150k"), or they become either trivial or demoralising.

**Outcome:** Every in-game year opens with three concrete things worth doing and closes with a payout and a scorecard.

---

## The three target slots

Each season generates exactly three targets — one from each category, so the season always pulls the player toward racing, money, and the future:

| Slot | Category        | Examples (scaled)                                                        |
| ---- | --------------- | ------------------------------------------------------------------------ |
| 1    | **Racing**      | win N races · win N stakes races · place in a G1                         |
| 2    | **Financial**   | earn $X in prize money · finish the year above $Y cash                   |
| 3    | **Development** | run a 2yo in a graded race · breed N foals · get a horse to a Beyer of X |

Three is deliberate: enough to give direction, few enough to hold in your head.

---

## File Structure

**New files**

- `src/core/season/targetTypes.ts` — `SeasonTarget`, `TargetCategory`, `SeasonStats`.
- `src/core/season/generateTargets.ts` — pure `generateSeasonTargets()`.
- `src/core/season/evaluateTargets.ts` — pure `evaluateTargets()`.
- `src/core/time/phases/seasonTargets.ts` — the pipeline phase.
- `src/components/dashboard/SeasonTargetsCard.tsx` — progress card.
- `src/components/season/SeasonReviewDialog.tsx` — year-end scorecard.
- Tests: `src/tests/core/season/generateTargets.test.ts`, `src/tests/core/season/evaluateTargets.test.ts`.

**Modified files**

- `src/constants/gameConstants.ts` — `PHASE_ORDER_SEASON_TARGETS`, reward tables.
- `src/core/time/phases/index.ts` — register the phase.
- `src/game/store/slices/` — persist active targets + history.
- `src/routes/index.tsx` — render `SeasonTargetsCard`.

**Reused as-is:** `dayOfYear`/`gameYearNumber`, the reputation system, race grading helpers, the inbox, the transactions ledger.

---

## Conventions

- Phases implement `PipelinePhase { name, order, execute(ctx) }`, registered in `src/core/time/phases/index.ts`, order constants in `@/constants`. Model on `awards.ts` (it already does year-end work).
- Emit state changes as impacts on `context.impacts`; don't mutate `context.state`.
- Any randomness uses `context.dailyRng` so runs stay deterministic/replayable.
- Dashboard selectors must be stable — primitives or `useGameWithShallow`. The ESLint guardrail rejects `useGame((s) => ({...}))`, and the dashboard has hard-looped from this twice.

---

## Task 1: Target types and generation (pure)

**Files:** Create `src/core/season/targetTypes.ts`, `src/core/season/generateTargets.ts`; test `src/tests/core/season/generateTargets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/core/season/generateTargets.test.ts
import { describe, it, expect } from "vitest";
import { generateSeasonTargets } from "@/core/season/generateTargets";
import type { StandingSnapshot } from "@/core/season/targetTypes";

const smallStable: StandingSnapshot = {
  ownedHorseCount: 2,
  lastSeasonWins: 1,
  lastSeasonEarnings: 12_000,
  cash: 20_000,
  hasStakesWin: false,
};

const bigStable: StandingSnapshot = {
  ownedHorseCount: 18,
  lastSeasonWins: 22,
  lastSeasonEarnings: 900_000,
  cash: 1_200_000,
  hasStakesWin: true,
};

describe("generateSeasonTargets", () => {
  it("always produces one racing, one financial, and one development target", () => {
    const t = generateSeasonTargets(2027, smallStable, 1);
    expect(t).toHaveLength(3);
    expect(t.map((x) => x.category).sort()).toEqual(["development", "financial", "racing"]);
  });

  it("scales goals to the stable's standing", () => {
    const small = generateSeasonTargets(2027, smallStable, 1);
    const big = generateSeasonTargets(2027, bigStable, 1);
    const smallMoney = small.find((t) => t.category === "financial")!;
    const bigMoney = big.find((t) => t.category === "financial")!;
    expect(bigMoney.goal).toBeGreaterThan(smallMoney.goal);
  });

  it("never asks a beginner for a stakes win they cannot realistically get", () => {
    const t = generateSeasonTargets(2027, smallStable, 1);
    const racing = t.find((x) => x.category === "racing")!;
    expect(racing.goal).toBeLessThanOrEqual(5);
  });

  it("is deterministic for the same year and seed", () => {
    const a = generateSeasonTargets(2027, bigStable, 42);
    const b = generateSeasonTargets(2027, bigStable, 42);
    expect(a).toEqual(b);
  });

  it("attaches a reward to every target", () => {
    for (const t of generateSeasonTargets(2027, bigStable, 7)) {
      expect(t.rewardCash).toBeGreaterThan(0);
      expect(t.rewardReputation).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement the types**

```ts
// src/core/season/targetTypes.ts
export type TargetCategory = "racing" | "financial" | "development";

export type TargetMetric =
  | "wins"
  | "stakesWins"
  | "prizeMoney"
  | "endingCash"
  | "gradedStartsByTwoYearOlds"
  | "foalsBred"
  | "bestBeyer";

export interface SeasonTarget {
  id: string;
  category: TargetCategory;
  metric: TargetMetric;
  /** Human-readable goal, e.g. "Win 3 races". */
  label: string;
  goal: number;
  rewardCash: number;
  rewardReputation: number;
}

/** What the player's operation looked like when the season opened — drives scaling. */
export interface StandingSnapshot {
  ownedHorseCount: number;
  lastSeasonWins: number;
  lastSeasonEarnings: number;
  cash: number;
  hasStakesWin: boolean;
}

/** Season-to-date totals, recomputed from game state each day. */
export interface SeasonStats {
  wins: number;
  stakesWins: number;
  prizeMoney: number;
  endingCash: number;
  gradedStartsByTwoYearOlds: number;
  foalsBred: number;
  bestBeyer: number;
}
```

- [ ] **Step 4: Implement generation**

```ts
// src/core/season/generateTargets.ts
import type { SeasonTarget, StandingSnapshot } from "./targetTypes";

/**
 * Build this season's three targets, scaled to what the stable actually is.
 *
 * Scaling matters more than variety here: a fixed "earn $150k" is trivial for a
 * large operation and demoralising for a two-horse yard, and either way the
 * player stops reading them. Goals are pitched slightly above last season's
 * performance so a good year is a stretch, not a formality.
 *
 * @param year - in-game year the season covers
 * @param standing - the player's position when the season opened
 * @param seed - deterministic seed (use the day's RNG seed) so replays match
 * @returns exactly three targets: one racing, one financial, one development
 */
export function generateSeasonTargets(
  year: number,
  standing: StandingSnapshot,
  seed: number,
): SeasonTarget[] {
  // Stretch factor: beat last season by ~25%, with a floor so a blank first
  // season still produces a real goal.
  const stretch = (base: number, floor: number) => Math.max(floor, Math.round(base * 1.25));

  // --- Racing -------------------------------------------------------------
  // Only ask for stakes wins from a stable that has already proven it can win one.
  const racing: SeasonTarget = standing.hasStakesWin
    ? {
        id: `${year}-racing`,
        category: "racing",
        metric: "stakesWins",
        goal: stretch(Math.max(1, Math.floor(standing.lastSeasonWins / 6)), 2),
        label: "",
        rewardCash: 0,
        rewardReputation: 0,
      }
    : {
        id: `${year}-racing`,
        category: "racing",
        metric: "wins",
        goal: Math.min(5, stretch(standing.lastSeasonWins, 2)),
        label: "",
        rewardCash: 0,
        rewardReputation: 0,
      };
  racing.label =
    racing.metric === "stakesWins" ? `Win ${racing.goal} stakes races` : `Win ${racing.goal} races`;

  // --- Financial ----------------------------------------------------------
  const moneyGoal = stretch(standing.lastSeasonEarnings, 25_000);
  const financial: SeasonTarget = {
    id: `${year}-financial`,
    category: "financial",
    metric: "prizeMoney",
    goal: moneyGoal,
    label: `Earn $${moneyGoal.toLocaleString()} in prize money`,
    rewardCash: 0,
    rewardReputation: 0,
  };

  // --- Development --------------------------------------------------------
  // Small yards get a breeding goal (achievable without a deep roster);
  // established yards get pushed toward the graded ladder with their young stock.
  const development: SeasonTarget =
    standing.ownedHorseCount >= 6
      ? {
          id: `${year}-development`,
          category: "development",
          metric: "gradedStartsByTwoYearOlds",
          goal: 1,
          label: "Start a 2yo in a graded race",
          rewardCash: 0,
          rewardReputation: 0,
        }
      : {
          id: `${year}-development`,
          category: "development",
          metric: "foalsBred",
          goal: 1,
          label: "Breed a foal",
          rewardCash: 0,
          rewardReputation: 0,
        };

  // Rewards scale with the size of the ask so they stay meaningful all game.
  const withRewards = [racing, financial, development].map((t) => ({
    ...t,
    rewardCash: Math.max(5_000, Math.round(moneyGoal * 0.1)),
    rewardReputation: t.category === "racing" ? 15 : 10,
  }));

  // `seed` is accepted so future variant-picking stays deterministic; current
  // selection is fully determined by standing, which is already reproducible.
  void seed;
  return withRewards;
}
```

- [ ] **Step 5: Run — expect PASS** (5 tests). **Step 6: Commit**

```bash
git add src/core/season/targetTypes.ts src/core/season/generateTargets.ts src/tests/core/season/generateTargets.test.ts
git commit -m "feat(season): generate three scaled season targets per year"
```

---

## Task 2: Target evaluation (pure)

**Files:** Create `src/core/season/evaluateTargets.ts`; test `src/tests/core/season/evaluateTargets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/core/season/evaluateTargets.test.ts
import { describe, it, expect } from "vitest";
import { evaluateTargets } from "@/core/season/evaluateTargets";
import type { SeasonTarget, SeasonStats } from "@/core/season/targetTypes";

const targets: SeasonTarget[] = [
  {
    id: "r",
    category: "racing",
    metric: "wins",
    label: "Win 3 races",
    goal: 3,
    rewardCash: 10_000,
    rewardReputation: 15,
  },
  {
    id: "f",
    category: "financial",
    metric: "prizeMoney",
    label: "Earn $50,000",
    goal: 50_000,
    rewardCash: 10_000,
    rewardReputation: 10,
  },
];

const stats: SeasonStats = {
  wins: 3,
  stakesWins: 0,
  prizeMoney: 20_000,
  endingCash: 0,
  gradedStartsByTwoYearOlds: 0,
  foalsBred: 0,
  bestBeyer: 0,
};

describe("evaluateTargets", () => {
  it("marks a target complete when the metric reaches the goal", () => {
    const r = evaluateTargets(targets, stats);
    expect(r.find((x) => x.id === "r")!.complete).toBe(true);
  });

  it("reports fractional progress for incomplete targets", () => {
    const r = evaluateTargets(targets, stats);
    const money = r.find((x) => x.id === "f")!;
    expect(money.complete).toBe(false);
    expect(money.progress).toBeCloseTo(0.4);
  });

  it("clamps progress at 1 when the goal is exceeded", () => {
    const r = evaluateTargets(targets, { ...stats, wins: 99 });
    expect(r.find((x) => x.id === "r")!.progress).toBe(1);
  });

  it("totals the rewards earned so far", () => {
    const r = evaluateTargets(targets, stats);
    const earned = r.filter((x) => x.complete);
    expect(earned).toHaveLength(1);
    expect(earned[0].target.rewardCash).toBe(10_000);
  });

  it("handles an empty target list", () => {
    expect(evaluateTargets([], stats)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/core/season/evaluateTargets.ts
import type { SeasonStats, SeasonTarget } from "./targetTypes";

export interface TargetProgress {
  id: string;
  target: SeasonTarget;
  current: number;
  /** 0–1, clamped. Drives the progress bar. */
  progress: number;
  complete: boolean;
}

/**
 * Re-derive progress for every target from season-to-date statistics.
 *
 * Recomputing from stats (rather than incrementing counters on each event) means
 * progress is self-healing: a missed event, a loaded save, or a rebalanced
 * metric can never leave a target permanently wrong.
 *
 * @param targets - this season's targets
 * @param stats - season-to-date totals
 * @returns per-target progress, in the same order as the input
 */
export function evaluateTargets(targets: SeasonTarget[], stats: SeasonStats): TargetProgress[] {
  return targets.map((target) => {
    const current = stats[target.metric] ?? 0;
    const progress = target.goal <= 0 ? 1 : Math.min(1, current / target.goal);
    return {
      id: target.id,
      target,
      current,
      progress,
      complete: current >= target.goal,
    };
  });
}
```

- [ ] **Step 4: Run — expect PASS** (5 tests). **Step 5: Commit**

```bash
git add src/core/season/evaluateTargets.ts src/tests/core/season/evaluateTargets.test.ts
git commit -m "feat(season): evaluate target progress from season stats"
```

---

## Task 3: Season stats collection + the phase

**Files:** Create `src/core/season/collectSeasonStats.ts`, `src/core/time/phases/seasonTargets.ts`; modify `src/constants/gameConstants.ts`, `src/core/time/phases/index.ts`

- [ ] **Step 1: Write `collectSeasonStats(state, seasonStartDay)`**

A pure function returning `SeasonStats`, computed by walking owned horses' race history for entries with `day >= seasonStartDay`:

- `wins` — finishes in position 1
- `stakesWins` — position 1 where the race was graded/stakes (use `src/core/race/grading.ts` helpers)
- `prizeMoney` — sum of purse winnings in the window
- `bestBeyer` — max Beyer recorded in the window
- `gradedStartsByTwoYearOlds` — starts in graded races by horses aged 2
- `foalsBred` — foals with a birth day in the window
- `endingCash` — current cash

Confirm the actual field names first: `grep -nE "raceHistory|finishPosition|purse|beyer" src/core/horse/types.ts | head`. Add a unit test with a small hand-built state.

- [ ] **Step 2: Add constants**

In `src/constants/gameConstants.ts`: `PHASE_ORDER_SEASON_TARGETS` (place near `PHASE_ORDER_AWARDS` — both are year-boundary work; targets should settle **after** awards so a year-end award can count toward a target).

- [ ] **Step 3: Write the phase**

Model on `awards.ts`. Each day:

1. Compute `dayOfYear(context.newDay)` and `gameYearNumber(context.newDay)`.
2. **Year boundary** (`dayOfYear === 1`, or no active targets exist): settle the outgoing season — evaluate final progress, emit `cash_change` + reputation impacts for each completed target, push an inbox summary, archive the result to target history, then generate the new season's targets from a fresh `StandingSnapshot` and store them.
3. **Every other day**: recompute `SeasonStats` and store the evaluated progress so the dashboard card is current. Keep this cheap — it walks race history once per day.

- [ ] **Step 4: Register + test**

Register in `src/core/time/phases/index.ts`. Add `src/tests/core/time/seasonTargetsPhase.test.ts` covering: targets generate on the first day of a year; progress updates mid-season; rewards are emitted exactly once at settlement; a new season's targets differ from the last.

- [ ] **Step 5: Verify + commit**

```bash
bunx vitest run src/tests/core/season
bun run test
git add src/core/season src/core/time/phases/seasonTargets.ts src/core/time/phases/index.ts src/constants/gameConstants.ts src/tests/core/time/seasonTargetsPhase.test.ts
git commit -m "feat(season): season-targets phase — generate, track, settle"
```

---

## Task 4: Store slice

**Files:** New slice in `src/game/store/slices/`; modify `src/game/store/index.ts`

- [ ] **Step 1: Add the slice**

Fields: `seasonTargets: SeasonTarget[]`, `seasonTargetProgress: TargetProgress[]`, `seasonStartDay: number | null`, `seasonTargetHistory: { year: number; completed: number; total: number }[]`. Actions: `setSeasonTargets`, `setSeasonTargetProgress`, `archiveSeason`. Follow the house pattern (read `settingsSlice.ts`); add all keys to the persisted list in `src/game/store/index.ts`.

- [ ] **Step 2: Verify + commit**

```bash
bunx tsc --noEmit && bun run test
git add src/game/store
git commit -m "feat(season): persist season targets and history"
```

---

## Task 5: Dashboard card + year-end review

**Files:** Create `src/components/dashboard/SeasonTargetsCard.tsx`, `src/components/season/SeasonReviewDialog.tsx`; modify `src/routes/index.tsx`

- [ ] **Step 1: Build the targets card**

Three rows, each: label, `current / goal`, a progress bar, and a check when complete. Header shows the year and `N of 3 complete`. Keep it visually quiet — it's a persistent reference, not an alert. Read `seasonTargetProgress` with `useGameWithShallow` (an array read; a plain `useGame` returning a fresh array here would loop the dashboard).

- [ ] **Step 2: Place it on the dashboard**

In `src/routes/index.tsx`, add `SeasonTargetsCard` to the main widget grid (not above the next-action banner — the banner answers "now", targets answer "this year"; that hierarchy should be visible).

- [ ] **Step 3: Build the year-end review dialog**

When the phase settles a season, show a scorecard once: which targets were met, rewards earned, and the new season's three targets. Trigger it from a `pendingSeasonReview` flag set by the phase and cleared on dismiss.

- [ ] **Step 4: Verify in the preview**

Follow `.claude/skills/verify-gallop/references/preview-runtime.md`: start a game, confirm the card shows three targets with 0 progress, win/earn something and confirm progress moves. To reach a year boundary without waiting 365 days, temporarily start the game late in the year or advance days in bulk via the existing advance action. Confirm the review dialog appears once, rewards land in cash/reputation, and new targets generate. Live error counter 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/SeasonTargetsCard.tsx src/components/season src/routes/index.tsx
git commit -m "feat(season): season targets card and year-end review"
```

---

## Task 6: Tune the difficulty

- [ ] **Step 1: Play three seasons across two backstories**

Bootstrapper (tiny) and The Inheritor (established). Record how many of the three targets you hit each year without deliberately optimising for them.

- [ ] **Step 2: Adjust**

Target feel: a competent player hits **2 of 3** in a normal year; hitting all three should require intent. If you're hitting 3/3 passively, raise the stretch multiplier in `generateSeasonTargets`; if 0/3 is common, lower the floors. Logic shouldn't need to change — only the numbers.

- [ ] **Step 3: Commit**

```bash
git add src/core/season/generateTargets.ts
git commit -m "balance: tune season target difficulty from playtest"
```

---

## Verification (whole-plan)

- [ ] `bunx vitest run src/tests/core/season` — generation (5) + evaluation (5) + phase tests pass.
- [ ] `bun run verify` — tsc, lint, and the full suite green.
- [ ] Playtest: targets appear at year start, progress tracks real results, rewards pay out once at year end, and the next season's targets differ and scale.
- [ ] Reloading mid-season preserves targets and progress.
- [ ] Preview live error counter 0 on the dashboard (no unstable selector introduced by the new card).

## Self-review notes

- **Spec coverage:** Improvement #5 = "an Owner's Targets panel — e.g. win 2 stakes, earn $150k, get a 2yo to a graded start — generated per-season with reputation/cash rewards, reusing awards/leaderboard/rivalry systems." Task 1 generates, Task 2 evaluates, Task 3 wires it into the year cycle, Task 4 persists, Task 5 surfaces it, Task 6 tunes.
- **Why re-derive instead of increment:** counters drift when events are missed or saves are loaded mid-season; recomputing from race history is self-healing and made the evaluation trivially testable.
- **Why scaling is in the plan rather than a fixed list:** a fixed goal is the failure mode that makes seasonal objectives feel like filler — the tests pin the scaling behaviour explicitly.
- **Type consistency:** `SeasonTarget`/`SeasonStats`/`StandingSnapshot` (Task 1) flow unchanged through Tasks 2–5; `TargetProgress` (Task 2) is what the card renders.
- **Confirm against real code (inline steps):** horse race-history field names (Task 3 Step 1), grading helper names (Task 3 Step 1), slice `set` signature (Task 4 Step 1), phase-order neighbours (Task 3 Step 2).
