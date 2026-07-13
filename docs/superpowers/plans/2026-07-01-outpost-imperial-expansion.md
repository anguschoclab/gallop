# Outpost / Imperial Expansion System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the outpost system as a fully playable feature. Currently, outpost constants (`OUTPOST_BASE_SLOTS=12`, `TRANSPORT_FATIGUE_SPIKE=40`, `ACCLIMATIZATION_PERIOD=7`) and facility transport types exist in the codebase, but there is no `/outposts` route, no `playerOutposts` state field, and the infrastructure handler uses `(state as any).outposts ?? []`. This plan adds `playerOutposts: Outpost[]` to `SystemsState`, a new `outpostSlice.ts` with `establishOutpost` / `shipHorseToOutpost` / `assignOutpostTrainer` actions, two new routes (`/outposts/` index and `/outposts/$outpostId`), an `EstablishOutpostDialog`, and fixes the `(state as any)` cast in `InfrastructureHandler` and the acclimatization decay in `energy.ts`.

**Architecture:** Outposts are multi-location stable extensions — each has its own roster of horses (a subset of `playerHorses`), its own facilities list, and an assigned trainer. Shipping a horse sets a `transportFatigueSpike` flag on the horse for `ACCLIMATIZATION_PERIOD` days. The player needs reputation score ≥ 300 to establish an outpost (costs `$50,000`). The sidebar navigation gains an "Outposts" entry.

**Tech Stack:** TypeScript, Zustand (new `outpostSlice.ts`), TanStack Router (two new route files), React 19; no new libraries.

---

## Context

Existing constants in `src/constants/gameConstants.ts`:

- `OUTPOST_BASE_SLOTS = 12`
- `TRANSPORT_FATIGUE_SPIKE = 40`
- `ACCLIMATIZATION_PERIOD = 7`

Existing facility types include `transport` in `FACILITY_ENABLED_WORKOUTS`. The `InfrastructureHandler` in `src/core/resolver/handlers/infrastructureHandler.ts` accesses `(state as any).outposts ?? []` — a clear placeholder for a real field.

The `energy.ts` module (or equivalent) handles daily energy/fatigue decay. Currently there is no player acclimatization decay path for transport fatigue.

The reputation system already has a numeric score (0–1000). Requiring ≥ 300 to establish an outpost means the player has won some graded races and has a stable track record.

---

## File Structure

**New files:**

- `src/types/outpost.ts` — `Outpost`, `OutpostFacility`, `OutpostTrainer` types
- `src/game/store/slices/outpostSlice.ts` — `establishOutpost`, `shipHorseToOutpost`, `assignOutpostTrainer` actions
- `src/routes/outposts.tsx` — `/outposts/` index route (grid of outpost cards)
- `src/routes/outposts.$outpostId.tsx` — `/outposts/$outpostId` route (tabs: Roster, Facilities, Logistics)
- `src/components/outpost/EstablishOutpostDialog.tsx` — modal for setting up a new outpost
- `src/components/outpost/OutpostCard.tsx` — card for the outposts index grid
- `src/tests/game/store/outpostActions.test.ts` — unit tests for store actions

**Modified files:**

- `src/types/state.ts` — add `playerOutposts: Outpost[]` to `SystemsState`
- `src/game/store/index.ts` — merge `outpostSlice` into store
- `src/core/resolver/handlers/infrastructureHandler.ts` — replace `(state as any).outposts` with `state.playerOutposts`
- `src/core/time/phases/energy.ts` (or equivalent) — add player acclimatization fatigue decay
- `src/components/layout/Sidebar.tsx` — add Outposts nav entry
- `src/constants/gameConstants.ts` — add `OUTPOST_ESTABLISHMENT_COST = 50000`, `OUTPOST_MIN_REPUTATION = 300`

---

## Conventions (read before starting)

- Each `Outpost` has its own `facilities: OutpostFacility[]` starting from sensible defaults (basic barn, basic track). It does NOT inherit from the main stable's facilities.
- `playerHorses` is the global roster. A horse's `currentOutpostId?: string` field indicates which outpost they are at. `undefined` = home stable.
- `shipHorseToOutpost` adds `TRANSPORT_FATIGUE_SPIKE` to the horse's fatigue and sets `acclimatizationDaysRemaining = ACCLIMATIZATION_PERIOD` on the horse.
- The `energy.ts` acclimatization decay reduces `acclimatizationDaysRemaining` by 1 per day, removes transport fatigue spike only when it reaches 0.
- `establishOutpost` requires reputation ≥ 300 AND cash ≥ $50,000. It deducts cash and adds the outpost to `playerOutposts`.
- Outpost names default to "Outpost [Region]" based on the selected region. The player can rename them.
- The `/outposts/` index shows a grid of cards; each card has Establish New Outpost as a placeholder when the list is empty.
- TanStack Router file-based routing: `src/routes/outposts.tsx` → `/outposts/`, `src/routes/outposts.$outpostId.tsx` → `/outposts/$outpostId`.
- The sidebar entry should be under the "Facilities" or "Empire" section (match the existing sidebar grouping style).

