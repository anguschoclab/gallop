# Stakes Nomination System with Escalating Commitment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stakes nomination system where the player must pre-nominate horses for G1/G2/G3 races with escalating fee tiers based on how far in advance they nominate. Early nominations (90+ days out) are cheap; standard nominations (30–89 days) cost more; late nominations (0–29 days) cost significantly more and are unavailable for G1 races. This creates meaningful planning decisions and turns high-stakes entries into investments, not just button presses.

**Architecture:** A pure `calculateNominationFee(grade, tier)` function is the single source of truth for fee logic. Nomination intents flow through the existing Intent → Impact → Handler pipeline. A `NominationsTab` in the Racing page shows available upcoming graded races and the player's existing nominations. The store action `nominateHorse` validates eligibility and deducts fees. An `enterRace` guard checks that a nominated horse exists before allowing entry.

**Tech Stack:** TypeScript, Zustand, React 19; no new libraries. The nomination system uses the existing race schedule and the `Race` type (which already has `grade: "G1" | "G2" | "G3" | null`).

---

## Context

Currently the player can enter any eligible race without pre-commitment. For graded races (G1/G2/G3), there is no nomination mechanic — horses simply appear in the entry pool as long as they meet the stat requirements (`GRADE_G1_MIN_STAT = 78`, etc.). In genre peers (Champion Thoroughbred, Jockey Club), G1 nominations are a major planning lever: you're betting on a foal's development trajectory months in advance. Missing the early window costs real money and forces hard choices about which horses to prioritize.

The existing race schedule generates races 90+ days in advance. The `Race` type has a `raceDay` field (absolute game day) and a `grade` field. The player's stable has a `cash` field in the Zustand store.

**Key fee schedule:**

- G1 early: $2,000 | G1 standard: $5,000 | G1 late: not available
- G2 early: $800  | G2 standard: $2,000 | G2 late: $10,000
- G3 early: $400  | G3 standard: $1,000 | G3 late: $5,000

---

## File Structure

**New files:**

- `src/core/racing/nominationFees.ts` — `calculateNominationFee(grade, tier)` pure function
- `src/core/time/phases/nominationPhase.ts` — pipeline phase at order 84 that resolves `NominationIntent`
- `src/components/racing/NominationsTab.tsx` — tab component for the Racing page
- `src/tests/core/racing/nominationFees.test.ts` — unit tests for the pure fee function

**Modified files:**

- `src/types/race.ts` — add `NominationRecord` type; add `nominations?: NominationRecord[]` to `Race`
- `src/types/state.ts` — add `playerNominations: NominationRecord[]` to game state
- `src/core/resolver/intents.ts` — add `NominationIntent`
- `src/core/time/pipeline.ts` — register `nominationPhase` at order 84
- `src/game/store/slices/racingSlice.ts` — add `nominateHorse`, `withdrawNomination` actions
- `src/components/racing/RacingPage.tsx` (or equivalent) — add Nominations tab
- `src/constants/gameConstants.ts` — add fee schedule constants

---

## Conventions (read before starting)

- `calculateNominationFee(grade, tier)` returns `number | null`. `null` means the nomination is not available (G1 late = null).
- Tiers are determined by days until the race: `early = raceDay - currentDay >= 90`, `standard = 30–89 days`, `late = 0–29 days`.
- A `NominationRecord` tracks: `horseId`, `raceId`, `grade`, `tier`, `feePaid`, `nominatedDay`, `status: "active" | "scratched" | "entered"`.
- Once nominated, the fee is non-refundable even if the horse doesn't run. This is by design — it creates meaningful commitment.
- The `enterRace` action must check `playerNominations` before allowing a G1/G2/G3 entry. Non-graded races (G = null) don't require nomination.
- The `nominationPhase` fires once per day but only processes races on the `nominatedDay`. It deducts fees from `playerCash` and adds the record to `playerNominations`.
- NPCs don't use this system — they are auto-entered as before. Nomination is a player-only mechanic.
- Test convention: `src/tests/core/<module>/<filename>.test.ts`.

---

## Task 1: Define fee schedule constants and calculateNominationFee

**Files:**

- Modify: `src/constants/gameConstants.ts`
- Create: `src/core/racing/nominationFees.ts`
- Create: `src/tests/core/racing/nominationFees.test.ts`

- [ ] **Step 1: Add fee constants to gameConstants**

