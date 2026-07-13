# Foal-to-Racehorse Development Arc — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each bred foal a meaningful developmental journey before it becomes a trainable racehorse. Currently foals are born and immediately available for training. This plan adds two time-gated milestone phases — **Breaking In** (day `birthDay + 18`) and **Early Workouts** (day `birthDay + 24`) — each of which presents the player with 3 choices that have permanent stat impacts. A new `FoalDevelopmentArc` type is added to the `Horse` model. A new `/foal-development/$horseId` route lets the player resolve open milestones. A `FoalDevelopmentPanel` component on the existing stable page shows "Pre-Race Prep" status for young horses.

**Architecture:** The development arc is modeled as a value object on `Horse`. The pipeline phase `foalDevelopmentPhase` (order 71) fires once per day, detects horses at their milestone days, enqueues inbox messages that link to the resolution UI, and does nothing else — no state mutation until the player makes a choice. The resolution UI component calls a new `resolveFoalMilestone(horseId, milestoneKey, choiceKey)` store action that applies the stat delta and marks the milestone as resolved. The route is a lazy-loaded page under the existing TanStack Router file-based route tree.

**Tech Stack:** TypeScript, Zustand (new action in `racingSlice.ts`), TanStack Router (new route file `src/routes/foal-development.$horseId.tsx`), React 19, Vitest/Bun for tests; no new libraries.

---

## Context

The existing horse breeding pipeline produces foals with a `birthDay` field and assigns them a `coatColor`, name, and genetic stats immediately. There is no concept of "training readiness" gating for young horses. The player can assign training intents to a 0-day-old foal.

Horses already have an optional `developmentPhase?: string` flag used in breeding display, but there is no formal `FoalDevelopmentArc` structure. The inbox system (`InboxMessage` type, `addInboxMessage` action) is already in place and used by the injury/recovery pipeline — this plan reuses it directly.

The pipeline phase order for reference: `retirementPhase=30`, `auctionPhase=50`, `raceEntryPhase=60`, `trainingResolution=70`, `foalDevelopmentPhase=71 (new)`, `raceResultPhase=80`.

---

## File Structure

**New files:**

- `src/types/foalDevelopment.ts` — `FoalDevelopmentArc`, `FoalMilestone`, `MilestoneChoice` types
- `src/core/time/phases/foalDevelopmentPhase.ts` — pipeline phase that emits inbox messages at milestone days
- `src/routes/foal-development.$horseId.tsx` — TanStack Router route for resolution UI
- `src/components/horse/FoalDevelopmentPanel.tsx` — "Pre-Race Prep" panel shown on stable page for young horses
- `src/tests/core/time/phases/foalDevelopment.test.ts` — unit tests for the phase

**Modified files:**

- `src/types/horse.ts` — add `developmentArc?: FoalDevelopmentArc` to `Horse`
- `src/core/breeding/foalFactory.ts` — initialize `developmentArc` when a foal is born
- `src/game/store/slices/racingSlice.ts` — add `resolveFoalMilestone` action
- `src/core/time/pipeline.ts` — register `foalDevelopmentPhase` at order 71
- `src/components/horse/StableHorseDetail.tsx` — mount `FoalDevelopmentPanel` for horses with an open arc
- `src/constants/gameConstants.ts` — add `FOAL_BREAKING_IN_DAY = 18`, `FOAL_EARLY_WORKOUTS_DAY = 24`

---

## Conventions (read before starting)

