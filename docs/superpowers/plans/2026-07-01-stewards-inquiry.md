# Stewards Inquiry System Race Result Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the existing stewards inquiry types into the live race result flow so players experience the full tension of a potential result reversal. After a race involving the player ends, the UI enters a "Stewards are reviewing" state for 2–3 seconds before announcing the outcome. If an inquiry is triggered, the player sees the inquiry details and waits for the verdict. Outcomes (no change, demotion, disqualification) are applied atomically. The background `stewardsPhase` that handles NPC-only races is guarded to skip player races, preventing double-resolution.

**Architecture:** A new `inquiryProbability.ts` module computes the base probability (5%) plus modifiers (grade, jockey foul flag, photo finish). A `PendingInquiry` record lives in `SystemsState` while under review. The `useStewardsInquiry` React hook fires after `useLiveRaceSimulation` emits `onRaceComplete`. A `StewardsInquiryOverlay` component handles the reviewing beat and outcome reveal. The `dismissInquiry` store action applies position changes and prize redistributions atomically.

**Tech Stack:** TypeScript, Zustand, React 19 (hooks), CSS animations (existing `finish-flash` keyframe can be repurposed); no new libraries.

---

## Context

The existing code has:

- `StewardsInquiry` type with `reason`, `affectedHorseIds`, `outcome: "no_change" | "demotion" | "disqualification"`, and `severity`
- `stewardsPhase` in the pipeline that auto-resolves inquiries for NPC races
- `useLiveRaceSimulation` hook with an `onRaceComplete` callback

What is missing:

- `inquiryProbability.ts` — pure probability logic
- `PendingInquiry` in state — the "under review" record while the UI shows the inquiry
- `useStewardsInquiry` hook — fires after player race completes, holds UI in reviewing state, then calls `dismissInquiry`
- `StewardsInquiryOverlay` — the actual UI component
- `dismissInquiry` store action — atomically applies outcome
- Guard in `stewardsPhase` — `hasPlayerEntry` check to skip player races

**Race condition risk:** Both `useStewardsInquiry` (player-facing) and the background `stewardsPhase` (pipeline) could fire for the same player race. The guard in `stewardsPhase` must be the backstop. If the player is watching the race live, the hook handles it; the pipeline phase skips it. If the player advances days without watching (auto-sim), the pipeline handles it via a simplified auto-resolve path and posts an inbox message.

---

## File Structure

**New files:**

- `src/core/racing/inquiryProbability.ts` — pure `calculateInquiryProbability(race, horseId): number` function
- `src/components/race/StewardsInquiryOverlay.tsx` — reviewing beat + outcome reveal UI
- `src/hooks/useStewardsInquiry.ts` — React hook that fires after live race completion
- `src/tests/core/racing/inquiryProbability.test.ts` — pure function tests

**Modified files:**

- `src/types/state.ts` — add `pendingInquiry?: PendingInquiry` to `SystemsState`
- `src/types/race.ts` — add `PendingInquiry` type
- `src/game/store/slices/racingSlice.ts` — add `setPendingInquiry`, `dismissInquiry` actions
- `src/core/time/phases/stewardsPhase.ts` — add `hasPlayerEntry` guard
- `src/components/race/race.$raceId.tsx` (or `RaceLayout.tsx`) — mount `useStewardsInquiry` and `StewardsInquiryOverlay`

---

## Conventions (read before starting)

- The `inquiryProbability.ts` module is PURE — no side effects, no store access, no randomness. It takes race and horse data and returns a probability value (0–1).
- The randomness (does an inquiry actually fire?) happens in the hook, which uses `Math.random()`. This is intentional: the probability function is testable, the dice roll is not.
- `PendingInquiry` should include: `raceId`, `inquiredHorseId`, `inquiredHorseName`, `reason`, `provisionalResult` (positions before reversal), `status: "reviewing" | "announced"`, `outcome?: "no_change" | "demotion" | "disqualification"`.
- `dismissInquiry` is idempotent — calling it twice does nothing. It clears `pendingInquiry` from state.
- The reviewing beat is exactly 2500ms. The outcome is shown for another 2000ms before auto-dismissing.
- When the outcome is `"demotion"` or `"disqualification"`, `dismissInquiry` must recompute prize money and reputation deltas.
- The `stewardsPhase` guard: check if the race has a player-owned horse in the entry list. If yes, skip — the hook will handle it. The phase still processes the race for prize money etc., it just doesn't trigger a stewards inquiry.
- Test convention: `src/tests/core/<module>/<filename>.test.ts`.

