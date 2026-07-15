## 2025-03-01 - Strengthen TransportIntent type

**Learning:** `transportSlice.ts` was manually building a TransportIntent and casting it `as any` when enqueueing because `TransportIntent` was missing from `src/core/resolver/intents.ts` and the `AnyIntent` union. This bypassed type-checking entirely and could lead to silent bugs if the intent structure changed.
**Action:** Always define a strict interface extending `Intent` and include it in the `AnyIntent` union before enqueueing it in a slice, eliminating the need for `as any`.
## 2025-03-02 - Remove `any` from computeStandings

**Learning:** `computeStandings.ts` had multiple `any` casts (e.g. `(state as any).npcStables`) masking the lack of proper typing of GameState properties in this core logic module. This completely defeated the compiler's ability to check for property existence and type correctness when accessing state properties like `horses`, `npcStables`, and `playerProfile`.
**Action:** When working with core state logic, directly rely on correctly typed state interfaces. If properties are valid members of the interface (like `npcStables` on `GameState`), accessing them directly preserves type safety without `any` casts.
