# Refactor E — Route & Component Cleanup

**Date:** 2026-05-09
**Order:** 5 of 5 (do last — depends on A for utility hooks, D for correct slice imports)
**Risk:** Low-Medium — UI refactors, no store or core logic changes
**Scope:** Extract business logic from route components into hooks, and extract large inline UI sections into dedicated components.

---

## Why last

Route and component cleanup is lowest risk to game correctness but depends on A (utilities), B (data), and D (store slices) being done first — the extracted hooks will import from the consolidated utilities and correct slice boundaries. Doing it last also means these files have stabilised.

---

## E1 — `stable.$horseId.tsx` (636 lines): hooks-in-JSX and duplicated training buttons

### Problem

**Sub-problem 1: Business logic in render**
Lines 69–97 compute eligibility inline in the component body:

- `canRetireToStud` — inlines checks for gender, age, stud career status, auction status
- `canRetireToPasture` — inlines age and ownership checks
- Auction lookup (`const activeLot = auctionLots.find(...)`) inside the render function

These checks replicate logic that already exists (or should exist after Refactor A) in core modules. The route component should not be the source of truth for retirement eligibility rules.

**Sub-problem 2: Duplicated training button disabled logic**
The training panel (lines 404–537) has 7 training-type buttons, each with an inline `disabled` expression:

```ts
disabled={isPregnant || slotsLeft <= 0 || horse.energy < threshold || !facilityUnlocked}
```

The `facilityUnlocked` check references facility data inline rather than through a computed value. The `disabled` logic is repeated 7 times with slight variations.

### Fix

**E1a — Extract `useHorseActions` hook**

Create `src/hooks/useHorseActions.ts`:

```ts
export function useHorseActions(horseId: string) {
  const horse = useGame(s => s.horses.find(h => h.id === horseId));
  const auctionLots = useGame(s => s.auctionLots ?? []);
  const facilities = useGame(s => s.facilities);

  return {
    canRetireToStud: /* computed boolean */,
    canRetireToPasture: /* computed boolean */,
    retireToStudReason: /* string | null — why it's disabled */,
    retireToPastureReason: /* string | null */,
    activeLot: /* AuctionLot | undefined */,
    isInAuction: /* boolean */,
  };
}
```

The eligibility logic moves into this hook. The route component calls `useHorseActions(horseId)` and uses the returned values.

**E1b — Extract `TrainingPanel` component**

Create `src/components/horse/TrainingPanel.tsx`:

```ts
interface TrainingPanelProps {
  horse: Horse;
  facilities: FacilityState;
  onTrain: (type: TrainingType) => void;
}
```

Define a `TRAINING_TYPES` array (name, energy cost, facility requirement, description) and map over it to render the 7 buttons. The `disabled` logic is computed once per training type from the array entry rather than repeated.

The route imports `TrainingPanel` and passes props.

### Acceptance criteria

- `wc -l src/routes/stable.$horseId.tsx` ≤ 400.
- `grep -n "canRetireToStud\|canRetireToPasture\|activeLot = " src/routes/stable.\$horseId.tsx` returns zero results (moved to hook).
- Training panel renders identically to before.
- All 7 training types still function correctly.

---

## E2 — `breeding.tsx` (571 lines): inline compatibility display

### Problem

The Breeding Shed tab (lines 162–395) renders the full 11-factor breeding compatibility radar chart, compatibility score, dosage breakdown, and warning flags inline in the route file. This section is ~230 lines of JSX that has no business being in a route file.

Additionally, lines 37–61 call `calculateBreedingCompatibility(sire, dam)` directly in the route component rather than in a custom hook, making the route component responsible for data transformation.

### Fix

**E2a — Extract `useBreedingCompatibility` hook**

Create `src/hooks/useBreedingCompatibility.ts`:

```ts
export function useBreedingCompatibility(sireId: string, damId: string) {
  const horses = useGame((s) => s.horses);
  const sire = horses.find((h) => h.id === sireId);
  const dam = horses.find((h) => h.id === damId);
  const compatibility = useMemo(
    () => (sire && dam ? calculateBreedingCompatibility(sire, dam) : null),
    [sire?.id, dam?.id],
  );
  return { sire, dam, compatibility };
}
```

