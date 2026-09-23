# Guided First Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take a brand-new player from "Begin" to "I won/lost a race and I understand what the number means" without reading a manual — a five-beat guided opening delivered through the dashboard's existing next-action rail.

**Architecture:** A tiny persisted `tutorial` slice tracks progress. A pure `deriveTutorialStep(state)` decides which beat is current from real game state (not a click counter), so the guide self-corrects if the player wanders. While the tutorial is active, `deriveNextAction` yields to the tutorial beat, so the existing `NextActionBanner` becomes the teaching surface — no new navigation, no modal gauntlet. One new component explains the race result (what a Beyer _is_) at the moment the player first earns one.

**Tech Stack:** React 19, Zustand (store slice + persistence), TanStack Router, the existing `NextActionBanner` / `deriveNextAction`, Vitest.

---

## Context

Gallop has **zero onboarding code** — a grep for `tutorial|coachmark|walkthrough|guided` across `src/` returns nothing. The new-game wizard (identity → silks → backstory → review) is _character creation_, not teaching. A new player lands on a "Command Center" dashboard with nine widgets, a sidebar of ~18 destinations, and 54 routes behind it, having been told nothing about what to do.

This gap has now been the #1 product finding in three consecutive assessments, and it got _worse_ as the sim deepened: there is more to be confused by, not less. Meanwhile the product's own success criterion is "a new player can enter their first race and understand what the result means within their first 10 minutes."

Two things landed recently that make this cheap to build now:

- **`NextActionBanner`** ([src/components/dashboard/NextActionBanner.tsx](src/components/dashboard/NextActionBanner.tsx)) — a prominent, single-CTA banner at the top of the dashboard, fed by the pure `deriveNextAction` ([src/core/dashboard/nextAction.ts](src/core/dashboard/nextAction.ts)). That is exactly the rail a tutorial needs, already built and shipped.
- **The race broadcast** (preshow → live → review) gives a natural teaching moment at the result.

So this is mostly wiring plus one explainer, not a new subsystem.

**Design stance — teach by doing, never block.** No modal takeover, no forced click-path. The banner _suggests_ the next beat and the player can ignore it; the derived-from-state design means if they go breed a horse instead, the guide simply picks up where they actually are. A visible "Skip tutorial" affordance is mandatory — veterans starting their fifth stable must not be nagged.

**Outcome:** A first-time player is walked to their first race and shown what the result means, in the flow of the real UI.

---

## The five beats

| #   | Beat                                   | Done when (derived from state)                   |
| --- | -------------------------------------- | ------------------------------------------------ |
| 1   | Meet your stable — open a horse's page | player has visited any `/stable/$horseId`        |
| 2   | Enter your first race                  | any owned horse is entered in an unresolved race |
| 3   | Watch it run                           | that race is resolved                            |
| 4   | Read the result — what a Beyer is      | the result explainer has been acknowledged       |
| 5   | Advance the day                        | `day` has advanced past the entry day            |

Beat completion is inferred from game state wherever possible; only beats 1 and 4 need an explicit flag (visiting a page and dismissing an explainer leave no other trace).

---

## File Structure

**New files**

- `src/core/tutorial/tutorialSteps.ts` — `TutorialStep` type, the beat table, and pure `deriveTutorialStep(input)`.
- `src/game/store/slices/tutorialSlice.ts` — persisted progress + actions.
- `src/components/tutorial/TutorialBanner.tsx` — the beat CTA (rendered by the dashboard in place of the normal next action).
- `src/components/race/BeyerExplainer.tsx` — the post-race "what this number means" card.
- Tests: `src/tests/core/tutorial/tutorialSteps.test.ts`.

**Modified files**

- `src/game/store/index.ts` — register the slice + persist key.
- `src/routes/index.tsx` — render `TutorialBanner` when a tutorial step is active, else the existing `NextActionBanner`.
- `src/routes/stable.$horseId.tsx` — mark beat 1 seen on mount.
- `src/routes/race.$raceId.tsx` — render `BeyerExplainer` in the review phase during the tutorial.

**Reused as-is:** `NextActionBanner` styling/shape, `deriveNextAction`, `JARGON_DEFINITIONS` + `JargonTooltip`, the race review phase.

---

## Conventions