---

## Task 1: Define PendingInquiry type and add to state

**Files:**

- Modify: `src/types/race.ts`
- Modify: `src/types/state.ts`

- [ ] **Step 1: Add PendingInquiry type**

In `src/types/race.ts`:

```typescript
export type InquiryStatus = "reviewing" | "announced";
export type InquiryOutcome = "no_change" | "demotion" | "disqualification";

export interface PendingInquiry {
  raceId: string;
  raceName: string;
  inquiredHorseId: string;
  inquiredHorseName: string;
  reason: string;
  provisionalFinishPosition: number; // the position the horse had before review
  provisionalPrize: number;
  status: InquiryStatus;
  outcome?: InquiryOutcome;
  affectedPositions?: Array<{ horseId: string; fromPosition: number; toPosition: number }>;
}
```

- [ ] **Step 2: Add to SystemsState**

In `src/types/state.ts`, add to `SystemsState`:

```typescript
pendingInquiry?: PendingInquiry;
```

- [ ] **Commit:**

```bash
git add src/types/race.ts src/types/state.ts
git commit -m "feat(stewards): add PendingInquiry type and pendingInquiry field to SystemsState"
```

---

## Task 2: Implement inquiryProbability pure function

**Files:**

- Create: `src/core/racing/inquiryProbability.ts`
- Create: `src/tests/core/racing/inquiryProbability.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { calculateInquiryProbability } from "@/core/racing/inquiryProbability";
import { createTestRace } from "@/tests/factories";

describe("calculateInquiryProbability", () => {
  it("base probability is 5% for a standard race", () => {
    const race = createTestRace({ grade: null, isPhotoFinish: false });
    const p = calculateInquiryProbability(race, "horse-1");
    expect(p).toBeCloseTo(0.05);
  });

  it("adds 10% for a photo finish", () => {
    const race = createTestRace({ isPhotoFinish: true });
    const p = calculateInquiryProbability(race, "horse-1");
    expect(p).toBeGreaterThan(0.1);
  });

  it("adds 15% for G1 grade", () => {
    const race = createTestRace({ grade: "G1" });
    const p = calculateInquiryProbability(race, "horse-1");
    expect(p).toBeGreaterThan(0.15);
  });

  it("caps at 1.0 in extreme scenarios", () => {
    const race = createTestRace({ grade: "G1", isPhotoFinish: true, hasFoulFlag: true });
    const p = calculateInquiryProbability(race, "horse-1");
    expect(p).toBeLessThanOrEqual(1.0);
  });
});
```

- [ ] **Step 2: Implement the function**

```typescript
export interface InquiryContext {
  grade: "G1" | "G2" | "G3" | null;
  isPhotoFinish: boolean;
  hasFoulFlag?: boolean; // set by race simulation if a horse cut across
}

const BASE_INQUIRY_PROBABILITY = 0.05;
const PHOTO_FINISH_MODIFIER = 0.1;
const GRADE_G1_MODIFIER = 0.15;
const GRADE_G2_MODIFIER = 0.08;
const GRADE_G3_MODIFIER = 0.05;
const FOUL_FLAG_MODIFIER = 0.25;

export function calculateInquiryProbability(context: InquiryContext, _horseId?: string): number {
  let probability = BASE_INQUIRY_PROBABILITY;

  if (context.isPhotoFinish) probability += PHOTO_FINISH_MODIFIER;
  if (context.grade === "G1") probability += GRADE_G1_MODIFIER;
  else if (context.grade === "G2") probability += GRADE_G2_MODIFIER;
  else if (context.grade === "G3") probability += GRADE_G3_MODIFIER;
  if (context.hasFoulFlag) probability += FOUL_FLAG_MODIFIER;

  return Math.min(1.0, probability);
}
```

- [ ] **Run tests:**

```bash
bunx vitest run src/tests/core/racing/inquiryProbability.test.ts
```

- [ ] **Commit:**

```bash
git add src/core/racing/inquiryProbability.ts src/tests/core/racing/inquiryProbability.test.ts
git commit -m "feat(stewards): implement calculateInquiryProbability with grade, photo finish, and foul modifiers"
```

---

## Task 3: Add setPendingInquiry and dismissInquiry store actions

**Files:**

- Modify: `src/game/store/slices/racingSlice.ts`

- [ ] **Step 1: Add setPendingInquiry**