```typescript
// Stakes Nomination Fees
export const NOMINATION_FEE_G1_EARLY = 2000;
export const NOMINATION_FEE_G1_STANDARD = 5000;
export const NOMINATION_FEE_G1_LATE = null; // not available

export const NOMINATION_FEE_G2_EARLY = 800;
export const NOMINATION_FEE_G2_STANDARD = 2000;
export const NOMINATION_FEE_G2_LATE = 10000;

export const NOMINATION_FEE_G3_EARLY = 400;
export const NOMINATION_FEE_G3_STANDARD = 1000;
export const NOMINATION_FEE_G3_LATE = 5000;

export const NOMINATION_TIER_EARLY_DAYS_THRESHOLD = 90;
export const NOMINATION_TIER_STANDARD_DAYS_THRESHOLD = 30;
```

- [ ] **Step 2: Write failing tests for calculateNominationFee**

Create `src/tests/core/racing/nominationFees.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateNominationFee, getNominationTier } from "@/core/racing/nominationFees";

describe("getNominationTier", () => {
  it("returns 'early' for 90+ days out", () => {
    expect(getNominationTier(90)).toBe("early");
    expect(getNominationTier(120)).toBe("early");
  });

  it("returns 'standard' for 30-89 days", () => {
    expect(getNominationTier(30)).toBe("standard");
    expect(getNominationTier(89)).toBe("standard");
  });

  it("returns 'late' for 0-29 days", () => {
    expect(getNominationTier(0)).toBe("late");
    expect(getNominationTier(29)).toBe("late");
  });
});

describe("calculateNominationFee", () => {
  it("G1 early returns 2000", () => {
    expect(calculateNominationFee("G1", "early")).toBe(2000);
  });

  it("G1 standard returns 5000", () => {
    expect(calculateNominationFee("G1", "standard")).toBe(5000);
  });

  it("G1 late returns null (not available)", () => {
    expect(calculateNominationFee("G1", "late")).toBeNull();
  });

  it("G2 late returns 10000", () => {
    expect(calculateNominationFee("G2", "late")).toBe(10000);
  });

  it("G3 early returns 400", () => {
    expect(calculateNominationFee("G3", "early")).toBe(400);
  });

  it("returns null for non-graded races", () => {
    expect(calculateNominationFee(null, "early")).toBeNull();
  });
});
```

- [ ] **Step 3: Implement calculateNominationFee**

Create `src/core/racing/nominationFees.ts`:

```typescript
export type NominationTier = "early" | "standard" | "late";

export function getNominationTier(daysUntilRace: number): NominationTier {
  if (daysUntilRace >= NOMINATION_TIER_EARLY_DAYS_THRESHOLD) return "early";
  if (daysUntilRace >= NOMINATION_TIER_STANDARD_DAYS_THRESHOLD) return "standard";
  return "late";
}

const FEE_TABLE: Record<string, Record<NominationTier, number | null>> = {
  G1: { early: NOMINATION_FEE_G1_EARLY, standard: NOMINATION_FEE_G1_STANDARD, late: null },
  G2: {
    early: NOMINATION_FEE_G2_EARLY,
    standard: NOMINATION_FEE_G2_STANDARD,
    late: NOMINATION_FEE_G2_LATE,
  },
  G3: {
    early: NOMINATION_FEE_G3_EARLY,
    standard: NOMINATION_FEE_G3_STANDARD,
    late: NOMINATION_FEE_G3_LATE,
  },
};

export function calculateNominationFee(
  grade: "G1" | "G2" | "G3" | null,
  tier: NominationTier,
): number | null {
  if (!grade || !FEE_TABLE[grade]) return null;
  return FEE_TABLE[grade][tier];
}
```

- [ ] **Run tests:**

```bash
bunx vitest run src/tests/core/racing/nominationFees.test.ts
```

- [ ] **Commit:**

```bash
git add src/constants/gameConstants.ts src/core/racing/nominationFees.ts src/tests/core/racing/nominationFees.test.ts
git commit -m "feat(nomination): add calculateNominationFee pure function and fee schedule constants — tests passing"
```

---

## Task 2: Add NominationRecord type and NominationIntent

**Files:**

- Modify: `src/types/race.ts`
- Modify: `src/types/state.ts`
- Modify: `src/core/resolver/intents.ts`

- [ ] **Step 1: Add NominationRecord to race types**