- Store slices live in `src/game/store/slices/`; persisted keys are listed in `src/game/store/index.ts`. Follow an existing slice (e.g. `settingsSlice`) for shape.
- Selectors must be stable: use `useGameWithShallow` for object/array reads, or select primitives. An unstable `useGame((s) => s.x ?? {})` will hard-loop the dashboard — the ESLint guardrail will catch it.
- Run one test: `bunx vitest run <path>`.

---

## Task 1: `deriveTutorialStep` (pure)

**Files:** Create `src/core/tutorial/tutorialSteps.ts`; test `src/tests/core/tutorial/tutorialSteps.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/core/tutorial/tutorialSteps.test.ts
import { describe, it, expect } from "vitest";
import { deriveTutorialStep, type TutorialInput } from "@/core/tutorial/tutorialSteps";

const fresh: TutorialInput = {
  active: true,
  visitedHorsePage: false,
  hasEnteredRace: false,
  hasResolvedRace: false,
  acknowledgedResult: false,
  dayAdvancedSinceEntry: false,
};

describe("deriveTutorialStep", () => {
  it("starts by sending the player to a horse page", () => {
    expect(deriveTutorialStep(fresh)?.id).toBe("meet-stable");
  });

  it("advances to entering a race once a horse page has been seen", () => {
    expect(deriveTutorialStep({ ...fresh, visitedHorsePage: true })?.id).toBe("enter-race");
  });

  it("asks the player to watch the race once one is entered", () => {
    expect(deriveTutorialStep({ ...fresh, visitedHorsePage: true, hasEnteredRace: true })?.id).toBe(
      "watch-race",
    );
  });

  it("explains the result after the race resolves", () => {
    expect(
      deriveTutorialStep({
        ...fresh,
        visitedHorsePage: true,
        hasEnteredRace: true,
        hasResolvedRace: true,
      })?.id,
    ).toBe("read-result");
  });

  it("finishes with advancing the day, then returns null when complete", () => {
    const nearlyDone = {
      ...fresh,
      visitedHorsePage: true,
      hasEnteredRace: true,
      hasResolvedRace: true,
      acknowledgedResult: true,
    };
    expect(deriveTutorialStep(nearlyDone)?.id).toBe("advance-day");
    expect(deriveTutorialStep({ ...nearlyDone, dayAdvancedSinceEntry: true })).toBeNull();
  });

  it("returns null when the tutorial is inactive (skipped or veteran player)", () => {
    expect(deriveTutorialStep({ ...fresh, active: false })).toBeNull();
  });

  it("self-corrects if the player skips ahead on their own", () => {
    // Never opened a horse page but already entered a race — don't send them backwards.
    expect(deriveTutorialStep({ ...fresh, hasEnteredRace: true })?.id).toBe("watch-race");
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`bunx vitest run src/tests/core/tutorial/tutorialSteps.test.ts`) — module not found.

- [ ] **Step 3: Implement**

```ts
// src/core/tutorial/tutorialSteps.ts
export interface TutorialInput {
  active: boolean;
  visitedHorsePage: boolean;
  hasEnteredRace: boolean;
  hasResolvedRace: boolean;
  acknowledgedResult: boolean;
  dayAdvancedSinceEntry: boolean;
}

export type TutorialStepId =
  | "meet-stable"
  | "enter-race"
  | "watch-race"
  | "read-result"
  | "advance-day";

export interface TutorialStep {
  id: TutorialStepId;
  label: string;
  detail: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
}

/**
 * Decide which tutorial beat is current, derived from real game state rather
 * than a click counter — so a player who wanders off (or does a step in their
 * own order) is never sent backwards or stuck.
 *
 * Checks run latest-beat-first for exactly that reason.
 *
 * @param input - tutorial flags plus derived game signals
 * @returns the current step, or null when the tutorial is complete or inactive
 */
export function deriveTutorialStep(input: TutorialInput): TutorialStep | null {
  if (!input.active) return null;

  if (input.dayAdvancedSinceEntry) return null;

  if (input.acknowledgedResult) {
    return {
      id: "advance-day",
      label: "Advance to the next day",
      detail: "Time moves the season forward — training, rivals, and new races all tick over.",
      to: "/",
    };
  }

  if (input.hasResolvedRace) {
    return {
      id: "read-result",
      label: "See how your horse ran",
      detail: "Your first result is in. Find out what the Beyer figure actually means.",
      to: "/racing",
      search: { tab: "races" },
    };
  }

  if (input.hasEnteredRace) {
    return {
      id: "watch-race",
      label: "Watch your race",
      detail: "Your runner is entered. Open race day and start the broadcast.",
      to: "/racing",
      search: { tab: "races" },
    };
  }

  if (input.visitedHorsePage) {
    return {
      id: "enter-race",
      label: "Enter your first race",
      detail: "Pick a race your horse is eligible for and put them in the field.",
      to: "/racing",
      search: { tab: "races" },
    };
  }

  return {
    id: "meet-stable",
    label: "Meet your horses",
    detail: "Open a horse to see its stats, aptitude, and where it came from.",
    to: "/stable",
  };
}
```

- [ ] **Step 4: Run — expect PASS** (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/tutorial src/tests/core/tutorial
git commit -m "feat(tutorial): derive the current onboarding beat from game state"
```

