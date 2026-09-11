# Naming Convention Glossary

This document defines the concrete naming conventions for the Gallop codebase.
All new code must follow these conventions. Existing code should be renamed
during refactoring passes.

## Layer Names

| Term         | Meaning                                                           | Directory           |
| ------------ | ----------------------------------------------------------------- | ------------------- |
| `core`       | Pure domain logic. No side effects, no I/O, no UI.                | `src/core/`         |
| `services`   | Orchestration and adapter facades. Wraps core for UI consumption. | `src/services/`     |
| `components` | React UI components. No direct core access.                       | `src/components/`   |
| `hooks`      | React hooks. Bridge between UI and store/services.                | `src/hooks/`        |
| `game-store` | Zustand store slices and state.                                   | `src/game/store/`   |
| `game-types` | Shared game type definitions.                                     | `src/game/types.ts` |
| `data`       | Immutable domain data (tracks, graded races, pedigrees).          | `src/data/`         |
| `constants`  | Compile-time constants.                                           | `src/constants/`    |

## File Naming

- **All source files**: `camelCase.ts` or `camelCase.tsx`.
- **Test files**: `<moduleName>.test.ts` colocated under `src/tests/` mirroring the source path.
- **Helper files**: `<feature>Helpers.ts` for pure helpers extracted from a slice or component.
- **Service facades**: `<feature>Service.ts` for service-layer re-exports of core functions.
- **Detector registries**: `<feature>Detectors.ts` for arrays of strategy functions.

## Function Naming

| Pattern        | Convention                            | Example                                    |
| -------------- | ------------------------------------- | ------------------------------------------ |
| Pure detector  | `detect<Pattern>`                     | `detectWinStreak`, `detectBounceCandidate` |
| Pure validator | `validate<Noun>`                      | `validateTrialHorse`, `validateStablemate` |
| Pure builder   | `build<Noun>`                         | `buildPacemaker`, `buildTrialRace`         |
| Pure applier   | `apply<Noun>`                         | `applyTrialCosts`, `applyReputationEvents` |
| Coordinator    | `<verb><Noun>` (delegates to helpers) | `getHorseInsight`, `runPrivateTrial`       |
| Store action   | `<verb><Noun>`                        | `nominateHorse`, `withdrawNomination`      |
| Tier picker    | `pick<Comparison>Tier`                | `pickAtLeastTier`, `pickAtMostTier`        |
| Log helper     | `prependLog<Entry/Entries>`           | `prependLogEntry`                          |

## Type Naming

- **Interfaces/Types**: `PascalCase` (e.g., `HorseInsight`, `RaceSnapshot`).
- **Branded IDs**: `as<Kind>Id` for brand assertions (e.g., `asStableId`, `asNpcStableId`).
- **Result types**: `<Action>Result` (e.g., `ActionResult`, `RaceSimulationResult`).
- **Input types**: `<Function>Input` (e.g., `PregnancyResolutionInput`).
- **State types**: `<Domain>State` (e.g., `ExchangeState`, `RacingState`).

## Variable Naming

- **Loop counters**: `i`, `j`, `k` (indices); `entry`, `race`, `horse` (named loops).
- **Accumulators**: `total<Name>`, `best<Name>`, `max<Name>`, `min<Name>`.
- **Maps/Records**: `<noun>Map`, `<noun>Record` (e.g., `horseMap`, `distanceStats`).
- **Booleans**: `is<Adjective>`, `has<Noun>`, `should<Verb>` (e.g., `isPlayerOwned`, `hasClaimingHistory`).
- **Constants**: `SCREAMING_SNAKE_CASE` for module-level constants (e.g., `PRIVATE_TRIAL_COST`).

## Forbidden Names

These vague names must be replaced with domain-specific terms:

| Vague Name                       | Preferred Replacement                          |
| -------------------------------- | ---------------------------------------------- |
| `data` (as a variable)           | `<domain>Data` (e.g., `raceData`, `horseData`) |
| `info` (as a variable)           | `insight`, `summary`, `record`, `profile`      |
| `item` (as a variable)           | `lot`, `entry`, `listing`, `trade`, `newsItem` |
| `temp` / `tmp`                   | `<purpose>Value` (e.g., `pendingScore`)        |
| `util` / `utils` (as a filename) | `<feature>Helpers` (e.g., `logHelpers`)        |
| `process` (as a function)        | `<verb><Noun>` (e.g., `resolvePregnancies`)    |
| `handle` (as a function)         | `<verb><Noun>` (e.g., `applyTrade`)            |
| `thing` / `stuff`                | Always replace with a specific name            |

## Import Order

1. External packages (`react`, `vitest`, `lucide-react`).
2. `@/` aliases (`@/core/...`, `@/services/...`, `@/components/...`).
3. Relative imports (`./helper`, `../types`).
4. Type imports last (using `import type { ... }`).

## Layering Rules (enforced by `layeringRules.test.ts`)

- `core` → `core`, `constants`, `data`, `game/types` (types only)
- `services` → `core`, `constants`, `data`, `game/types`
- `components` → `services`, `hooks`, `game/types`
- Lower layers must never import from higher layers.
- `@/data` immutability is enforced by `dataImmutability.test.ts`.

## Component Deduplication Decisions

### AuctionControls vs BiddingPanel (PR 8 audit)

**Decision: Keep separate.** These two components compose the same sub-components
(`BidInputPanel`, `MaxBidPanel`) but serve different routes with different control surfaces:

- `AuctionControls` (theater view): pause/resume/pass/skip controls, bid error toast,
  computes `nextBidAmount` internally.
- `BiddingPanel` (sale page view): `BuyNowDialog`, house prestige badge, reserve status,
  message display, takes `nextBid` as a prop.

Unifying into a single `BidConsole` with a `mode` prop would add more conditional
complexity than the duplication it removes. The shared logic is already extracted
into `BidInputPanel`/`MaxBidPanel` sub-components.