In `src/types/race.ts`:

```typescript
export type NominationStatus = "active" | "scratched" | "entered";
export type NominationTier = "early" | "standard" | "late";

export interface NominationRecord {
  id: string;
  horseId: string;
  raceId: string;
  raceName: string;
  raceDay: number;
  grade: "G1" | "G2" | "G3";
  tier: NominationTier;
  feePaid: number;
  nominatedDay: number;
  status: NominationStatus;
}
```

- [ ] **Step 2: Add playerNominations to state**

In `src/types/state.ts`, add:

```typescript
playerNominations: NominationRecord[];
```

- [ ] **Step 3: Add NominationIntent**

In `src/core/resolver/intents.ts`:

```typescript
export interface NominationIntent {
  type: "Nomination";
  horseId: string;
  raceId: string;
  day: number;
}
```

- [ ] **Commit:**

```bash
git add src/types/race.ts src/types/state.ts src/core/resolver/intents.ts
git commit -m "feat(nomination): add NominationRecord type, playerNominations state field, NominationIntent"
```

---

## Task 3: Add nominateHorse and withdrawNomination store actions

**Files:**

- Modify: `src/game/store/slices/racingSlice.ts`

- [ ] **Step 1: Implement nominateHorse**

```typescript
nominateHorse: (horseId: string, raceId: string) => {
  set((s) => {
    const race = s.races.find((r) => r.id === raceId);
    if (!race || !race.grade) return s;

    // Check not already nominated
    const alreadyNominated = (s.playerNominations ?? []).some(
      (n) => n.horseId === horseId && n.raceId === raceId && n.status === "active",
    );
    if (alreadyNominated) return s;

    const daysUntilRace = race.raceDay - s.day;
    const tier = getNominationTier(daysUntilRace);
    const fee = calculateNominationFee(race.grade as "G1" | "G2" | "G3", tier);

    if (fee === null) {
      // G1 late window — not available
      return {
        log: [{ day: s.day, text: `Late nominations for G1 races are not accepted.` }, ...s.log].slice(0, 50),
      };
    }

    if (s.playerCash < fee) {
      return {
        log: [{ day: s.day, text: `Insufficient funds for nomination fee: $${fee.toLocaleString()}.` }, ...s.log].slice(0, 50),
      };
    }

    const nomination: NominationRecord = {
      id: `nom-${horseId}-${raceId}-${s.day}`,
      horseId,
      raceId,
      raceName: race.name,
      raceDay: race.raceDay,
      grade: race.grade as "G1" | "G2" | "G3",
      tier,
      feePaid: fee,
      nominatedDay: s.day,
      status: "active",
    };

    return {
      playerCash: s.playerCash - fee,
      playerNominations: [...(s.playerNominations ?? []), nomination],
      log: [
        {
          day: s.day,
          text: `Nominated ${s.playerHorses.find((h) => h.id === horseId)?.name ?? horseId} for ${race.name} — ${tier} tier, fee: $${fee.toLocaleString()}.`,
        },
        ...s.log,
      ].slice(0, 50),
    };
  });
},

withdrawNomination: (nominationId: string) => {
  set((s) => ({
    playerNominations: (s.playerNominations ?? []).map((n) =>
      n.id === nominationId ? { ...n, status: "scratched" as NominationStatus } : n,
    ),
    log: [{ day: s.day, text: `Nomination withdrawn (fee non-refundable).` }, ...s.log].slice(0, 50),
  }));
},
```

- [ ] **Commit:**

```bash
git add src/game/store/slices/racingSlice.ts
git commit -m "feat(nomination): add nominateHorse and withdrawNomination store actions with fee deduction and guards"
```

---

## Task 4: Guard enterRace for graded races

**Files:**

- Modify: `src/game/store/slices/racingSlice.ts`

- [ ] **Step 1: Add nomination guard to enterRace**

In the existing `enterRace` action, before allowing entry for G1/G2/G3 races, add:

```typescript
if (race.grade) {
  const hasNomination = (s.playerNominations ?? []).some(
    (n) => n.horseId === horseId && n.raceId === raceId && n.status === "active",
  );
  if (!hasNomination) {
    set({
      log: [
        {
          day: s.day,
          text: `${horse.name} must be nominated before entering a ${race.grade} race.`,
        },
        ...s.log,
      ].slice(0, 50),
    });
    return;
  }
}
```

