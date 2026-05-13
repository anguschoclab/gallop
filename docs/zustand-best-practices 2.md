# Zustand Best Practices

This document provides guidelines for using the Zustand store in the Gallop application to prevent infinite re-render loops and ensure optimal performance.

## Anti-Patterns

### Object Selectors (CAUSES INFINITE LOOPS)

❌ **DON'T DO THIS:**

```typescript
const { horses, awards } = useGame((s) => ({ horses: s.horses, awards: s.awards }));
```

This creates a new object on every render, defeating shallow comparison and causing infinite loops.

### No Selector (PERFORMANCE ISSUE)

❌ **DON'T DO THIS:**

```typescript
const game = useGame();
const horses = game.horses;
```

This subscribes to the entire state, causing re-renders on any state change, even if the component only needs a small subset.

## Correct Patterns

### Single Selectors

✅ **DO THIS:**

```typescript
const horses = useGame((s) => s.horses);
const awards = useGame((s) => s.awards);
```

Each selector subscribes only to the specific state slice it needs. This is the preferred pattern for most cases.

### Domain Hooks

✅ **DO THIS:**

```typescript
import { useHorses, useAwards } from "@/game/hooks/useCoreState";
import { useNpcStables } from "@/game/hooks/useSystemsState";

const horses = useHorses();
const awards = useAwards();
const npcStables = useNpcStables();
```

Domain hooks provide type-safe, memoized access to state slices. They are the recommended approach for new code.

### Shallow with Multiple Values

✅ **DO THIS:**

```typescript
const { day, cash } = useGame((s) => ({ day: s.day, cash: s.cash }), shallow);
```

Only use shallow with domain hooks (e.g., `useCoreState()`), not inline object selectors. The domain hooks are already configured with shallow comparison.

### Action Selectors

✅ **DO THIS:**

```typescript
const trainHorse = useGame((s) => s.trainHorse);
const breed = useGame((s) => s.breed);
```

Actions are stable references, so they can be selected individually without causing re-renders.

## Available Domain Hooks

### Core State (`@/game/hooks/useCoreState`)

- `useDay()` - Current simulation day
- `useCash()` - Player's cash balance
- `useHorses()` - All horses in the game
- `useRaces()` - All scheduled races
- `useLog()` - Game event log
- `useCoreState()` - Multiple core values with shallow comparison

### Market State (`@/game/hooks/useMarketState`)

- `useMarket()` - Horses available for purchase
- `useAuctions()` - Active auction sales
- `useScoutReports()` - Scouting reports on NPC stables
- `useMarketState()` - Multiple market values with shallow comparison

### Breeding State (`@/game/hooks/useBreedingState`)

- `usePregnancies()` - Active pregnancies
- `useTripleCrownHistory()` - Historical Triple Crown attempts
- `useBreedingState()` - Multiple breeding values with shallow comparison

### Racing State (`@/game/hooks/useRacingState`)

- `usePaceSamples()` - Pace sample data
- `useCalibratedPars()` - Calibrated par times
- `useLastCalibrationDay()` - Last calibration day
- `useTrainingUsed()` - Training slots used per horse
- `useRacingState()` - Multiple racing values with shallow comparison

### Systems State (`@/game/hooks/useSystemsState`)

- `useNpcStables()` - NPC stable data
- `useJockeys()` - Available jockeys
- `useAwards()` - Awards data
- `useCampaigns()` - Campaign data
- `useUserSettings()` - User settings
- `useSireLeaderboards()` - Sire leaderboards
- `useIndustryMeanEarnings()` - Industry earnings metrics
- `useSystemsState()` - Multiple systems values with shallow comparison

## Migration Guide

### Converting Object Selectors

**Before:**

```typescript
const { horses, races, cash, day } = useGame((state) => ({
  horses: state.horses,
  races: state.races,
  cash: state.cash,
  day: state.day,
}));
```

**After:**

```typescript
import { useHorses, useRaces, useCash, useDay } from "@/game/hooks/useCoreState";

const horses = useHorses();
const races = useRaces();
const cash = useCash();
const day = useDay();
```

### Converting No-Selector Usage

**Before:**

```typescript
const game = useGame();
const horses = game.horses;
const awards = game.awards;
```

**After:**

```typescript
import { useHorses } from "@/game/hooks/useCoreState";
import { useAwards } from "@/game/hooks/useSystemsState";

const horses = useHorses();
const awards = useAwards();
```

## Common Mistakes

1. **Using object selectors with shallow**: This still creates new objects and causes infinite loops. Use domain hooks instead.
2. **Subscribing to entire state**: This causes performance issues. Always use specific selectors.
3. **Mixing domain hooks with inline selectors**: Stick to one pattern for consistency.
4. **Forgetting to import hooks**: Domain hooks must be imported from their respective files.

## Performance Benefits

Using domain hooks and single selectors provides:

- **Reduced re-renders**: Components only re-render when their specific state changes
- **Type safety**: TypeScript types are inferred correctly
- **Predictable behavior**: No unexpected re-renders from unrelated state changes
- **Better debugging**: Clear data flow from state to component

## Future Improvements

- ESLint rule to detect object selectors (planned)
- Additional domain hooks as needed
- Performance monitoring to verify improvements
