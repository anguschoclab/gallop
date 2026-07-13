# Training Progression Tree Tied to Facilities — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing facility level system to training availability so that players must invest in barn/facility upgrades to unlock advanced workout types. Starting players (all `basic` facilities) can only assign `speed`, `stamina`, `acceleration`, and `rest`. Upgrading the `barn` to `standard` unlocks `gallop`; `swimming` requires the `exercise_pool` to be built (or upgraded from `undefined`). `breeze` and `gate_work` require `barn` at `premium` and `starting_gates` built respectively. `bullet` and `treadmill` require `barn` at `elite` and the `treadmill` facility respectively. This creates a meaningful capital-investment ladder without changing the underlying training resolution math.

**Architecture:** The gating logic lives in a new pure function `getAvailableTrainingTypes(facilities: PlayerFacilities): TrainingType[]` exported from `src/core/facilities/facilityDefaults.ts` (and re-exported via `index.ts`). `TrainingPanel.tsx` calls this function to derive which basic and advanced options are enabled or locked — replacing the existing `isWorkoutEnabled` call that currently only checks facility presence (not level). The `trainHorse` store action gains a guard that rejects a training type if the facility gates are not met. The NPC intent generator is updated so NPCs only select training types their facility tier supports. A new constant map `TRAINING_FACILITY_REQUIREMENTS` lives in `src/constants/workoutConstants.ts` as the single source of truth for gate rules, imported by both the helper and the UI.

**Tech Stack:** TypeScript, Zustand (store guard in `racingSlice.ts`), React 19 memos (`TrainingPanel.tsx`), Vitest/Bun for tests; no new libraries required.

---

## Context

The facility system already tracks levels (`basic | standard | premium | elite`) and the `FACILITY_ENABLED_WORKOUTS` map already links `exercise_pool → swimming`, `treadmill → treadmill`, and `starting_gates → gate_work`. What is missing is:

1. A barn-level gate for the higher-intensity workouts (`gallop`, `breeze`, `bullet`).
2. A combined check function that merges the barn-level gate with the facility-presence gate (the existing `isWorkoutEnabled` only checks presence, not level).
3. Surfacing the gate state in the UI (locked with a tooltip showing what to build/upgrade) rather than silently hiding locked options.
4. Consistent enforcement in the store action and NPC generator.

The `treadmill` training type is listed in `FACILITY_ENABLED_WORKOUTS` but is NOT present in `ADVANCED_WORKOUTS` in `trainingTypes.ts` (the array only has `bullet`, `breeze`, `gate_work`, `swimming`, `gallop`). It is also absent from `TRAINING_COST_MAP` and `TRAINING_ENERGY_MAP` in `workoutConstants.ts`, and from the `TrainingIntent.trainingType` union in `intents.ts`. Adding full `treadmill` support is therefore part of Task 1.

---

## File Structure

**New files:**

- `src/tests/core/facilities/trainingGating.test.ts` — unit tests for `getAvailableTrainingTypes` and `TRAINING_FACILITY_REQUIREMENTS` (written before implementation)

**Modified files:**

- `src/constants/workoutConstants.ts` — add `treadmill` to `TRAINING_COST_MAP`, `TRAINING_ENERGY_MAP`, `WORKOUT_INTENSITIES`; add `TRAINING_FACILITY_REQUIREMENTS` constant
- `src/constants/trainingTypes.ts` — add `treadmill` to `ADVANCED_WORKOUTS` array
- `src/core/resolver/intents.ts` — add `"treadmill"` to `TrainingIntent.trainingType` union
- `src/core/facilities/facilityDefaults.ts` — add `getAvailableTrainingTypes` function
- `src/core/facilities/index.ts` — re-export `getAvailableTrainingTypes`
- `src/components/horse/TrainingPanel.tsx` — use `getAvailableTrainingTypes`; show locked tooltip; move basic types through same availability gate
- `src/game/store/slices/racingSlice.ts` — add facility gate guard in `trainHorse`
- `src/core/npc/intentGenerators.ts` — pass stable facilities to `selectTrainingType`
- `src/core/ai/trainingAI.ts` — accept optional `availableTypes` parameter in `selectTrainingType`
- `src/tests/core/time/phases/trainingResolution.test.ts` — extend with a test confirming gated intent proceeds without mutation (facilities are not checked in the resolution phase; gating is upstream)

---

## Conventions (read before starting)