```typescript
setPendingInquiry: (inquiry: PendingInquiry | undefined) => {
  set((s) => ({ ...s, pendingInquiry: inquiry }));
},
```

- [ ] **Step 2: Add dismissInquiry**

```typescript
dismissInquiry: (raceId: string, outcome: InquiryOutcome) => {
  set((s) => {
    if (!s.pendingInquiry || s.pendingInquiry.raceId !== raceId) return s;

    const inquiry = s.pendingInquiry;
    let updates: Partial<GameState> = { pendingInquiry: undefined };

    if (outcome === "disqualification") {
      // Remove horse from results, advance all lower positions by 1
      // Forfeit horse's prize money
      const log = {
        day: s.day,
        text: `STEWARDS RULING: ${inquiry.inquiredHorseName} has been DISQUALIFIED from ${inquiry.raceName}. Prize money forfeited.`,
      };
      updates.log = [log, ...s.log].slice(0, 50);
      // Reputation delta for player if their horse was disqualified
      if (s.playerHorses.some((h) => h.id === inquiry.inquiredHorseId)) {
        updates.reputation = Math.max(0, (s.reputation ?? 0) - 10);
      }
    } else if (outcome === "demotion") {
      const log = {
        day: s.day,
        text: `STEWARDS RULING: ${inquiry.inquiredHorseName} demoted one position in ${inquiry.raceName}.`,
      };
      updates.log = [log, ...s.log].slice(0, 50);
    } else {
      updates.log = [
        { day: s.day, text: `STEWARDS: Result stands — ${inquiry.inquiredHorseName} in ${inquiry.raceName}.` },
        ...s.log,
      ].slice(0, 50);
    }

    return { ...s, ...updates };
  });
},
```

- [ ] **Commit:**

```bash
git add src/game/store/slices/racingSlice.ts
git commit -m "feat(stewards): add setPendingInquiry and dismissInquiry store actions with atomic outcome application"
```

---

## Task 4: Implement useStewardsInquiry hook

**Files:**

- Create: `src/hooks/useStewardsInquiry.ts`

- [ ] **Step 1: Build the hook**

```typescript
export function useStewardsInquiry(raceId: string | null) {
  const race = useRacingStore((s) => s.races.find((r) => r.id === raceId));
  const playerHorseIds = useRacingStore((s) => new Set(s.playerHorses.map((h) => h.id)));
  const setPendingInquiry = useRacingStore((s) => s.setPendingInquiry);
  const dismissInquiry = useRacingStore((s) => s.dismissInquiry);
  const pendingInquiry = useRacingStore((s) => s.pendingInquiry);

  const triggerInquiryCheck = useCallback(
    (result: RaceResult) => {
      if (!race || !raceId) return;

      const playerEntry = result.positions.find((p) => playerHorseIds.has(p.horseId));
      if (!playerEntry) return;

      const context: InquiryContext = {
        grade: race.grade ?? null,
        isPhotoFinish: result.isPhotoFinish ?? false,
        hasFoulFlag: result.hasFoulFlag ?? false,
      };

      const probability = calculateInquiryProbability(context, playerEntry.horseId);
      const triggered = Math.random() < probability;

      if (!triggered) return;

      const REASONS = [
        "Interference in the straight",
        "Bumping in the final furlong",
        "Taking ground — tight quarters in the turn",
        "Crossing — the stewards have called for a review",
      ];
      const reason = REASONS[Math.floor(Math.random() * REASONS.length)];

      setPendingInquiry({
        raceId,
        raceName: race.name,
        inquiredHorseId: playerEntry.horseId,
        inquiredHorseName: playerEntry.horseName,
        reason,
        provisionalFinishPosition: playerEntry.position,
        provisionalPrize: playerEntry.prize ?? 0,
        status: "reviewing",
      });
    },
    [race, raceId, playerHorseIds, setPendingInquiry],
  );

  return { triggerInquiryCheck, pendingInquiry, dismissInquiry };
}
```

- [ ] **Commit:**

```bash
git add src/hooks/useStewardsInquiry.ts
git commit -m "feat(stewards): add useStewardsInquiry hook — fires after live race, sets pendingInquiry in store"
```

---

## Task 5: Build StewardsInquiryOverlay component

**Files:**

- Create: `src/components/race/StewardsInquiryOverlay.tsx`

States:

1. **Reviewing** (2500ms): "Stewards are reviewing the race result" with pulsing animation
2. **Announced** (2000ms, then auto-dismiss): outcome card (no change / demotion / disqualification)

