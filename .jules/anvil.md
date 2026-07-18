## 2025-03-01 - Strengthen TransportIntent type

**Learning:** `transportSlice.ts` was manually building a TransportIntent and casting it `as any` when enqueueing because `TransportIntent` was missing from `src/core/resolver/intents.ts` and the `AnyIntent` union. This bypassed type-checking entirely and could lead to silent bugs if the intent structure changed.
**Action:** Always define a strict interface extending `Intent` and include it in the `AnyIntent` union before enqueueing it in a slice, eliminating the need for `as any`.

## 2025-03-02 - Remove `any` from computeStandings

**Learning:** `computeStandings.ts` had multiple `any` casts (e.g. `(state as any).npcStables`) masking the lack of proper typing of GameState properties in this core logic module. This completely defeated the compiler's ability to check for property existence and type correctness when accessing state properties like `horses`, `npcStables`, and `playerProfile`.
**Action:** When working with core state logic, directly rely on correctly typed state interfaces. If properties are valid members of the interface (like `npcStables` on `GameState`), accessing them directly preserves type safety without `any` casts.

## 2025-03-03 - Extract inline types to remove `any` casting

**Learning:** `src/core/race/types.ts` used inline object types for `entries` and `result` arrays in the `Race` type. This led to people resorting to `(e: any)` and `(r: any)` casting in loops and `.find` in `RacingHandler.ts` to skip type errors when interacting with these arrays.
**Action:** Extract inline object array types into explicitly named exported interfaces (like `RaceEntry`, `RaceResult`). Doing so allows other modules to easily type check those objects or let TypeScript naturally infer them from the parent property, eliminating the need for `any` casting.

## 2025-03-03 - Type-safe auction impacts

**Learning:** `src/game/store/slices/auctionSlice.ts` received `impacts: any[]` in `commitAuctionResult` and used `impact as any` inside a switch statement. This bypassed type safety, meaning property accesses (like `entityId` or `message`) were unguarded. Furthermore, it masked a real runtime issue where `inbox_message` impacts lacked an `id` property, meaning invalid objects were being pushed to the inbox.
**Action:** Always type impact arrays explicitly as `AnyImpact[]` from `src/core/resolver/impacts` when applying them in stores/slices. This enables exhaustive type checking and ensures payload structural integrity.