Also guard in `raceEntryResolutionPhase` for player horses (NPC entry is unaffected).

- [ ] **Commit:**

```bash
git add src/game/store/slices/racingSlice.ts
git commit -m "feat(nomination): guard enterRace for graded races — nomination required before entry"
```

---

## Task 5: Implement nominationPhase pipeline phase

**Files:**

- Create: `src/core/time/phases/nominationPhase.ts`
- Modify: `src/core/time/pipeline.ts`

- [ ] **Step 1: Create nominationPhase**

The phase marks nominations as `"entered"` when the horse is actually entered in the race on race day.

```typescript
export function nominationPhase(state: GameState): void {
  for (const nomination of state.playerNominations ?? []) {
    if (nomination.status !== "active") continue;
    if (nomination.raceDay !== state.day) continue;

    const race = state.races.find((r) => r.id === nomination.raceId);
    if (!race) continue;

    const isEntered = race.entries?.some((e) => e.horseId === nomination.horseId);
    if (isEntered) {
      nomination.status = "entered";
    }
  }
}
```

- [ ] **Step 2: Register at order 84**

```typescript
{ order: 84, name: "nomination", phase: nominationPhase },
```

- [ ] **Commit:**

```bash
git add src/core/time/phases/nominationPhase.ts src/core/time/pipeline.ts
git commit -m "feat(nomination): add nominationPhase at pipeline order 84 — marks active nominations as entered on race day"
```

---

## Task 6: Build NominationsTab component

**Files:**

- Create: `src/components/racing/NominationsTab.tsx`

Shows:

- Active upcoming graded races with nomination button (and fee display based on current day)
- Player's existing nominations with status and fee paid
- Option to withdraw (scratched)

- [ ] **Step 1: Build the tab**

```tsx
export function NominationsTab() {
  const day = useRacingStore((s) => s.day);
  const races = useRacingStore((s) => s.races);
  const nominations = useRacingStore((s) => s.playerNominations ?? []);
  const horses = useRacingStore((s) => s.playerHorses);
  const nominateHorse = useRacingStore((s) => s.nominateHorse);
  const withdrawNomination = useRacingStore((s) => s.withdrawNomination);

  const gradedRaces = races
    .filter((r) => r.grade && r.raceDay > day)
    .sort((a, b) => a.raceDay - b.raceDay);

  return (
    <div className="nominations-tab">
      <section className="upcoming-graded">
        <h2>Upcoming Graded Races</h2>
        {gradedRaces.map((race) => {
          const daysOut = race.raceDay - day;
          const tier = getNominationTier(daysOut);
          const fee = calculateNominationFee(race.grade as "G1" | "G2" | "G3", tier);
          const alreadyNominated = nominations.some(
            (n) => n.raceId === race.id && n.status === "active",
          );
          return (
            <div key={race.id} className="race-nomination-row">
              <span className="race-grade">{race.grade}</span>
              <span className="race-name">{race.name}</span>
              <span className="race-day">
                Day {race.raceDay} ({daysOut}d away)
              </span>
              <span className="nomination-tier">{tier}</span>
              <span className="nomination-fee">
                {fee != null ? `$${fee.toLocaleString()}` : "Not available"}
              </span>
              {!alreadyNominated && fee != null && (
                <select
                  defaultValue=""
                  onChange={(e) => e.target.value && nominateHorse(e.target.value, race.id)}
                >
                  <option value="">Select horse...</option>
                  {horses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              )}
              {alreadyNominated && <span className="badge-nominated">Nominated</span>}
            </div>
          );
        })}
      </section>

      <section className="my-nominations">
        <h2>My Nominations</h2>
        {nominations.length === 0 && <p>No nominations yet.</p>}
        {nominations
          .filter((n) => n.status !== "scratched")
          .map((nom) => (
            <div key={nom.id} className="nomination-row">
              <span>{horses.find((h) => h.id === nom.horseId)?.name ?? nom.horseId}</span>
              <span>
                {nom.grade} — {nom.raceName}
              </span>
              <span>Day {nom.raceDay}</span>
              <span>
                {nom.tier} tier — ${nom.feePaid.toLocaleString()} paid
              </span>
              <span className={`status-${nom.status}`}>{nom.status}</span>
              {nom.status === "active" && (
                <button onClick={() => withdrawNomination(nom.id)}>Withdraw</button>
              )}
            </div>
          ))}
      </section>
    </div>
  );
}
```