---

## Task 1: Define Outpost types and add playerOutposts to state

**Files:**

- Create: `src/types/outpost.ts`
- Modify: `src/types/state.ts`
- Modify: `src/constants/gameConstants.ts`

- [ ] **Step 1: Create outpost types**

Create `src/types/outpost.ts`:

```typescript
export interface OutpostFacility {
  type: string;
  level: "basic" | "standard" | "premium" | "elite";
}

export interface OutpostTrainer {
  id: string;
  name: string;
  specialty: "speed" | "stamina" | "acceleration" | "general";
  dailyCost: number;
}

export interface Outpost {
  id: string;
  name: string;
  region: string;
  establishedDay: number;
  maxSlots: number; // default: OUTPOST_BASE_SLOTS
  facilities: OutpostFacility[];
  trainerId?: string;
  trainer?: OutpostTrainer;
  notes?: string;
}
```

- [ ] **Step 2: Add playerOutposts to SystemsState**

In `src/types/state.ts`, add:

```typescript
playerOutposts: Outpost[];
```

- [ ] **Step 3: Add establishment constants**

In `src/constants/gameConstants.ts`:

```typescript
export const OUTPOST_ESTABLISHMENT_COST = 50000;
export const OUTPOST_MIN_REPUTATION = 300;
```

- [ ] **Step 4: Add acclimatization fields to Horse**

In `src/types/horse.ts`, add optional fields:

```typescript
currentOutpostId?: string;
acclimatizationDaysRemaining?: number;
```

- [ ] **Commit:**

```bash
git add src/types/outpost.ts src/types/state.ts src/types/horse.ts src/constants/gameConstants.ts
git commit -m "feat(outpost): define Outpost type, add playerOutposts to SystemsState, add horse transport fields"
```

---

## Task 2: Implement outpostSlice store actions

**Files:**

- Create: `src/game/store/slices/outpostSlice.ts`
- Modify: `src/game/store/index.ts`

- [ ] **Step 1: Implement establishOutpost**

```typescript
establishOutpost: (name: string, region: string) => {
  set((s) => {
    if ((s.reputation ?? 0) < OUTPOST_MIN_REPUTATION) {
      return {
        log: [{ day: s.day, text: `Cannot establish outpost — reputation score must be ≥ ${OUTPOST_MIN_REPUTATION}.` }, ...s.log].slice(0, 50),
      };
    }
    if ((s.playerCash ?? 0) < OUTPOST_ESTABLISHMENT_COST) {
      return {
        log: [{ day: s.day, text: `Cannot establish outpost — insufficient funds ($${OUTPOST_ESTABLISHMENT_COST.toLocaleString()} required).` }, ...s.log].slice(0, 50),
      };
    }

    const newOutpost: Outpost = {
      id: `outpost-${region.toLowerCase().replace(/\s+/g, "-")}-${s.day}`,
      name,
      region,
      establishedDay: s.day,
      maxSlots: OUTPOST_BASE_SLOTS,
      facilities: [
        { type: "barn",       level: "basic" },
        { type: "main_track", level: "basic" },
      ],
    };

    return {
      playerCash: s.playerCash - OUTPOST_ESTABLISHMENT_COST,
      playerOutposts: [...(s.playerOutposts ?? []), newOutpost],
      log: [
        { day: s.day, text: `Outpost established: ${name} in ${region}. $${OUTPOST_ESTABLISHMENT_COST.toLocaleString()} invested.` },
        ...s.log,
      ].slice(0, 50),
    };
  });
},
```

- [ ] **Step 2: Implement shipHorseToOutpost**