- [ ] **Step 1: Build the overlay**

```tsx
const REVIEW_DURATION_MS = 2500;
const ANNOUNCE_DURATION_MS = 2000;

const OUTCOME_MESSAGES: Record<InquiryOutcome, { title: string; className: string }> = {
  no_change: { title: "RESULT STANDS", className: "outcome-clear" },
  demotion: { title: "DEMOTION", className: "outcome-warn" },
  disqualification: { title: "DISQUALIFICATION", className: "outcome-severe" },
};

export function StewardsInquiryOverlay({
  inquiry,
  onDismiss,
}: {
  inquiry: PendingInquiry;
  onDismiss: (outcome: InquiryOutcome) => void;
}) {
  const [phase, setPhase] = useState<"reviewing" | "announced">("reviewing");
  const [outcome, setOutcome] = useState<InquiryOutcome | null>(null);

  useEffect(() => {
    const reviewTimer = setTimeout(() => {
      const roll = Math.random();
      const resolved: InquiryOutcome =
        roll < 0.6 ? "no_change" : roll < 0.85 ? "demotion" : "disqualification";

      setOutcome(resolved);
      setPhase("announced");

      setTimeout(() => onDismiss(resolved), ANNOUNCE_DURATION_MS);
    }, REVIEW_DURATION_MS);

    return () => clearTimeout(reviewTimer);
  }, [onDismiss]);

  return (
    <div className="stewards-overlay" role="dialog" aria-live="assertive">
      {phase === "reviewing" && (
        <div className="inquiry-reviewing">
          <div className="stewards-logo" />
          <h2>STEWARDS INQUIRY</h2>
          <p className="inquiry-horse">{inquiry.inquiredHorseName}</p>
          <p className="inquiry-reason">{inquiry.reason}</p>
          <p className="reviewing-beat">Reviewing…</p>
        </div>
      )}
      {phase === "announced" && outcome && (
        <div className={`inquiry-outcome ${OUTCOME_MESSAGES[outcome].className}`}>
          <h2>{OUTCOME_MESSAGES[outcome].title}</h2>
          <p>
            {inquiry.inquiredHorseName} — {inquiry.raceName}
          </p>
          {outcome !== "no_change" && (
            <p className="outcome-detail">
              {outcome === "demotion"
                ? "Horse demoted one position."
                : "Horse disqualified. Prize money forfeited."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit:**

```bash
git add src/components/race/StewardsInquiryOverlay.tsx
git commit -m "feat(stewards): add StewardsInquiryOverlay with 2500ms review beat and outcome reveal animation"
```

---

## Task 6: Mount hook and overlay in race page

**Files:**

- Modify: `src/routes/race.$raceId.tsx`

- [ ] **Step 1: Wire up the hook**

```tsx
const { triggerInquiryCheck, pendingInquiry, dismissInquiry } = useStewardsInquiry(raceId);

// Pass triggerInquiryCheck as callback to useLiveRaceSimulation's onRaceComplete:
useLiveRaceSimulation({
  raceId,
  onRaceComplete: (result) => {
    triggerInquiryCheck(result);
    // existing completion logic...
  },
});
```

- [ ] **Step 2: Render overlay**

```tsx
{
  pendingInquiry && pendingInquiry.raceId === raceId && (
    <StewardsInquiryOverlay
      inquiry={pendingInquiry}
      onDismiss={(outcome) => dismissInquiry(raceId, outcome)}
    />
  );
}
```

- [ ] **Commit:**

```bash
git add src/routes/race.$raceId.tsx
git commit -m "feat(stewards): mount useStewardsInquiry and StewardsInquiryOverlay in race page"
```

---

## Task 7: Guard stewardsPhase in pipeline

**Files:**

- Modify: `src/core/time/phases/stewardsPhase.ts`

- [ ] **Step 1: Add hasPlayerEntry check**

```typescript
export function stewardsPhase(state: GameState): void {
  for (const race of state.completedRaces ?? []) {
    const playerHorseIds = new Set(state.playerHorses.map((h) => h.id));
    const hasPlayerEntry = race.entries?.some((e) => playerHorseIds.has(e.horseId));

    if (hasPlayerEntry) continue; // handled by useStewardsInquiry hook in the UI

    // ... existing NPC stewards logic
  }
}
```

- [ ] **Commit:**

```bash
git add src/core/time/phases/stewardsPhase.ts
git commit -m "feat(stewards): guard stewardsPhase — skip races with player entries to prevent double-resolution"
```

---

## Task 8: Auto-sim path — inbox message for auto-resolved races

**Files:**

- Modify: `src/core/time/phases/stewardsPhase.ts`

- [ ] **Step 1: When auto-resolving a player race (no live viewer)**

When the player has advanced days without watching a race (auto-sim), the pipeline should handle the stewards check for player races. Add a secondary code path that fires when `state.day > race.raceDay` and `state.pendingInquiry == null` (the UI never picked it up):

```typescript
// Auto-resolve path for player races that weren't watched live
if (hasPlayerEntry && !state.pendingInquiry) {
  const probability = calculateInquiryProbability({
    grade: race.grade,
    isPhotoFinish: race.isPhotoFinish,
  });
  if (Math.random() < probability) {
    // auto-resolve with random outcome
    const outcome = resolveOutcomeRandom();
    if (outcome !== "no_change") {
      state.inbox.push({
        day: state.day,
        text: `STEWARDS RULING (${race.name}): ${outcome === "demotion" ? "Your horse was demoted." : "Your horse was disqualified."}`,
      });
    }
  }
}
```

- [ ] **Commit:**

```bash
git add src/core/time/phases/stewardsPhase.ts
git commit -m "feat(stewards): add auto-sim path for player races — auto-resolve inquiry and post inbox message"
```

---

## Task 9: Add CSS animations for inquiry overlay

**Files:**

- Modify: `src/styles.css`

- [ ] **Step 1: Add overlay styles and reviewing animation**

```css
.stewards-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: inquiry-appear 0.3s ease;
}