- [ ] **Commit:**

```bash
git add src/components/racing/NominationsTab.tsx
git commit -m "feat(nomination): add NominationsTab showing upcoming graded races with fee tiers and existing nominations"
```

---

## Task 7: Mount NominationsTab in Racing page

**Files:**

- Modify: `src/routes/racing.tsx` or `src/components/racing/RacingPage.tsx`

- [ ] **Step 1: Add Nominations tab**

Add a "Nominations" tab alongside existing tabs (Races, Entries, Results, etc.). Mount `<NominationsTab />` when active.

- [ ] **Commit:**

```bash
git commit -m "feat(nomination): mount NominationsTab in Racing page navigation"
```

---

## Task 8: Initialize playerNominations in state defaults

**Files:**

- Modify: `src/game/store/initialState.ts` (or equivalent)

- [ ] **Step 1: Add empty array to initial state**

```typescript
playerNominations: [],
```

- [ ] **Commit:**

```bash
git add src/game/store/initialState.ts
git commit -m "feat(nomination): initialize playerNominations as empty array in game initial state"
```

---

## Task 9: Add nomination fee CSS

**Files:**

- Modify: `src/styles.css`

```css
.nominations-tab .race-nomination-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border, #eee);
}

.race-grade {
  font-weight: 700;
  min-width: 30px;
  color: var(--color-grade, #c27800);
}

.nomination-tier {
  text-transform: capitalize;
  font-size: 0.85em;
}

.badge-nominated {
  background: var(--color-success, #22c55e);
  color: white;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.8em;
}

.status-entered {
  color: var(--color-success, #22c55e);
  font-weight: 600;
}
.status-scratched {
  color: var(--color-muted, #888);
  text-decoration: line-through;
}
.status-active {
  color: var(--color-primary, #6366f1);
}
```

- [ ] **Commit:**

```bash
git add src/styles.css
git commit -m "feat(nomination): add CSS for nominations tab, tier badges, and status indicators"
```

---

## Task 10: Integration tests

**Files:**

- Create: `src/tests/game/store/nominationActions.test.ts`

- [ ] **Step 1: Write nomination action tests**

```typescript
it("nominateHorse deducts fee and adds record to playerNominations", () => { ... });
it("nominateHorse blocks when G1 late window", () => { ... });
it("nominateHorse blocks when insufficient cash", () => { ... });
it("nominateHorse is idempotent — second nomination for same horse+race is ignored", () => { ... });
it("enterRace is blocked when no active nomination for graded race", () => { ... });
it("withdrawNomination sets status to scratched without refunding fee", () => { ... });
```

- [ ] **Run all nomination tests**

```bash
bunx vitest run src/tests/core/racing/nominationFees.test.ts src/tests/game/store/nominationActions.test.ts
```

- [ ] **Commit:**

```bash
git add src/tests/game/store/nominationActions.test.ts
git commit -m "test(nomination): add integration tests for nominateHorse actions and enterRace guard"
```

---

## Verification (whole-plan)

- [ ] `bunx vitest run src/tests/core/racing/nominationFees.test.ts` — all pure function tests pass
- [ ] `bunx vitest run src/tests/game/store/nominationActions.test.ts` — all store tests pass
- [ ] `bun run typecheck` — no TypeScript errors
- [ ] Manual — navigate to Racing → Nominations tab. Confirm upcoming G1/G2/G3 races are listed with correct fee amounts.
- [ ] Manual — nominate a horse for a G1 90+ days away. Confirm $2,000 deducted from cash.
- [ ] Manual — attempt to nominate for G1 race that's 20 days away. Confirm "Late nominations for G1 races are not accepted" message.
- [ ] Manual — attempt to enter a G1 race without nominating. Confirm entry is blocked.
- [ ] Manual — nominate a horse, then withdraw. Confirm status changes to "scratched" and fee is NOT refunded.
- [ ] Manual — nominate, then advance to race day and enter. Confirm nomination status updates to "entered".
- [ ] Manual — confirm NPCs can still enter graded races without nomination (NPC path unaffected).

---

### Critical Files for Implementation

- `/src/core/racing/nominationFees.ts`
- `/src/game/store/slices/racingSlice.ts`
- `/src/components/racing/NominationsTab.tsx`
- `/src/core/time/phases/nominationPhase.ts`
- `/src/constants/gameConstants.ts`