- All facility types start at `"basic"` for player stables (`createDefaultPlayerFacilities`). The `exercise_pool`, `treadmill`, and `starting_gates` are all created at `"basic"` level; a `"basic"` facility is effectively "built but ungated". The gating design treats `"basic"` as "present but not high enough to unlock".
- `FACILITY_ENABLED_WORKOUTS` in `facilityTypes.ts` is the existing "presence" map. It should remain unchanged; the new `TRAINING_FACILITY_REQUIREMENTS` map in `workoutConstants.ts` is additive and describes both the required facility AND the minimum level.
- The `TrainingIntent.trainingType` union is the contract between UI, store, and pipeline. Every new training key (`treadmill`) must be added here before the pipeline can process it.
- The resolution phase (`trainingResolution.ts`) does NOT need to change — it already falls back to `workoutConfig.speed` for unknown types, and `treadmill` just needs a `workoutConfig` entry added.
- `BASIC_TRAINING_TYPES` in `trainingTypes.ts` (`speed | stamina | acceleration`) should remain as-is; they become barn-gated through the new helper, not by changing the constant.
- Test file convention: `src/tests/core/<module>/<filename>.test.ts`, using `createTestHorse` and `makeGameState` helpers; import from `@/` aliases.
- Commit messages follow `feat(training):`, `test(training):` prefixes.

---

## Task 1: Add `treadmill` as a full training type

**Files:**

- Modify: `src/constants/workoutConstants.ts`
- Modify: `src/constants/trainingTypes.ts`
- Modify: `src/core/resolver/intents.ts`
- Modify: `src/core/time/phases/trainingResolution.ts`

- [ ] **Step 1: Add treadmill cost and energy to workoutConstants**

In `src/constants/workoutConstants.ts`, add `treadmill: 85` to `TRAINING_COST_MAP`, `treadmill: -14` to `TRAINING_ENERGY_MAP`, and `treadmill: 8` to `WORKOUT_INTENSITIES` (low intensity, controlled environment).

- [ ] **Step 2: Add treadmill to ADVANCED_WORKOUTS**

In `src/constants/trainingTypes.ts`, append to the `ADVANCED_WORKOUTS` array:

```typescript
{
  key: "treadmill",
  label: "Treadmill",
  cost: TRAINING_COST_MAP.treadmill,
  energy: Math.abs(TRAINING_ENERGY_MAP.treadmill),
  stat: "stamina",
},
```

- [ ] **Step 3: Add treadmill to TrainingIntent union**

In `src/core/resolver/intents.ts`, add `"treadmill"` to the `TrainingIntent.trainingType` union:

```typescript
trainingType:
  | "speed"
  | "stamina"
  | "acceleration"
  | "rest"
  | "bullet"
  | "breeze"
  | "gate_work"
  | "swimming"
  | "gallop"
  | "treadmill";
```

- [ ] **Step 4: Add treadmill workoutConfig entry to trainingResolution**

In `src/core/time/phases/trainingResolution.ts`, inside the `workoutConfig` object add:

```typescript
treadmill: {
  primary: "stamina",
  secondary: "acceleration",
  energyCost: -14,
  injuryRisk: 0.2,
  gainBonus: 0.95,
},
```

- [ ] **Commit:**

```bash
git add src/constants/workoutConstants.ts src/constants/trainingTypes.ts src/core/resolver/intents.ts src/core/time/phases/trainingResolution.ts
git commit -m "feat(training): add treadmill as a full training type with cost, energy, and resolution config"
```

---

## Task 2: Add `TRAINING_FACILITY_REQUIREMENTS` constant

**Files:**

- Modify: `src/constants/workoutConstants.ts`

- [ ] **Step 1: Write the failing test first**

Create `src/tests/core/facilities/trainingGating.test.ts` with tests that import `TRAINING_FACILITY_REQUIREMENTS` and `getAvailableTrainingTypes` (both will fail until implemented):