- `birthDay` on `Horse` is the game day when the foal was born (set by `foalFactory.ts` at breeding resolution). Milestones fire on `birthDay + FOAL_BREAKING_IN_DAY` and `birthDay + FOAL_EARLY_WORKOUTS_DAY`.
- Choices have a `delta` object (`{ speed?: number; stamina?: number; acceleration?: number; consistency?: number }`) applied via simple addition to `horse.stats`. Deltas are small (±1–3 points).
- The pipeline phase only READS game state and EMITS inbox messages — it does not mutate horse stats. Stat mutation happens in the store action when the player confirms a choice.
- The resolution UI is a full page route, not a modal, to allow reading the horse's current stats and making an informed decision.
- TanStack Router file-based routing: the new file `src/routes/foal-development.$horseId.tsx` automatically creates the `/foal-development/$horseId` route. Import from `@tanstack/react-router`.
- All three choices per milestone should be meaningfully different: one speed-biased, one stamina-biased, one resilience/consistency-biased.
- Once a milestone is resolved, it is marked `status: "resolved"` and can never be re-resolved. The store action must be idempotent for this reason.
- Test file convention: `src/tests/core/<module>/<filename>.test.ts`.

---

## Task 1: Define FoalDevelopmentArc types and constants

**Files:**

- Create: `src/types/foalDevelopment.ts`
- Modify: `src/types/horse.ts`
- Modify: `src/constants/gameConstants.ts`

- [ ] **Step 1: Create foalDevelopment types**

Create `src/types/foalDevelopment.ts`:

```typescript
export type MilestoneStatus = "pending" | "resolved" | "expired";

export interface MilestoneChoice {
  key: string;
  label: string;
  description: string;
  delta: {
    speed?: number;
    stamina?: number;
    acceleration?: number;
    consistency?: number;
  };
}

export interface FoalMilestone {
  key: "breaking_in" | "early_workouts";
  label: string;
  triggerDay: number; // absolute game day (birthDay + offset)
  status: MilestoneStatus;
  choices: MilestoneChoice[];
  resolvedChoiceKey?: string;
}

export interface FoalDevelopmentArc {
  milestones: FoalMilestone[];
}
```

- [ ] **Step 2: Add developmentArc to Horse type**

In `src/types/horse.ts`, add:

```typescript
developmentArc?: FoalDevelopmentArc;
```

- [ ] **Step 3: Add milestone offset constants**

In `src/constants/gameConstants.ts`, add:

```typescript
export const FOAL_BREAKING_IN_DAY = 18;
export const FOAL_EARLY_WORKOUTS_DAY = 24;
```

- [ ] **Commit:**

```bash
git add src/types/foalDevelopment.ts src/types/horse.ts src/constants/gameConstants.ts
git commit -m "feat(foal): define FoalDevelopmentArc types and milestone offset constants"
```

---

## Task 2: Initialize development arc in foalFactory

**Files:**

- Modify: `src/core/breeding/foalFactory.ts`

- [ ] **Step 1: Build default milestone choices**

Add a `createDefaultMilestones(birthDay: number): FoalMilestone[]` pure function in `foalFactory.ts`:

```typescript
function createDefaultMilestones(birthDay: number): FoalMilestone[] {
  return [
    {
      key: "breaking_in",
      label: "Breaking In",
      triggerDay: birthDay + FOAL_BREAKING_IN_DAY,
      status: "pending",
      choices: [
        {
          key: "bold_approach",
          label: "Bold Approach",
          description: "Push the foal hard in early sessions. Builds speed and acceleration.",
          delta: { speed: 2, acceleration: 2, stamina: -1 },
        },
        {
          key: "patient_method",
          label: "Patient Method",
          description: "Slow, trust-building sessions. Builds consistency and stamina.",
          delta: { consistency: 2, stamina: 2, speed: -1 },
        },
        {
          key: "natural_progression",
          label: "Natural Progression",
          description: "Let the foal set the pace. Balanced development across all stats.",
          delta: { speed: 1, stamina: 1, acceleration: 1 },
        },
      ],
    },
    {
      key: "early_workouts",
      label: "Early Workouts",
      triggerDay: birthDay + FOAL_EARLY_WORKOUTS_DAY,
      status: "pending",
      choices: [
        {
          key: "sprint_focus",
          label: "Sprint Focus",
          description: "Short, explosive work sets. Emphasizes early speed.",
          delta: { speed: 3, stamina: -1 },
        },
        {
          key: "distance_conditioning",
          label: "Distance Conditioning",
          description: "Long slow distance work. Builds the aerobic base.",
          delta: { stamina: 3, speed: -1 },
        },
        {
          key: "gate_familiarization",
          label: "Gate Familiarization",
          description: "Focus on the starting gate and reactive acceleration.",
          delta: { acceleration: 3, consistency: 1 },
        },
      ],
    },
  ];
}
```