```typescript
shipHorseToOutpost: (horseId: string, outpostId: string) => {
  set((s) => {
    const horseIdx = s.playerHorses.findIndex((h) => h.id === horseId);
    if (horseIdx === -1) return s;

    const outpost = (s.playerOutposts ?? []).find((o) => o.id === outpostId);
    if (!outpost) return s;

    // Check slot availability
    const horsesAtOutpost = s.playerHorses.filter((h) => h.currentOutpostId === outpostId);
    if (horsesAtOutpost.length >= outpost.maxSlots) {
      return {
        log: [{ day: s.day, text: `${outpost.name} is at capacity (${outpost.maxSlots} slots).` }, ...s.log].slice(0, 50),
      };
    }

    const horse = s.playerHorses[horseIdx];
    const updatedHorses = [...s.playerHorses];
    updatedHorses[horseIdx] = {
      ...horse,
      currentOutpostId: outpostId,
      fatigue: Math.min(100, (horse.fatigue ?? 0) + TRANSPORT_FATIGUE_SPIKE),
      acclimatizationDaysRemaining: ACCLIMATIZATION_PERIOD,
    };

    return {
      playerHorses: updatedHorses,
      log: [
        {
          day: s.day,
          text: `${horse.name} shipped to ${outpost.name}. Fatigue +${TRANSPORT_FATIGUE_SPIKE}. Acclimatization period: ${ACCLIMATIZATION_PERIOD} days.`,
        },
        ...s.log,
      ].slice(0, 50),
    };
  });
},
```

- [ ] **Step 3: Implement assignOutpostTrainer**

```typescript
assignOutpostTrainer: (outpostId: string, trainer: OutpostTrainer) => {
  set((s) => {
    const outpostIdx = (s.playerOutposts ?? []).findIndex((o) => o.id === outpostId);
    if (outpostIdx === -1) return s;

    const updatedOutposts = [...(s.playerOutposts ?? [])];
    updatedOutposts[outpostIdx] = {
      ...updatedOutposts[outpostIdx],
      trainerId: trainer.id,
      trainer,
    };

    return { playerOutposts: updatedOutposts };
  });
},
```

- [ ] **Step 4: Merge outpostSlice into store**

In `src/game/store/index.ts`, import and spread `outpostSlice`:

```typescript
import { createOutpostSlice } from "./slices/outpostSlice";
// In create():
...createOutpostSlice(set, get),
```

- [ ] **Commit:**

```bash
git add src/game/store/slices/outpostSlice.ts src/game/store/index.ts
git commit -m "feat(outpost): add outpostSlice with establishOutpost/shipHorseToOutpost/assignOutpostTrainer actions"
```

---

## Task 3: Fix InfrastructureHandler cast

**Files:**

- Modify: `src/core/resolver/handlers/infrastructureHandler.ts`

- [ ] **Step 1: Replace (state as any).outposts with state.playerOutposts**

Find:

```typescript
(state as any).outposts ?? [];
```

Replace with:

```typescript
state.playerOutposts ?? [];
```

- [ ] **Commit:**

```bash
git add src/core/resolver/handlers/infrastructureHandler.ts
git commit -m "fix(outpost): replace (state as any).outposts cast with state.playerOutposts in InfrastructureHandler"
```

---

## Task 4: Add acclimatization decay to energy phase

**Files:**

- Modify: `src/core/time/phases/energy.ts` (or the fatigue decay module)

- [ ] **Step 1: Add acclimatization decay**

In the daily energy/fatigue tick, after existing fatigue recovery logic, add:

```typescript
for (const horse of state.playerHorses) {
  if ((horse.acclimatizationDaysRemaining ?? 0) > 0) {
    horse.acclimatizationDaysRemaining = (horse.acclimatizationDaysRemaining ?? 0) - 1;

    if (horse.acclimatizationDaysRemaining === 0) {
      horse.fatigue = Math.max(0, (horse.fatigue ?? 0) - TRANSPORT_FATIGUE_SPIKE);
    }
  }
}
```

- [ ] **Commit:**

```bash
git add src/core/time/phases/energy.ts
git commit -m "feat(outpost): add acclimatization decay to energy phase — removes transport fatigue after ACCLIMATIZATION_PERIOD days"
```

---

## Task 5: Build EstablishOutpostDialog component

**Files:**

- Create: `src/components/outpost/EstablishOutpostDialog.tsx`

A dialog with:

1. Outpost name input
2. Region selector (dropdown of available regions: UK, USA, Japan, France, Australia, UAE, etc.)
3. Cost summary ($50,000) and reputation check warning
4. Confirm/Cancel buttons