```typescript
import { describe, it, expect } from "vitest";
import { TRAINING_FACILITY_REQUIREMENTS } from "@/constants/workoutConstants";
import { getAvailableTrainingTypes } from "@/core/facilities";
import { createDefaultPlayerFacilities, createFacility } from "@/core/facilities";

describe("TRAINING_FACILITY_REQUIREMENTS", () => {
  it("bullet requires barn elite", () => {
    expect(TRAINING_FACILITY_REQUIREMENTS.bullet).toEqual({
      facilityType: "barn",
      minLevel: "elite",
    });
  });

  it("swimming requires exercise_pool standard", () => {
    expect(TRAINING_FACILITY_REQUIREMENTS.swimming).toEqual({
      facilityType: "exercise_pool",
      minLevel: "standard",
    });
  });

  it("gate_work requires starting_gates standard", () => {
    expect(TRAINING_FACILITY_REQUIREMENTS.gate_work).toEqual({
      facilityType: "starting_gates",
      minLevel: "standard",
    });
  });

  it("treadmill requires treadmill facility standard", () => {
    expect(TRAINING_FACILITY_REQUIREMENTS.treadmill).toEqual({
      facilityType: "treadmill",
      minLevel: "standard",
    });
  });
});

describe("getAvailableTrainingTypes", () => {
  it("basic barn only gives speed/stamina/acceleration/rest", () => {
    const facilities = createDefaultPlayerFacilities(1); // all basic
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("speed");
    expect(available).toContain("stamina");
    expect(available).toContain("acceleration");
    expect(available).toContain("rest");
    expect(available).not.toContain("gallop");
    expect(available).not.toContain("bullet");
  });

  it("standard barn unlocks gallop", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.barn = createFacility("barn", "standard", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("gallop");
  });

  it("standard exercise_pool unlocks swimming", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.exercise_pool = createFacility("exercise_pool", "standard", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("swimming");
  });

  it("premium barn unlocks breeze", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.barn = createFacility("barn", "premium", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("breeze");
  });

  it("premium barn + standard starting_gates unlocks gate_work", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.barn = createFacility("barn", "premium", 1);
    facilities.starting_gates = createFacility("starting_gates", "standard", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("gate_work");
  });

  it("elite barn unlocks bullet", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.barn = createFacility("barn", "elite", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("bullet");
  });

  it("elite barn + standard treadmill facility unlocks treadmill", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.barn = createFacility("barn", "elite", 1);
    facilities.treadmill = createFacility("treadmill", "standard", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("treadmill");
  });
});
```

- [ ] **Step 2: Add TRAINING_FACILITY_REQUIREMENTS to workoutConstants**

Append to `src/constants/workoutConstants.ts`:

```typescript
import type { FacilityType, FacilityLevel } from "@/core/facilities/facilityTypes";

export interface TrainingFacilityRequirement {
  facilityType: FacilityType;
  minLevel: FacilityLevel;
}

/**
 * Maps each gated training type to the facility and minimum level required to unlock it.
 * Training types absent from this map (speed, stamina, acceleration, rest) are always available.
 */
export const TRAINING_FACILITY_REQUIREMENTS: Record<string, TrainingFacilityRequirement> = {
  gallop: { facilityType: "barn", minLevel: "standard" },
  swimming: { facilityType: "exercise_pool", minLevel: "standard" },
  breeze: { facilityType: "barn", minLevel: "premium" },
  gate_work: { facilityType: "starting_gates", minLevel: "standard" },
  bullet: { facilityType: "barn", minLevel: "elite" },
  treadmill: { facilityType: "treadmill", minLevel: "standard" },
};
```

- [ ] **Commit:**

```bash
git add src/constants/workoutConstants.ts src/tests/core/facilities/trainingGating.test.ts
git commit -m "test(training): add failing tests for TRAINING_FACILITY_REQUIREMENTS and getAvailableTrainingTypes"
```

---

## Task 3: Implement `getAvailableTrainingTypes` helper

**Files:**

- Modify: `src/core/facilities/facilityDefaults.ts`
- Modify: `src/core/facilities/index.ts`

- [ ] **Step 1: Add getAvailableTrainingTypes to facilityDefaults**

Add the following pure function after `isWorkoutEnabled` in `src/core/facilities/facilityDefaults.ts`:

```typescript
import { TRAINING_FACILITY_REQUIREMENTS } from "@/constants/workoutConstants";

/**
 * Returns the list of training types available given the player's current facilities.
 *
 * Base types (speed, stamina, acceleration, rest) are always available.
 * Advanced types are unlocked by reaching the minimum facility level defined in
 * TRAINING_FACILITY_REQUIREMENTS.
 *
 * Gate rules (encoded in TRAINING_FACILITY_REQUIREMENTS):
 *  - gallop:    barn >= standard
 *  - swimming:  exercise_pool >= standard
 *  - breeze:    barn >= premium
 *  - gate_work: starting_gates >= standard  (barn >= premium also required)
 *  - bullet:    barn >= elite
 *  - treadmill: treadmill facility >= standard  (barn >= elite also required)
 */
export function getAvailableTrainingTypes(facilities: PlayerFacilities): string[] {
  const LEVEL_ORDER: FacilityLevel[] = ["basic", "standard", "premium", "elite"];

  function meetsLevel(facilityType: FacilityType, minLevel: FacilityLevel): boolean {
    const facility = facilities[facilityType];
    if (!facility) return false;
    return LEVEL_ORDER.indexOf(facility.level) >= LEVEL_ORDER.indexOf(minLevel);
  }

  const barnLevel = facilities.barn?.level ?? "basic";
  const barnRank = LEVEL_ORDER.indexOf(barnLevel);

  const available: string[] = ["speed", "stamina", "acceleration", "rest"];

  for (const [trainingType, req] of Object.entries(TRAINING_FACILITY_REQUIREMENTS)) {
    if (!meetsLevel(req.facilityType, req.minLevel)) continue;

    if (trainingType === "gallop" && barnRank < LEVEL_ORDER.indexOf("standard")) continue;
    if (trainingType === "breeze" && barnRank < LEVEL_ORDER.indexOf("premium")) continue;
    if (trainingType === "gate_work" && barnRank < LEVEL_ORDER.indexOf("premium")) continue;
    if (trainingType === "bullet" && barnRank < LEVEL_ORDER.indexOf("elite")) continue;
    if (trainingType === "treadmill" && barnRank < LEVEL_ORDER.indexOf("elite")) continue;

    available.push(trainingType);
  }

  return available;
}
```

- [ ] **Step 2: Re-export from index.ts**

In `src/core/facilities/index.ts`, add `getAvailableTrainingTypes` to the exports.

- [ ] **Step 3: Run the tests to confirm they pass**

```bash
bun test src/tests/core/facilities/trainingGating.test.ts
```

- [ ] **Commit:**

```bash
git add src/core/facilities/facilityDefaults.ts src/core/facilities/index.ts
git commit -m "feat(training): implement getAvailableTrainingTypes gating logic with barn-level and facility-presence rules"
```

---

## Task 4: Enforce gating in the store's `trainHorse` action

**Files:**

- Modify: `src/game/store/slices/racingSlice.ts`

- [ ] **Step 1: Import and apply the gate in trainHorse**

In `src/game/store/slices/racingSlice.ts`, add:

```typescript
import { getAvailableTrainingTypes } from "@/core/facilities";
```

Inside `trainHorse`, after the existing health/slot/energy checks, add:

```typescript
if (s.facilities) {
  const available = getAvailableTrainingTypes(s.facilities);
  if (!available.includes(kind)) {
    set({
      log: [
        {
          day: s.day,
          text: `Training blocked: ${kind} is not available at your current facility level. Upgrade your barn or build the required facility.`,
        },
        ...s.log,
      ].slice(0, 50),
    });
    return;
  }
}
```

- [ ] **Commit:**

```bash
git add src/game/store/slices/racingSlice.ts
git commit -m "feat(training): enforce facility gate in trainHorse store action with user-facing log message"
```

---

## Task 5: Update TrainingPanel UI to show facility-gated state

**Files:**

- Modify: `src/components/horse/TrainingPanel.tsx`

- [ ] **Step 1: Replace isWorkoutEnabled with getAvailableTrainingTypes**

Replace the import and derive `availableTypes` via `useMemo`:

```typescript
import { getAvailableTrainingTypes } from "@/core/facilities";
import { TRAINING_FACILITY_REQUIREMENTS } from "@/constants/workoutConstants";

const availableTypes = useMemo(
  () =>
    facilities
      ? getAvailableTrainingTypes(facilities)
      : ["speed", "stamina", "acceleration", "rest"],
  [facilities],
);
```

- [ ] **Step 2: Update advanced workout buttons to show unlock hint**

When `!isEnabled`, compute `unlockHint`:

```typescript
const req = TRAINING_FACILITY_REQUIREMENTS[workout.key];
const unlockHint =
  !isEnabled && req ? `Requires ${FACILITY_NAMES[req.facilityType]} (${req.minLevel})` : undefined;
```

Render a `<Lock>` icon and `title={btn.unlockHint}` on locked buttons.

- [ ] **Commit:**

```bash
git add src/components/horse/TrainingPanel.tsx
git commit -m "feat(training): update TrainingPanel to gate advanced workouts by facility level with unlock hints"
```

---

## Task 6: Update NPC training AI to respect facility gates

**Files:**

- Modify: `src/core/ai/trainingAI.ts`
- Modify: `src/core/npc/intentGenerators.ts`

- [ ] **Step 1: Update selectTrainingType signature to accept available types**

