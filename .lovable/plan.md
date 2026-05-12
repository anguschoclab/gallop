## Problem

`bunx tsc --noEmit` reports a single error:

```
src/game/store/index.ts(317,2): error TS1005: ')' expected.
```

This is the only TypeScript error in the project right now — every other previously listed "error" was downstream noise caused by this single syntax break (when the store's exported types fail to parse, every consumer of `useGame` looks broken).

## Root cause

The store is created with a curried call:

```ts
export const useGame = create<StoreType>()(
  persist(
    (set, get) => ({ ...slices, startNewGame: ... }),
    { name: "gallop-game-state", storage: ..., onRehydrateStorage: ..., partialize: ... },
  ),
);
```

That requires two closing parens at the end: one for `persist(...)` and one for `create<StoreType>()(...)`. Line 317 currently only has `);`, so the outer `create()(...)` call is never closed and the parser fails at EOF.

## Fix

Change line 317 from:

```ts
);
```

to:

```ts
),
);
```

(One `)` closes `persist(...)`, the other closes `create<StoreType>()(...)`.)

## Verification

After the edit, run `bunx tsc --noEmit` — it should exit clean. The cascade of "phantom" errors in `AppShell.tsx`, `BreedingProgramPanel.tsx`, `RaceEntry.tsx`, etc. should all disappear, since they were all caused by `StoreType` being unresolvable while the store file failed to parse.

If any real errors remain after the fix, they will be addressed in a follow-up — but based on the current `tsc` output, this single one-line patch is the entire fix.