```tsx
const AVAILABLE_REGIONS = [
  "UK",
  "USA",
  "Japan",
  "France",
  "Australia",
  "UAE",
  "Dubai",
  "Ireland",
  "Germany",
  "Hong Kong",
];

export function EstablishOutpostDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState(AVAILABLE_REGIONS[0]);
  const reputation = useRacingStore((s) => s.reputation ?? 0);
  const cash = useRacingStore((s) => s.playerCash ?? 0);
  const establishOutpost = useRacingStore((s) => s.establishOutpost);

  const canAfford = cash >= OUTPOST_ESTABLISHMENT_COST;
  const hasReputation = reputation >= OUTPOST_MIN_REPUTATION;
  const canEstablish = canAfford && hasReputation && name.trim().length > 0;

  if (!open) return null;

  return (
    <dialog open className="establish-outpost-dialog">
      <h2>Establish New Outpost</h2>

      <label>
        Outpost Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Tokyo Training Centre"
        />
      </label>

      <label>
        Region
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          {AVAILABLE_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <div className="cost-summary">
        <p>
          Establishment cost: <strong>${OUTPOST_ESTABLISHMENT_COST.toLocaleString()}</strong>
        </p>
        <p>
          Base capacity: <strong>{OUTPOST_BASE_SLOTS} horses</strong>
        </p>
        {!hasReputation && (
          <p className="warning">
            Requires reputation ≥ {OUTPOST_MIN_REPUTATION} (you have {reputation})
          </p>
        )}
        {!canAfford && (
          <p className="warning">
            Requires ${OUTPOST_ESTABLISHMENT_COST.toLocaleString()} (you have $
            {cash.toLocaleString()})
          </p>
        )}
      </div>

      <div className="dialog-actions">
        <button onClick={onClose}>Cancel</button>
        <button
          disabled={!canEstablish}
          onClick={() => {
            establishOutpost(name.trim(), region);
            onClose();
          }}
          className="btn-primary"
        >
          Establish Outpost
        </button>
      </div>
    </dialog>
  );
}
```

- [ ] **Commit:**

```bash
git add src/components/outpost/EstablishOutpostDialog.tsx
git commit -m "feat(outpost): add EstablishOutpostDialog with name/region inputs, cost summary, and reputation gate"
```

---

## Task 6: Build OutpostCard component

**Files:**

- Create: `src/components/outpost/OutpostCard.tsx`

```tsx
export function OutpostCard({ outpost, horseCount }: { outpost: Outpost; horseCount: number }) {
  return (
    <Link to="/outposts/$outpostId" params={{ outpostId: outpost.id }} className="outpost-card">
      <h3>{outpost.name}</h3>
      <p className="outpost-region">{outpost.region}</p>
      <p>
        {horseCount} / {outpost.maxSlots} horses
      </p>
      <p>{outpost.trainer ? `Trainer: ${outpost.trainer.name}` : "No trainer assigned"}</p>
    </Link>
  );
}
```

- [ ] **Commit:**

```bash
git add src/components/outpost/OutpostCard.tsx
git commit -m "feat(outpost): add OutpostCard component with horse count and trainer display"
```

---

## Task 7: Build /outposts/ index route

**Files:**

- Create: `src/routes/outposts.tsx`

```tsx
export const Route = createFileRoute("/outposts/")({
  component: OutpostsIndexPage,
});

function OutpostsIndexPage() {
  const outposts = useRacingStore((s) => s.playerOutposts ?? []);
  const horses = useRacingStore((s) => s.playerHorses);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="outposts-page">
      <header>
        <h1>Imperial Expansion — Outposts</h1>
        <button onClick={() => setDialogOpen(true)} className="btn-primary">
          + Establish New Outpost
        </button>
      </header>

      {outposts.length === 0 ? (
        <div className="outposts-empty">
          <p>You have no outposts yet.</p>
          <p>Establish your first outpost to send horses to train in other regions.</p>
          <p>
            <strong>Requirements:</strong> Reputation ≥ 300 and $50,000
          </p>
        </div>
      ) : (
        <div className="outpost-grid">
          {outposts.map((outpost) => {
            const horseCount = horses.filter((h) => h.currentOutpostId === outpost.id).length;
            return <OutpostCard key={outpost.id} outpost={outpost} horseCount={horseCount} />;
          })}
        </div>
      )}

      <EstablishOutpostDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
```

- [ ] **Commit:**

```bash
git add src/routes/outposts.tsx
git commit -m "feat(outpost): add /outposts/ index route with outpost grid and establish dialog"
```

---

## Task 8: Build /outposts/$outpostId route

**Files:**

- Create: `src/routes/outposts.$outpostId.tsx`

3 tabs: **Roster**, **Facilities**, **Logistics**.