- [ ] **Step 2: Attach arc to born foals**

In `createFoal(...)`, after assigning `birthDay`, add:

```typescript
developmentArc: {
  milestones: createDefaultMilestones(birthDay),
},
```

- [ ] **Commit:**

```bash
git add src/core/breeding/foalFactory.ts
git commit -m "feat(foal): initialize FoalDevelopmentArc with Breaking In and Early Workouts milestones on foal birth"
```

---

## Task 3: Implement foalDevelopmentPhase pipeline phase

**Files:**

- Create: `src/core/time/phases/foalDevelopmentPhase.ts`
- Modify: `src/core/time/pipeline.ts`

- [ ] **Step 1: Write the failing test first**

Create `src/tests/core/time/phases/foalDevelopment.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { foalDevelopmentPhase } from "@/core/time/phases/foalDevelopmentPhase";
import { makeGameState } from "@/tests/helpers";
import { createTestHorse } from "@/tests/factories";

describe("foalDevelopmentPhase", () => {
  it("emits an inbox message on breaking_in trigger day", () => {
    const state = makeGameState({ day: 118 });
    const foal = createTestHorse({
      birthDay: 100,
      developmentArc: {
        milestones: [
          {
            key: "breaking_in",
            triggerDay: 118,
            status: "pending",
            label: "Breaking In",
            choices: [],
          },
        ],
      },
    });
    state.playerHorses = [foal];
    const result = foalDevelopmentPhase(state);
    expect(result.inbox.length).toBeGreaterThan(0);
    expect(result.inbox[0].text).toContain("Breaking In");
  });

  it("does not emit for already resolved milestones", () => {
    const state = makeGameState({ day: 118 });
    const foal = createTestHorse({
      birthDay: 100,
      developmentArc: {
        milestones: [
          {
            key: "breaking_in",
            triggerDay: 118,
            status: "resolved",
            label: "Breaking In",
            choices: [],
            resolvedChoiceKey: "bold_approach",
          },
        ],
      },
    });
    state.playerHorses = [foal];
    const result = foalDevelopmentPhase(state);
    expect(result.inbox.length).toBe(0);
  });

  it("does not mutate horse stats", () => {
    const state = makeGameState({ day: 118 });
    const foal = createTestHorse({ birthDay: 100 });
    const originalSpeed = foal.stats.speed;
    state.playerHorses = [foal];
    foalDevelopmentPhase(state);
    expect(state.playerHorses[0].stats.speed).toBe(originalSpeed);
  });
});
```

- [ ] **Step 2: Implement foalDevelopmentPhase**

Create `src/core/time/phases/foalDevelopmentPhase.ts`:

```typescript
import type { GameState } from "@/types/state";
import type { InboxMessage } from "@/types/inbox";

export function foalDevelopmentPhase(state: GameState): { inbox: InboxMessage[] } {
  const inbox: InboxMessage[] = [];

  for (const horse of state.playerHorses) {
    if (!horse.developmentArc) continue;

    for (const milestone of horse.developmentArc.milestones) {
      if (milestone.status !== "pending") continue;
      if (milestone.triggerDay !== state.day) continue;

      inbox.push({
        id: `foal-milestone-${horse.id}-${milestone.key}-${state.day}`,
        day: state.day,
        type: "foal_milestone",
        text: `${horse.name} is ready for ${milestone.label}. Make a training decision.`,
        link: `/foal-development/${horse.id}`,
        horseId: horse.id,
        read: false,
      });
    }
  }

  return { inbox };
}
```