---

## Task 2: Tutorial store slice

**Files:** Create `src/game/store/slices/tutorialSlice.ts`; modify `src/game/store/index.ts`

- [ ] **Step 1: Read an existing slice for the house pattern**

Run: `sed -n '1,40p' src/game/store/slices/settingsSlice.ts` and note how state + actions are declared and how the slice is composed in `src/game/store/index.ts`.

- [ ] **Step 2: Write the slice**

```ts
// src/game/store/slices/tutorialSlice.ts
export interface TutorialState {
  /** False once the player finishes or explicitly skips. Veterans start new games with it on; skipping is one click. */
  tutorialActive: boolean;
  tutorialVisitedHorsePage: boolean;
  tutorialAcknowledgedResult: boolean;
  /** Day the player entered their first race; used to detect "advanced the day". */
  tutorialFirstEntryDay: number | null;
}

export interface TutorialActions {
  markTutorialHorsePageSeen: () => void;
  markTutorialResultAcknowledged: () => void;
  markTutorialFirstEntry: (day: number) => void;
  skipTutorial: () => void;
}

export const tutorialInitialState: TutorialState = {
  tutorialActive: true,
  tutorialVisitedHorsePage: false,
  tutorialAcknowledgedResult: false,
  tutorialFirstEntryDay: null,
};

/**
 * Tutorial progress slice. Only the beats that leave no other trace in game
 * state are stored here — everything else is derived (see deriveTutorialStep).
 *
 * @param set - zustand setter
 * @returns tutorial state and actions
 */
export const createTutorialSlice = (
  set: (fn: (s: TutorialState) => Partial<TutorialState>) => void,
): TutorialState & TutorialActions => ({
  ...tutorialInitialState,
  markTutorialHorsePageSeen: () => set(() => ({ tutorialVisitedHorsePage: true })),
  markTutorialResultAcknowledged: () => set(() => ({ tutorialAcknowledgedResult: true })),
  markTutorialFirstEntry: (day: number) =>
    set((s) => (s.tutorialFirstEntryDay === null ? { tutorialFirstEntryDay: day } : {})),
  skipTutorial: () => set(() => ({ tutorialActive: false })),
});
```

Adapt the `set` signature to whatever the existing slices use (they may take `(set, get)` with a different shape) — match the house pattern rather than this sketch.

- [ ] **Step 3: Register it**

In `src/game/store/index.ts`: spread `createTutorialSlice(...)` into the store like the other slices, and add the four keys (`tutorialActive`, `tutorialVisitedHorsePage`, `tutorialAcknowledgedResult`, `tutorialFirstEntryDay`) to the persisted-keys list so progress survives a reload.

- [ ] **Step 4: Verify + commit**

```bash
bunx tsc --noEmit
bun run test
git add src/game/store
git commit -m "feat(tutorial): persisted tutorial progress slice"
```

---

## Task 3: `TutorialBanner` on the dashboard

**Files:** Create `src/components/tutorial/TutorialBanner.tsx`; modify `src/routes/index.tsx`

- [ ] **Step 1: Build the banner**

Model it on `NextActionBanner` so it reads as the same rail rather than a foreign tutorial overlay — same card shape, same "Next up" affordance, plus a step counter and a skip link.