```tsx
export const Route = createFileRoute("/outposts/$outpostId")({
  component: OutpostDetailPage,
});

type Tab = "roster" | "facilities" | "logistics";

function OutpostDetailPage() {
  const { outpostId } = Route.useParams();
  const outpost = useRacingStore((s) => (s.playerOutposts ?? []).find((o) => o.id === outpostId));
  const horses = useRacingStore((s) =>
    s.playerHorses.filter((h) => h.currentOutpostId === outpostId),
  );
  const homeHorses = useRacingStore((s) => s.playerHorses.filter((h) => !h.currentOutpostId));
  const shipHorse = useRacingStore((s) => s.shipHorseToOutpost);
  const [activeTab, setActiveTab] = useState<Tab>("roster");

  if (!outpost) return <div>Outpost not found.</div>;

  return (
    <div className="outpost-detail-page">
      <header>
        <h1>{outpost.name}</h1>
        <span className="outpost-region-tag">{outpost.region}</span>
        <span>
          {horses.length} / {outpost.maxSlots} horses
        </span>
      </header>

      <nav className="tab-nav">
        {(["roster", "facilities", "logistics"] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "tab-active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {activeTab === "roster" && <OutpostRoster horses={horses} outpostId={outpostId} />}
      {activeTab === "facilities" && <OutpostFacilities outpost={outpost} />}
      {activeTab === "logistics" && (
        <OutpostLogistics
          outpost={outpost}
          homeHorses={homeHorses}
          onShip={(horseId) => shipHorse(horseId, outpostId)}
        />
      )}
    </div>
  );
}
```

- [ ] **Commit:**

```bash
git add src/routes/outposts.$outpostId.tsx
git commit -m "feat(outpost): add /outposts/$outpostId route with Roster/Facilities/Logistics tabs"
```

---

## Task 9: Add Outposts entry to Sidebar navigation

**Files:**

- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add nav entry**

Add under the existing facility/infrastructure grouping:

```tsx
<Link to="/outposts/" className="sidebar-link">
  Outposts
</Link>
```

- [ ] **Commit:**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(outpost): add Outposts entry to sidebar navigation"
```

---

## Task 10: Add CSS for outpost pages and initialize state

**Files:**

- Modify: `src/styles.css`
- Modify: `src/game/store/initialState.ts`

- [ ] **Step 1: Add outpost CSS**

```css
.outpost-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  padding: 16px 0;
}

.outpost-card {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 16px;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: border-color 0.15s;
}

.outpost-card:hover {
  border-color: var(--color-accent, #6366f1);
}

.outpost-region-tag {
  background: var(--color-region-bg, #f3f4f6);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.8em;
}

.outposts-empty {
  text-align: center;
  padding: 48px;
  opacity: 0.7;
}
```

- [ ] **Step 2: Initialize playerOutposts in initial state**

```typescript
playerOutposts: [],
```

- [ ] **Commit:**

```bash
git add src/styles.css src/game/store/initialState.ts
git commit -m "feat(outpost): add outpost CSS and initialize playerOutposts in game state"
```

---

## Verification (whole-plan)

- [ ] `bun run typecheck` — no TypeScript errors (especially no `(state as any)` in InfrastructureHandler)
- [ ] `bunx vitest run src/tests/game/store/outpostActions.test.ts` — all store action tests pass
- [ ] Manual — navigate to `/outposts/` in the app. Confirm the page loads with empty state.
- [ ] Manual — confirm "Establish New Outpost" button opens the dialog.
- [ ] Manual — attempt to establish with < 300 reputation. Confirm warning message appears and button is disabled.
- [ ] Manual — with sufficient reputation and cash, establish an outpost. Confirm $50,000 deducted and outpost appears in grid.
- [ ] Manual — navigate to `/outposts/$outpostId`. Confirm Roster/Facilities/Logistics tabs all render.
- [ ] Manual — ship a horse to the outpost. Confirm fatigue +40, acclimatization counter shows 7 days.
- [ ] Manual — advance 7 days. Confirm acclimatization clears and transport fatigue is removed.
- [ ] Manual — confirm sidebar "Outposts" link navigates to `/outposts/`.
- [ ] Manual — confirm no TypeScript errors from the removed `(state as any)` cast.

---

### Critical Files for Implementation

- `/src/types/outpost.ts`
- `/src/types/state.ts`
- `/src/game/store/slices/outpostSlice.ts`
- `/src/routes/outposts.tsx`
- `/src/routes/outposts.$outpostId.tsx`
- `/src/core/resolver/handlers/infrastructureHandler.ts`
- `/src/components/outpost/EstablishOutpostDialog.tsx`