- [ ] **Step 3: Register in pipeline**

In `src/core/time/pipeline.ts`, import and register:

```typescript
import { foalDevelopmentPhase } from "./phases/foalDevelopmentPhase";

// After trainingResolution (order 70):
{ order: 71, name: "foalDevelopment", phase: foalDevelopmentPhase },
```

- [ ] **Run tests:**

```bash
bun test src/tests/core/time/phases/foalDevelopment.test.ts
```

- [ ] **Commit:**

```bash
git add src/core/time/phases/foalDevelopmentPhase.ts src/core/time/pipeline.ts src/tests/core/time/phases/foalDevelopment.test.ts
git commit -m "feat(foal): add foalDevelopmentPhase at pipeline order 71 — emits inbox message at milestone trigger days"
```

---

## Task 4: Add resolveFoalMilestone store action

**Files:**

- Modify: `src/game/store/slices/racingSlice.ts`

- [ ] **Step 1: Implement resolveFoalMilestone**

```typescript
resolveFoalMilestone: (horseId: string, milestoneKey: string, choiceKey: string) => {
  set((s) => {
    const horseIdx = s.playerHorses.findIndex((h) => h.id === horseId);
    if (horseIdx === -1) return s;

    const horse = s.playerHorses[horseIdx];
    if (!horse.developmentArc) return s;

    const milestoneIdx = horse.developmentArc.milestones.findIndex(
      (m) => m.key === milestoneKey,
    );
    if (milestoneIdx === -1) return s;

    const milestone = horse.developmentArc.milestones[milestoneIdx];
    if (milestone.status !== "pending") return s; // idempotent guard

    const choice = milestone.choices.find((c) => c.key === choiceKey);
    if (!choice) return s;

    const updatedStats = { ...horse.stats };
    for (const [stat, delta] of Object.entries(choice.delta)) {
      if (delta !== undefined) {
        updatedStats[stat as keyof typeof updatedStats] =
          Math.max(0, Math.min(100, (updatedStats[stat as keyof typeof updatedStats] ?? 0) + delta));
      }
    }

    const updatedMilestones = [...horse.developmentArc.milestones];
    updatedMilestones[milestoneIdx] = {
      ...milestone,
      status: "resolved",
      resolvedChoiceKey: choiceKey,
    };

    const updatedHorses = [...s.playerHorses];
    updatedHorses[horseIdx] = {
      ...horse,
      stats: updatedStats,
      developmentArc: { milestones: updatedMilestones },
    };

    return {
      playerHorses: updatedHorses,
      log: [
        {
          day: s.day,
          text: `${horse.name}: ${milestone.label} — chose "${choice.label}".`,
        },
        ...s.log,
      ].slice(0, 50),
    };
  });
},
```

- [ ] **Commit:**

```bash
git add src/game/store/slices/racingSlice.ts
git commit -m "feat(foal): add resolveFoalMilestone store action with stat delta application and idempotent guard"
```

---

## Task 5: Build FoalDevelopmentPanel component

**Files:**

- Create: `src/components/horse/FoalDevelopmentPanel.tsx`

- [ ] **Step 1: Build the panel**