```tsx
// src/components/tutorial/TutorialBanner.tsx
import { Link } from "@tanstack/react-router";
import { ChevronRight, GraduationCap } from "lucide-react";
import type { TutorialStep } from "@/core/tutorial/tutorialSteps";

const ORDER: TutorialStep["id"][] = [
  "meet-stable",
  "enter-race",
  "watch-race",
  "read-result",
  "advance-day",
];

export function TutorialBanner({ step, onSkip }: { step: TutorialStep; onSkip: () => void }) {
  const position = ORDER.indexOf(step.id) + 1;

  return (
    <div className="border border-gold/40 bg-gold/5 rounded-lg p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold shrink-0">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/60">
            Getting started · {position} of {ORDER.length}
          </div>
          <div className="text-lg font-bold text-cream font-[family-name:var(--font-display)] truncate">
            {step.label}
          </div>
          <div className="text-sm text-cream-muted">{step.detail}</div>
        </div>
        <Link
          to={step.to}
          params={step.params as never}
          search={step.search as never}
          className="shrink-0 inline-flex items-center gap-1 px-4 h-10 bg-gold text-slate-950 font-black uppercase tracking-wider text-xs"
        >
          Go
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <button
        onClick={onSkip}
        className="mt-2 text-[10px] font-mono uppercase tracking-widest text-cream/30 hover:text-cream/60"
      >
        Skip tutorial
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the dashboard**

In `src/routes/index.tsx`, compute the tutorial step and render it _instead of_ `NextActionBanner` when one is active (the tutorial is a more specific answer to "what next?", so it takes precedence; when it completes, the normal banner returns automatically):

```tsx
const tutorialActive = useGame((s) => s.tutorialActive);
const visitedHorsePage = useGame((s) => s.tutorialVisitedHorsePage);
const acknowledgedResult = useGame((s) => s.tutorialAcknowledgedResult);
const firstEntryDay = useGame((s) => s.tutorialFirstEntryDay);
const skipTutorial = useGame((s) => s.skipTutorial);

const tutorialStep = deriveTutorialStep({
  active: tutorialActive,
  visitedHorsePage,
  hasEnteredRace: Boolean(nextOwnedRace) || firstEntryDay !== null,
  hasResolvedRace: ownedHorses.some((h) => (h.raceHistory?.length ?? 0) > 0),
  acknowledgedResult,
  dayAdvancedSinceEntry: firstEntryDay !== null && day > firstEntryDay,
});
```

```tsx
{
  tutorialStep ? (
    <TutorialBanner step={tutorialStep} onSkip={skipTutorial} />
  ) : (
    <NextActionBanner action={nextAction} />
  );
}
```

> Confirm the field used for "has raced" (`h.raceHistory`) against `src/core/horse/types.ts`; use whatever the horse actually carries. Select **primitives** as above — do not introduce an object-returning `useGame` selector here or the dashboard will loop.

- [ ] **Step 3: Mark beat 1 when a horse page opens**

In `src/routes/stable.$horseId.tsx`, inside the component:

```tsx
const markSeen = useGame((s) => s.markTutorialHorsePageSeen);
useEffect(() => {
  markSeen();
}, [markSeen]);
```

- [ ] **Step 4: Verify in the preview**

Follow `.claude/skills/verify-gallop/references/preview-runtime.md`: start a **new game**, confirm the dashboard shows "Getting started · 1 of 5 — Meet your horses", click through to a horse, return to the dashboard and confirm it advanced to "Enter your first race". Confirm "Skip tutorial" hides it and the normal `NextActionBanner` returns. Check the live error counter reads 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/tutorial src/routes/index.tsx src/routes/stable.\$horseId.tsx
git commit -m "feat(tutorial): guided beats on the dashboard next-action rail"
```

---

## Task 4: The Beyer explainer (the payoff beat)

This is the beat that satisfies "understands what the result means." Everything before it is navigation; this is the teaching.

**Files:** Create `src/components/race/BeyerExplainer.tsx`; modify `src/routes/race.$raceId.tsx`

- [ ] **Step 1: Build the explainer**

