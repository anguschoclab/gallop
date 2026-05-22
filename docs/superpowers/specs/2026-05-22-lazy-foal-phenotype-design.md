# Lazy Foal Phenotype Resolution

**Date:** 2026-05-22  
**Status:** Approved

## Context

Year-end (and mid-year for Southern Hemisphere) breeding seasons produce 90–190 foals on a single day tick. Each foal currently runs ~30 trait resolvers synchronously at birth (`resolveDnaTraits()` in the 689-line `phenotype.ts`), causing a perceptible freeze when the player advances days during breeding season.

Players never see a foal's details at the moment of birth — they navigate to a horse detail page, race entry, or auction days to years later. The full phenotype computation at birth is wasted work. This spec defers it to the first moment the data is actually needed, and splits `phenotype.ts` into focused modules as part of the same effort.

---

## Goals

1. Eliminate the birth-day performance spike by deferring trait resolution.
2. Ensure NPC decisions (race entry, auction listing) always operate on resolved traits.
3. Split `phenotype.ts` into focused modules without changing the public API.

---

## Data Model Change

Add one optional field to the `Horse` type (`src/core/horse/types.ts`):

```ts
phenotypeResolved?: boolean
```

- `undefined` or absent → treat as already resolved (backward compatible with all existing horses).
- `false` → traits are not yet computed; horse must be resolved before any trait-dependent operation.
- `true` → all traits are present and valid.

No migration required. Existing horses in saved state have all traits already computed and will simply lack the flag, which is handled as resolved.

---

## Birth Fast Path

`resolveFoaling()` in `src/core/horse/horseFactory.ts` is split into two stages:

### Stage 1 — Run at birth (cheap)

- `inheritDNA(sire.genotype, dam.genotype, rng)` — DNA crossover
- Complication checks (stillbirth, lethal recessives, twin reduction) — must run before the horse exists
- Name generation
- Basic identity: gender, age, stableId, createdAtDay, owned
- Pedigree links: sire ID, dam ID, Bruce Lowe family assignment

### Stage 2 — Deferred (expensive, ~30 resolvers)

Everything inside `resolveDnaTraits()`:

- Stats (speed, stamina, acceleration, consistency, temperament, conformation)
- Coat color and markings
- Distance, surface, mud aptitude
- Running style, trainability, peak age, recovery rate
- Heart score, fiber bias, stride, track bias
- Fertility, foaling ease
- Genetic markers, bleeder/roarer/OCD risk
- Heterozygosity computation

The horse is written to state with `phenotypeResolved: false` and zero/default stat values. The genotype is stored on the horse so Stage 2 can run later without the original parents.

---

## Lazy Resolver

### Pure helper (used everywhere)

```ts
// src/core/horse/phenotypeResolver.ts
function resolvePhenotype(horse: Horse): Horse;
```

Takes an unresolved horse, derives a deterministic RNG from a numeric hash of `horse.id`, calls `resolveDnaTraits(horse.genotype, rng)`, merges the result, and returns the patched horse with `phenotypeResolved: true`. Returns the horse unchanged if already resolved.

Using an ID-derived RNG seed ensures determinism: the same foal always resolves to the same coat color and speed regardless of when or how many times it is resolved.

This is a **pure function** — no store access. This is critical because NPC phases (`pregnancy.ts`, auction phases) receive a `state` object and return `Impact[]`; they cannot call store actions directly. They call `resolvePhenotype(horse)` inline and include the patched horse in their returned impact.

### Store action (UI convenience wrapper)

```ts
resolveHorsePhenotype(horseId: string): void
```

Added to the game store for use from React components. Calls `resolvePhenotype()` on the found horse and patches it into Zustand state.

---

## Trigger Points

Resolution is called (via `resolvePhenotype()` in phases, or `resolveHorsePhenotype()` in UI) at exactly these points, before any trait-dependent logic runs:

| Trigger                                   | Location                                                  | Reason                                                  |
| ----------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| Player opens horse detail page            | `src/routes/stable.$horseId.tsx` — loader or first render | Display requires all traits                             |
| Horse entered in race (player or NPC)     | Race entry validation / NPC race selection                | Sim needs speed, stamina, acceleration                  |
| Horse listed at auction (player or NPC)   | Auction listing logic, **before** NPC scoring loop        | NPC needs stats to rank horses; buyers need to see them |
| Horse bred as sire or dam (player or NPC) | Breeding intent handler                                   | Fertility stat required for breeding validation         |

**NPC auction path detail:** `ensurePhenotypeResolved()` runs as the first step inside the NPC auction candidate loop, resolving each horse before quality scoring runs. This ensures the NPC makes intelligent decisions about which foals and yearlings to consign.

---

## `phenotype.ts` Refactor

The 689-line `src/core/genetics/phenotype.ts` is split into six focused modules under `src/core/genetics/phenotype/`:

| Module        | Contents                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `color.ts`    | `resolveCoatColor()` and all color locus helpers                                                         |
| `stats.ts`    | `resolveStats()` — speed, stamina, acceleration, consistency, temperament, conformation                  |
| `aptitude.ts` | `resolveDistanceAptitude()`, `resolveSurfaceAptitude()`, `resolveMudAptitude()`, `resolveRunningStyle()` |
| `health.ts`   | `resolveGeneticMarkers()`, bleeder/roarer/OCD risk computation, `computeHeterozygosity()`                |
| `traits.ts`   | Trainability, peak age, recovery, fertility, foaling ease, heart score, fiber bias, stride, track bias   |
| `index.ts`    | Re-exports all resolvers; `resolveDnaTraits()` lives here as the single entry point                      |

**The public API is unchanged.** `resolveDnaTraits(genotype, rng)` still exists at the same import path (`@/core/genetics/phenotype`) and returns the same shape. No callers outside the phenotype directory need to change.

---

## Verification

1. Advance days through a breeding season — no perceptible freeze on the foal-birth day.
2. Open a newly born foal's detail page — all traits appear correctly (coat, stats, aptitudes).
3. Advance to the NPC auction phase — NPC correctly scores and lists foals/yearlings (not random or zero-stat ordering).
4. Enter a player-owned foal in a race — race simulation runs correctly with resolved stats.
5. Breed a foal or yearling — fertility validation works.
6. Confirm an existing save loads without errors (backward compat with `phenotypeResolved` absent).
7. Confirm a horse resolved in one session has the same traits in a subsequent session (RNG determinism).
8. `npx tsc --noEmit` — no TypeScript errors.