**E2b — Extract `BreedingCompatibilityCard` component**

Create `src/components/breeding/BreedingCompatibilityCard.tsx`:

```ts
interface BreedingCompatibilityCardProps {
  compatibility: BreedingCompatibilityResult;
  sire: Horse;
  dam: Horse;
}
```

This component renders the radar chart, factor scores, dosage breakdown, and warning flags. The `BreedingRadarChart` component already exists — `BreedingCompatibilityCard` wraps it with the surrounding card layout and factor list.

The route imports and renders `<BreedingCompatibilityCard />` when both sire and dam are selected.

### Acceptance criteria

- `wc -l src/routes/breeding.tsx` ≤ 350.
- `grep -n "calculateBreedingCompatibility" src/routes/breeding.tsx` returns zero results.
- Compatibility display renders identically with correct scores.
- The Programs tab (added in the breeding programs feature) is unaffected.

---

## E3 — `races.tsx` (502 lines): filter logic and claiming panel inline

### Problem

**Sub-problem 1: Filter logic in render**
Lines 89–110 contain a ~20-line `useMemo` with 6 chained `.filter()` and `.sort()` calls for race filtering. Lines 119–134 derive `countries` and `tracks` for filter dropdowns. These are data transformation concerns in a presentation file.

**Sub-problem 2: Claiming panel inline**
The claiming race entry panel (lines 356–430) and claim filing dialog (lines 444–499) are ~145 lines of JSX embedded in the races route. They manage their own local state (`claimingAmount`, `selectedHorse`, `showClaimDialog`) and call slice actions directly.

### Fix

**E3a — Extract `useRaceFilters` hook**

Create `src/hooks/useRaceFilters.ts`:

```ts
export function useRaceFilters(races: Race[]) {
  const [filters, setFilters] = useState<RaceFilters>({ ... });
  const filteredRaces = useMemo(() => applyFilters(races, filters), [races, filters]);
  const availableCountries = useMemo(() => ..., [races]);
  const availableTracks = useMemo(() => ..., [races]);
  return { filters, setFilters, filteredRaces, availableCountries, availableTracks };
}
```

**E3b — Extract `ClaimingRacePanel` component**

Create `src/components/races/ClaimingRacePanel.tsx`:

```ts
interface ClaimingRacePanelProps {
  race: Race;
  playerHorses: Horse[];
  playerCash: number;
  onFileClaim: (horseId: string, amount: number) => void;
}
```

This component manages the claiming entry UI — horse selection, amount input, claim dialog, and confirmation. It imports from `claimingSlice` (after Refactor D2) directly via `useGame`.

The route renders `<ClaimingRacePanel />` when a claiming race is expanded.

### Acceptance criteria

- `wc -l src/routes/races.tsx` ≤ 300.
- `grep -n "useMemo.*filter\|\.filter.*filter.*filter" src/routes/races.tsx` returns zero results.
- `grep -n "claimingAmount\|showClaimDialog" src/routes/races.tsx` returns zero results.
- Claiming race entry flows work identically end-to-end.

---

## E4 — Remove hooks-in-JSX pattern from `stable.$horseId.tsx`

### Problem

Line 267–268 of `stable.$horseId.tsx` contains a `useGame()` call inside a conditional JSX expression or nested component. React's rules of hooks prohibit calling hooks inside conditionals, loops, or nested functions. This creates a risk of runtime "hooks called in wrong order" errors when the component re-renders.

### Fix

Move all `useGame(...)` calls to the top level of the component function, before any conditional returns or JSX. If the pattern is in a nested component, extract that nested component to a named function component (not an inline closure) so it has its own hook context.

### Acceptance criteria

- ESLint `react-hooks/rules-of-hooks` passes with zero violations in `stable.$horseId.tsx`.
- If the project does not have this ESLint rule enabled, add it.

---

## Implementation notes

- E1, E2, E3 are independent — parallel PRs are safe.
- E4 is part of E1 (same file) — do it in the same PR.
- Each extracted component should have a `// EXTRACTED FROM: routes/...` comment in the first version to make review easier.
- Test by opening each affected route in the browser and exercising the extracted functionality manually. These are UI components — automated tests cover logic but not render correctness.
- Snapshot tests for the extracted components are recommended but not required for this refactor.