```tsx
import React from "react";
import { Link } from "@tanstack/react-router";
import type { Horse } from "@/types/horse";

interface Props {
  horse: Horse;
}

export function FoalDevelopmentPanel({ horse }: Props) {
  const arc = horse.developmentArc;
  if (!arc) return null;

  const openMilestones = arc.milestones.filter((m) => m.status === "pending");
  const resolvedMilestones = arc.milestones.filter((m) => m.status === "resolved");

  return (
    <section className="foal-development-panel">
      <h3>Pre-Race Preparation</h3>
      {openMilestones.length > 0 ? (
        <div className="milestone-alert">
          <p>{openMilestones.length} milestone(s) awaiting your decision.</p>
          <Link to="/foal-development/$horseId" params={{ horseId: horse.id }}>
            Resolve Milestones →
          </Link>
        </div>
      ) : (
        <p className="milestone-complete">All development milestones complete.</p>
      )}
      {resolvedMilestones.length > 0 && (
        <ul className="milestone-history">
          {resolvedMilestones.map((m) => (
            <li key={m.key}>
              <strong>{m.label}:</strong>{" "}
              {m.choices.find((c) => c.key === m.resolvedChoiceKey)?.label ?? m.resolvedChoiceKey}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Commit:**

```bash
git add src/components/horse/FoalDevelopmentPanel.tsx
git commit -m "feat(foal): add FoalDevelopmentPanel showing open milestones and resolution history"
```

---

## Task 6: Build the /foal-development/$horseId route

**Files:**

- Create: `src/routes/foal-development.$horseId.tsx`

- [ ] **Step 1: Create the route component**

```tsx
import React from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useRacingStore } from "@/game/store";
import type { FoalMilestone, MilestoneChoice } from "@/types/foalDevelopment";

export const Route = createFileRoute("/foal-development/$horseId")({
  component: FoalDevelopmentPage,
});