@keyframes inquiry-appear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.inquiry-reviewing h2 {
  color: #fbbf24;
  font-size: 2rem;
  letter-spacing: 0.1em;
  text-align: center;
}

.reviewing-beat {
  animation: dots-pulse 1.5s infinite;
}

@keyframes dots-pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

.outcome-clear {
  color: #22c55e;
}
.outcome-warn {
  color: #f59e0b;
}
.outcome-severe {
  color: #ef4444;
  animation: finish-flash 0.5s 3;
}
```

- [ ] **Commit:**

```bash
git add src/styles.css
git commit -m "feat(stewards): add CSS animations for inquiry overlay — reviewing pulse and outcome color coding"
```

---

## Task 10: Integration tests

**Files:**

- Create: `src/tests/core/racing/inquiryProbability.test.ts` (already in Task 2)
- Create: `src/tests/game/store/stewardsActions.test.ts`

- [ ] **Step 1: Store action tests**

```typescript
it("dismissInquiry clears pendingInquiry from state", () => { ... });
it("dismissInquiry with disqualification applies reputation penalty", () => { ... });
it("dismissInquiry is idempotent — second call is no-op", () => { ... });
it("setPendingInquiry sets pendingInquiry in state", () => { ... });
```

- [ ] **Run all stewards tests**

```bash
bunx vitest run src/tests/core/racing/inquiryProbability.test.ts src/tests/game/store/stewardsActions.test.ts
```

- [ ] **Commit:**

```bash
git add src/tests/game/store/stewardsActions.test.ts
git commit -m "test(stewards): add dismissInquiry idempotency and disqualification reputation tests"
```

---

## Verification (whole-plan)

- [ ] `bunx vitest run src/tests/core/racing/inquiryProbability.test.ts` — all probability tests pass
- [ ] `bunx vitest run src/tests/game/store/stewardsActions.test.ts` — all store action tests pass
- [ ] `bun run typecheck` — no TypeScript errors
- [ ] Manual — watch a live race. After completion, verify the 2500ms "Reviewing" overlay appears ~5% of the time (or more for G1/photo finish).
- [ ] Manual — wait for "RESULT STANDS" announcement and auto-dismiss. Confirm race result is unchanged.
- [ ] Manual — trigger a disqualification. Confirm reputation drops by 10 and a log message appears.
- [ ] Manual — advance days without watching a race (auto-sim). If an inquiry fires, confirm inbox message appears.
- [ ] Manual — confirm NPC-only races still resolve via `stewardsPhase` without UI interaction.

---

### Critical Files for Implementation

- `/src/core/racing/inquiryProbability.ts`
- `/src/hooks/useStewardsInquiry.ts`
- `/src/components/race/StewardsInquiryOverlay.tsx`
- `/src/game/store/slices/racingSlice.ts`
- `/src/core/time/phases/stewardsPhase.ts`
- `/src/routes/race.$raceId.tsx`