Add optional `availableTypes?: string[]` parameter to `selectTrainingType` that restricts the candidate pool when provided.

- [ ] **Step 2: Thread facilities into generateNpcTrainingIntents**

```typescript
import { getAvailableTrainingTypes } from "@/core/facilities";

const availableTypes = stableFacilities
  ? getAvailableTrainingTypes(stableFacilities)
  : ["speed", "stamina", "acceleration", "rest"];

const trainingType = selectTrainingType(trainingAI, horse, day, availableTypes);
```

- [ ] **Commit:**

```bash
git add src/core/ai/trainingAI.ts src/core/npc/intentGenerators.ts
git commit -m "feat(training): make NPC training AI respect facility-gated training type availability"
```

---

## Task 7: Update FACILITY_ENABLED_WORKOUTS

**Files:**

- Modify: `src/core/facilities/facilityTypes.ts`

- [ ] **Step 1: Move barn workouts to barn key**

```typescript
export const FACILITY_ENABLED_WORKOUTS: Record<FacilityType, string[]> = {
  main_track: ["speed", "stamina", "acceleration"],
  barn: ["gallop", "breeze", "bullet"],
  exercise_pool: ["swimming"],
  treadmill: ["treadmill"],
  veterinary_clinic: [],
  starting_gates: ["gate_work"],
  transport: [],
  spa: [],
  nutrition_lab: [],
  rehab_center: [],
};
```

- [ ] **Commit:**

```bash
git add src/core/facilities/facilityTypes.ts
git commit -m "feat(training): move gallop/breeze/bullet to barn in FACILITY_ENABLED_WORKOUTS to match barn-level gate design"
```

---

## Task 8: Integration test and final wiring verification

**Files:**

- Modify: `src/tests/core/time/phases/trainingResolution.test.ts`
- Modify: `src/tests/core/facilities/trainingGating.test.ts`

- [ ] **Step 1: Add a treadmill training resolution test**

Verify a `treadmill` training intent resolves without error and produces an energy impact.

- [ ] **Step 2: Add edge case — swimming not unlocked without exercise_pool upgrade**

```typescript
it("basic exercise_pool does NOT unlock swimming", () => {
  const facilities = createDefaultPlayerFacilities(1);
  const available = getAvailableTrainingTypes(facilities);
  expect(available).not.toContain("swimming");
});
```

- [ ] **Step 3: Run all related tests**

```bash
bun test src/tests/core/facilities/ src/tests/core/time/phases/trainingResolution.test.ts src/tests/game/store/
```

- [ ] **Commit:**

```bash
git add src/tests/core/time/phases/trainingResolution.test.ts src/tests/core/facilities/trainingGating.test.ts
git commit -m "test(training): add treadmill resolution test and swimming-without-upgrade edge case"
```

---

## Verification (whole-plan)

- [ ] `bun test src/tests/core/facilities/` — all `getAvailableTrainingTypes` and `TRAINING_FACILITY_REQUIREMENTS` tests pass
- [ ] `bun test src/tests/core/time/phases/trainingResolution.test.ts` — existing tests still pass, new treadmill test passes
- [ ] `bun test src/tests/game/store/` — facility gate store test passes
- [ ] `bun typecheck` — no TypeScript errors
- [ ] Manual — start with a new game (all `basic` facilities). Navigate to `stable/$horseId`. Confirm only Speed/Stamina/Acceleration/Rest are clickable; all advanced workout buttons show the Lock icon and `title` tooltip.
- [ ] Manual — upgrade barn to `standard` via Facilities screen. Advance day. Return to horse — confirm Gallop button is now unlocked.
- [ ] Manual — upgrade `exercise_pool` to `standard`. Confirm Swimming unlocks.
- [ ] Manual — upgrade barn to `premium`. Confirm Breeze unlocks. Upgrade `starting_gates` to `standard` — confirm Gate Work unlocks.
- [ ] Manual — upgrade barn to `elite`. Confirm Bullet unlocks. Upgrade `treadmill` to `standard` — confirm Treadmill unlocks.
- [ ] Manual — attempt to assign a locked training type via browser console — confirm log message appears and no TrainingIntent is enqueued.

---

### Critical Files for Implementation

- `/src/constants/workoutConstants.ts`
- `/src/core/facilities/facilityDefaults.ts`
- `/src/components/horse/TrainingPanel.tsx`
- `/src/game/store/slices/racingSlice.ts`
- `/src/tests/core/facilities/trainingGating.test.ts`