function FoalDevelopmentPage() {
  const { horseId } = Route.useParams();
  const horse = useRacingStore((s) => s.playerHorses.find((h) => h.id === horseId));
  const resolveFoalMilestone = useRacingStore((s) => s.resolveFoalMilestone);

  if (!horse) return <div>Horse not found.</div>;
  if (!horse.developmentArc) return <div>No development arc for this horse.</div>;

  const pendingMilestones = horse.developmentArc.milestones.filter((m) => m.status === "pending");

  if (pendingMilestones.length === 0) {
    return (
      <div className="foal-dev-page">
        <h1>{horse.name} — Development Complete</h1>
        <p>All milestones have been resolved. This horse is ready to train.</p>
      </div>
    );
  }

  const milestone = pendingMilestones[0];

  return (
    <div className="foal-dev-page">
      <h1>{horse.name}</h1>
      <h2>{milestone.label}</h2>
      <p>Choose an approach for this developmental phase:</p>
      <div className="choice-grid">
        {milestone.choices.map((choice: MilestoneChoice) => (
          <button
            key={choice.key}
            className="choice-card"
            onClick={() => resolveFoalMilestone(horse.id, milestone.key, choice.key)}
          >
            <strong>{choice.label}</strong>
            <p>{choice.description}</p>
            <ul>
              {Object.entries(choice.delta)
                .filter(([, v]) => v !== 0)
                .map(([stat, delta]) => (
                  <li key={stat}>
                    {stat}: {(delta as number) > 0 ? "+" : ""}
                    {delta}
                  </li>
                ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Commit:**

```bash
git add src/routes/foal-development.$horseId.tsx
git commit -m "feat(foal): add /foal-development/$horseId route for milestone resolution UI"
```

---

## Task 7: Mount FoalDevelopmentPanel on stable page

**Files:**

- Modify: `src/components/horse/StableHorseDetail.tsx`

- [ ] **Step 1: Conditionally mount the panel**

Import `FoalDevelopmentPanel` and add:

```tsx
{
  horse.developmentArc && <FoalDevelopmentPanel horse={horse} />;
}
```

Place it near the top of the horse detail view, above the training assignment section.

- [ ] **Commit:**

```bash
git add src/components/horse/StableHorseDetail.tsx
git commit -m "feat(foal): mount FoalDevelopmentPanel on stable detail page for horses with an open development arc"
```

---

## Task 8: Handle inbox message link and navigation

**Files:**

- Modify: `src/components/inbox/InboxItem.tsx` (or equivalent)

- [ ] **Step 1: Ensure InboxMessage.link is rendered as a navigable link**

The inbox item renderer should detect `message.link` and render a `<Link>` or navigate on click. If the `InboxMessage` type does not have a `link` field, add it:

```typescript
link?: string;
```

- [ ] **Commit:**

```bash
git commit -m "feat(foal): ensure InboxMessage.link navigates to foal development route"
```

---

## Task 9: Add CSS for foal development UI

**Files:**

- Modify: `src/styles.css`

- [ ] **Step 1: Add base styles for foal development components**

```css
.foal-development-panel {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
}

.milestone-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-warning-bg, #fff8e6);
  padding: 8px;
  border-radius: 4px;
}

.foal-dev-page .choice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.choice-card {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  background: var(--color-card-bg, #fff);
  transition: border-color 0.15s;
}

.choice-card:hover {
  border-color: var(--color-accent, #6366f1);
}

.milestone-history {
  list-style: none;
  padding: 0;
  margin-top: 8px;
}
```

- [ ] **Commit:**

```bash
git add src/styles.css
git commit -m "feat(foal): add CSS for foal development panel and milestone resolution page"
```

---

## Task 10: Integration tests and verification

**Files:**

- Modify: `src/tests/core/time/phases/foalDevelopment.test.ts`
- Modify: `src/tests/game/store/foalMilestone.test.ts` (create)

- [ ] **Step 1: Add store action test**

```typescript
it("resolveFoalMilestone applies stat delta and marks milestone resolved", () => {
  // Set up store with horse that has pending breaking_in milestone
  // Call resolveFoalMilestone(horseId, "breaking_in", "bold_approach")
  // Verify horse.stats.speed increased by 2, stamina decreased by 1
  // Verify milestone.status === "resolved"
  // Verify milestone.resolvedChoiceKey === "bold_approach"
});

it("resolveFoalMilestone is idempotent — second call for same milestone is a no-op", () => {
  // After first resolve, call again with a different choiceKey
  // Verify stats did not change again
});
```

- [ ] **Step 2: Run full test suite for foal-related modules**

```bash
bun test src/tests/core/time/phases/foalDevelopment.test.ts src/tests/game/store/foalMilestone.test.ts
```

- [ ] **Commit:**

```bash
git add src/tests/game/store/foalMilestone.test.ts
git commit -m "test(foal): add store action tests for resolveFoalMilestone idempotency and stat delta"
```

---

## Verification (whole-plan)

- [ ] `bun test src/tests/core/time/phases/foalDevelopment.test.ts` — all phase tests pass
- [ ] `bun test src/tests/game/store/foalMilestone.test.ts` — all store tests pass
- [ ] `bun typecheck` — no TypeScript errors
- [ ] Manual — breed a foal in game. Advance 18 days. Confirm inbox message appears: "[Horse Name] is ready for Breaking In."
- [ ] Manual — click the inbox link. Confirm the `/foal-development/$horseId` page loads with 3 choice cards.
- [ ] Manual — select a choice. Confirm the horse's stats update in the stable page and the `FoalDevelopmentPanel` shows the resolved choice.
- [ ] Manual — advance to day `birthDay + 24`. Confirm second inbox message for Early Workouts.
- [ ] Manual — resolve Early Workouts. Confirm panel shows both milestones resolved.
- [ ] Manual — attempt to resolve an already-resolved milestone (via browser console / store devtools). Confirm no stat change occurs.
- [ ] Manual — confirm foals born before this update (no `developmentArc`) display no panel and encounter no errors.

---

### Critical Files for Implementation

- `/src/types/foalDevelopment.ts`
- `/src/core/breeding/foalFactory.ts`
- `/src/core/time/phases/foalDevelopmentPhase.ts`
- `/src/routes/foal-development.$horseId.tsx`
- `/src/game/store/slices/racingSlice.ts`
- `/src/components/horse/FoalDevelopmentPanel.tsx`