```tsx
// src/components/race/BeyerExplainer.tsx
import { Button } from "@/components/ui/button";
import { JargonTooltip } from "@/components/ui/JargonTooltip";

/**
 * Shown once, after the player's first finished race. The goal is not to teach
 * the whole rating system — it's to make one number mean something, so every
 * future Beyer the player sees carries information instead of being noise.
 */
export function BeyerExplainer({
  horseName,
  beyer,
  finishPosition,
  onAcknowledge,
}: {
  horseName: string;
  beyer: number | null;
  finishPosition: number | null;
  onAcknowledge: () => void;
}) {
  return (
    <div className="border border-gold/40 bg-black/40 rounded-lg p-6 space-y-3 max-w-xl">
      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gold">Your first result</h3>
      <p className="text-cream">
        {horseName} finished{" "}
        <span className="font-bold">{finishPosition ? `${finishPosition}` : "—"}</span>
        {beyer !== null && (
          <>
            {" "}
            with a <JargonTooltip term="Beyer">Beyer</JargonTooltip> figure of{" "}
            <span className="font-mono font-bold text-gold">{beyer}</span>.
          </>
        )}
      </p>
      <p className="text-sm text-cream-muted">
        A Beyer figure rates how fast a run actually was, adjusted for the track and the day's going
        — so you can compare two races run weeks apart at different courses. Roughly: 80 is a solid
        local runner, 100 is stakes class, 110+ is a champion. Watch whether your horse's Beyers
        trend <em>up</em> as it trains and matures; that trend matters more than any single race.
      </p>
      <Button onClick={onAcknowledge} className="bg-gold text-slate-950 font-black uppercase">
        Got it
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Render it in the race review phase**

In `src/routes/race.$raceId.tsx`, in the `review` phase only, when `tutorialActive && !tutorialAcknowledgedResult` and the race includes an owned runner, render `BeyerExplainer` (above the Post-race analysis reveal) wired to `markTutorialResultAcknowledged`. Pull the owned runner's finish position and Beyer from the resolved race data already available on that screen.

- [ ] **Step 3: Confirm the Beyer glossary term exists**

Run: `grep -n "Beyer" src/constants/jargon.ts`
It should already be defined (the glossary has ~73 terms including Beyer). If missing, add it.

- [ ] **Step 4: Verify end-to-end in the preview**

New game → follow the banner → enter a race → watch it → confirm the explainer appears with the real finish position and Beyer, "Got it" dismisses it, and the dashboard banner advances to "Advance to the next day". Live error counter 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/race/BeyerExplainer.tsx src/routes/race.\$raceId.tsx
git commit -m "feat(tutorial): explain the first Beyer figure at the moment it's earned"
```

---

## Task 5: Don't nag returning players

- [ ] **Step 1: Default the tutorial off for experienced saves**

A player who already has race history when the tutorial slice first appears (i.e. an existing save being migrated) should not suddenly be told to meet their horses. In the store's hydration/migration path, set `tutorialActive: false` when the loaded save has any horse with race history or `day > 30`. Find the migration/hydration seam with:

Run: `grep -rn "migrate\|version\|hydrate" src/game/store/index.ts src/services/storage/*.ts | head`

- [ ] **Step 2: Add a settings toggle**

In `src/routes/settings.tsx`, add a "Replay tutorial" control that resets the slice to `tutorialInitialState`. Cheap, and it makes the feature testable by hand forever.

- [ ] **Step 3: Verify + commit**

```bash
bunx tsc --noEmit && bun run test
git add -A
git commit -m "feat(tutorial): skip for existing saves; add replay toggle in settings"
```

---

## Verification (whole-plan)

- [ ] `bunx vitest run src/tests/core/tutorial/tutorialSteps.test.ts` — 7 tests pass.
- [ ] `bun run test` / `bunx tsc --noEmit` / `bun run lint` — all green.
- [ ] **The real test — a cold run:** start a new game and follow only the banner. You should reach a finished race and a Beyer explanation without ever using the sidebar. Time it; the product target is under 10 minutes.
- [ ] Skipping works, and the normal `NextActionBanner` returns afterwards.
- [ ] An existing save does not show the tutorial.
- [ ] Preview live error counter is 0 on the dashboard and race screens (no selector loops introduced).

## Self-review notes

- **Spec coverage:** Improvement #3 = "scripted opening — one promising 2yo, an arrow to one race, a post-race 'here's what that Beyer means', delivered via the NextActionBanner rail." Tasks 1–3 = the arrow; Task 4 = the Beyer explanation; Task 5 = not annoying veterans.
- **Why derive-from-state rather than a step counter:** players don't follow scripts. Deriving the beat means wandering off never breaks or repeats the guide, and the "self-corrects" test pins that behavior.
- **Deliberately not built:** a modal takeover, a multi-page tour, or forced click-blocking. Those get skipped by veterans and resented by newcomers; the banner is already the place players look for "what next".
- **Loop risk called out inline** (Task 3 Step 2): the dashboard is the exact screen that hard-looped twice this month; primitive selectors only.
- **Confirm against real code:** slice `set` signature (Task 2 Step 1), horse race-history field name (Task 3 Step 2), store migration seam (Task 5 Step 1).
