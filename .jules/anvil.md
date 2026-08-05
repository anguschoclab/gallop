# Anvil

## 2025-03-01 - Strengthen TransportIntent type

**Learning:** `transportSlice.ts` was manually building a TransportIntent and casting it `as any` when enqueueing because `TransportIntent` was missing from `src/core/resolver/intents.ts` and the `AnyIntent` union. This bypassed type-checking entirely and could lead to silent bugs if the intent structure changed.
**Action:** Always define a strict interface extending `Intent` and include it in the `AnyIntent` union before enqueueing it in a slice, eliminating the need for `as any`.

## 2025-03-02 - Remove `any` from computeStandings

**Learning:** `computeStandings.ts` had multiple `any` casts (e.g. `(state as any).npcStables`) masking the lack of proper typing of GameState properties in this core logic module. This completely defeated the compiler's ability to check for property existence and type correctness when accessing state properties like `horses`, `npcStables`, and `playerProfile`.
**Action:** When working with core state logic, directly rely on correctly typed state interfaces. If properties are valid members of the interface (like `npcStables` on `GameState`), accessing them directly preserves type safety without `any` casts.

## 2025-03-03 - Extract inline types to remove `any` casting

**Learning:** `src/core/race/types.ts` used inline object types for `entries` and `result` arrays in the `Race` type. This led to people resorting to `(e: any)` and `(r: any)` casting in loops and `.find` in `RacingHandler.ts` to skip type errors when interacting with these arrays.
**Action:** Extract inline object array types into explicitly named exported interfaces (like `RaceEntry`, `RaceResult`). Doing so allows other modules to easily type check those objects or let TypeScript naturally infer them from the parent property, eliminating the need for `any` casting.

## 2025-03-03 - Natural Inference for Array Methods

**Learning:** `src/core/resolver/validators/SyndicationValidator.ts` and `src/core/ai/syndicationAI.ts` explicitly cast `(r: any)` in `raceHistory.filter()` despite `raceHistory` being fully typed in the `Horse` interface. This silenced the compiler on property accesses (e.g., `r.grade`). Removing the explicit `: any` allowed natural TypeScript inference to restore complete type safety.
**Action:** Before constructing new types or casting, check if the parent data structure is already typed. In many cases, simply removing explicit `any` casts from lambda parameters lets TypeScript's natural inference correctly validate property accesses against the original interface.

## 2026-07-20 - Extracted RaceRunner Type to Eliminate any in Race History Logic

**Learning:** `recordRaceHistory` and several components were defining `runners` arrays loosely (e.g., `any[]` or duplicated inline types). This obscured the specific properties available on runner objects (like `horseId`, `jockeyId`, `jockeyName`) leading to risky lookups without type assistance.
**Action:** Extract inline and `any[]` arrays representing a runner directly into a unified `RaceRunner` interface exported from `@/core/race/types.ts` and `game/types.ts`.

## 2025-03-03 - Type-safe auction impacts

**Learning:** `src/game/store/slices/auctionSlice.ts` received `impacts: any[]` in `commitAuctionResult` and used `impact as any` inside a switch statement. This bypassed type safety, meaning property accesses (like `entityId` or `message`) were unguarded. Furthermore, it masked a real runtime issue where `inbox_message` impacts lacked an `id` property, meaning invalid objects were being pushed to the inbox.
**Action:** Always type impact arrays explicitly as `AnyImpact[]` from `src/core/resolver/impacts` when applying them in stores/slices. This enables exhaustive type checking and ensures payload structural integrity.

## 2025-03-03 - Remove any from Campaign UI components

**Learning:** The `CampaignCard` and `CampaignSlotList` components were typed locally using `any` and inline `any[]` types instead of the proper core types (`HorseCampaign`, `CampaignFlag`, `CampaignRaceSlot`). This masked type validations for things like flag filtering, mapped slot properties, and race fetching logic.
**Action:** When building UI components handling core domains, import the explicitly named exported interfaces from `@/game/types`. This ensures component props safely map back to the validated data structures rather than bypassing the compiler.

## 2025-03-03 - Natural Inference for state loops

**Learning:** `coreSlice.ts` explicitly cast `(s: any)` and `(j: any)` when constructing `Map` instances for `stableMap` and `jockeyMap`, bypassing type safety despite `syncState` providing fully typed structures.
**Action:** Let TypeScript naturally infer loop variables from strongly typed parents rather than inserting generic any casts.

## 2025-03-05 - Remove any casts in resolveFoalMilestone

**Learning:** `racingSlice.ts` had multiple `any` casts (e.g. `const s = get() as any;`, `m: any`) masking the lack of proper typing in the `resolveFoalMilestone` action. This defeated the compiler's ability to check for property existence and type correctness for `GameState` and `DevelopmentArc`.
**Action:** When working with core state logic and store actions, rely on correctly typed state interfaces and natural TypeScript inference. Simply removing explicit `any` casts from lambda parameters lets TypeScript's natural inference correctly validate property accesses against the original interface.

## 2025-03-05 - Strengthened Map Types in Time Phases

**Learning:** `trainingResolution.ts` and `energy.ts` time phases used `new Map<string, any>()` and `new Map<string, Map<string, any>>()` to store typed Outpost and Staff data for lookups. This bypasses the compiler checks entirely and allows invalid states to propagate.
**Action:** Always declare maps with explicit core types (`Map<string, Outpost>`, `Map<string, Map<StaffRole, StaffMember>>`) when mapping state objects during phase processing to ensure tight compile-time contract enforcement.

## 2025-03-05 - Strong Typed Leaderboard Controls

**Learning:** `useLeaderboardControls` and `LeaderboardTable` used `any` as generic types and inside the `SORT_FNS` and `FILTER_FNS` record. This bypassed type safety, meaning property accesses were unguarded and wouldn't catch issues when refactoring the leaderboards models.
**Action:** When creating reusable UI hooks and components that accept generic types, make sure to propagate the correct domain models (like `ProgenyRanking` or `TrackRecord`) into the generic type arguments and function signatures to preserve type safety and ensure the compiler enforces structural integrity.
