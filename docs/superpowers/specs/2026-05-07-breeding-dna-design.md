# Breeding & Horse DNA System — Improvements Design

**Date:** 2026-05-07
**Scope:** Chromosome model, linkage groups, marker inheritance, health expansion, breeding simulator, breeding programs (player + NPC AI), performance caching.

---

## 1. Architecture Overview

### What changes at the foundation

The current `crossover()` function treats every locus as independently assorting. This is genetically accurate for unlinked loci but loses the real-world phenomenon where speed/stride/fiber type travel together down generations. The new model assigns every locus a `(chromosome, position)` coordinate. During foal generation, each chromosome pair undergoes a single crossover event at a random map position; loci before the event inherit from one parent, loci after from the other.

The existing `Locus`-based data shape is unchanged — this is an internal engine change, not a data schema migration.

### New files

| File                                     | Purpose                                                              |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `src/core/genetics/chromosomes.ts`       | Chromosome model + crossover engine                                  |
| `src/core/genetics/linkageMap.ts`        | Declares which locus lives on which chromosome + position            |
| `src/core/genetics/breedingSimulator.ts` | Runs 250 inheritance simulations, aggregates phenotype distributions |
| `src/core/breeding/programs.ts`          | `BreedingProgram` type, distance metrics, progress tracking          |
| `src/core/breeding/archetypes.ts`        | Library of 8 target archetypes with weighted phenotype targets       |
| `src/core/genetics/genotypeCache.ts`     | Memoization for COI, bloodline resolution, compatibility scoring     |

### Modified files

| File                                      | Change                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/core/genetics/inheritance.ts`        | Replace `crossoverLoci` with chromosome-aware engine; fix `inheritTrait`                    |
| `src/core/genetics/types.ts`              | Add `pssm`, `rer`, `epm` to `HealthGenotype`                                                |
| `src/core/genetics/generation.ts`         | Initialize new health loci with tier-scaled probabilities                                   |
| `src/core/genetics/phenotype.ts`          | Add `resolvePssmRisk`, `resolveRerRisk`, `resolveEpmRisk`                                   |
| `src/core/breeding/populationGenetics.ts` | Wrap COI + bloodline with cache                                                             |
| `src/game/breedingCompatibility.ts`       | Wrap compatibility scoring with cache                                                       |
| `src/core/breeding/strategy.ts`           | Add `archetypeFitDelta` term to `scoreStallion` per personality                             |
| `src/core/ai/breedingAI.ts`               | Add `activeProgram`, `programDistanceHistory`, `programSwitchCooldown` to `BreedingAIState` |
| `src/game/npcBreeding.ts`                 | Wire program archetype fit delta into NPC stallion evaluation                               |
| `src/game/store/slices/`                  | New `breedingProgramsSlice`                                                                 |
| `src/game/state/`                         | Add `breedingPrograms` to game state                                                        |

### No-change boundary

Race simulation, dosage system, compatibility scoring factors, pedigree data, UI components, and the `Genotype` shape as consumed outside `src/core/genetics/` are untouched.

---

## 2. Chromosome Model & Linkage Map

### Crossover engine (`chromosomes.ts`)

Each locus is assigned a `(chromosome, position)` coordinate in `linkageMap.ts`. For each chromosome, a single crossover point is drawn from `uniform(0, 1)`. Loci at positions below the crossover point inherit from parent A; loci above inherit from parent B. Each gamete uses an independent crossover draw. Loci on different chromosomes segregate independently (50/50), identical to the current behaviour.

```ts
type ChromosomeId =
  | "CHR_ATHLETIC"
  | "CHR_ENDURANCE"
  | "CHR_PERFORMANCE"
  | "CHR_BEHAVIORAL"
  | "CHR_CONFORMATION"
  | "CHR_TRACK"
  | "CHR_HEALTH"
  | "CHR_COLOR"
  | "CHR_MARKINGS";

type LocusCoord = { chromosome: ChromosomeId; position: number };
// FlatGenotype: a string-keyed map of every locus in Genotype (including
// array indices, e.g. "stats.speed.0" through "stats.speed.9")
const LINKAGE_MAP: Record<string, LocusCoord> = { ... };

function crossoverChromosome(
  sireAlleles: number[],
  damAlleles: number[],
  positions: number[],
  rng: Rng,
): number[];
```

The existing `crossover(sireLocus, damLocus, rng)` signature is kept as a convenience wrapper for independently assorting loci (markers, color).

### Linkage groups

| Chromosome         | Loci                                                                                         | Gameplay effect                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `CHR_ATHLETIC`     | speed×10 (pos 0.05–0.55), fiberType (0.70), stride (0.85)                                    | Sprint package travels together — hard to get elite speed without fiber/stride bias |
| `CHR_ENDURANCE`    | stamina×10 (0.05–0.55), distance (0.70), mudAptitude (0.85)                                  | Stayer traits bundle — mud aptitude drifts with stamina                             |
| `CHR_PERFORMANCE`  | acceleration×10 (0.05–0.55), heart×5 (0.62–0.78), style (0.90)                               | Explosive racers inherit bravery and early-foot together                            |
| `CHR_BEHAVIORAL`   | consistency×10 (0.05–0.55), mental (0.65), trainability (0.75), recovery (0.88)              | Mentally tough horses tend to be trainable and recover faster                       |
| `CHR_CONFORMATION` | physical (0.15), size (0.35), durability (0.55), peakAge (0.72), foalingEase (0.88)          | Frame, soundness, and career arc come as a package                                  |
| `CHR_TRACK`        | surface (0.20), climbing (0.45), cornering (0.65), trackBias (0.85)                          | Course-specific aptitudes co-inherit                                                |
| `CHR_HEALTH`       | bleeder (0.10), roarer (0.25), ocd (0.40), efna5 (0.55), pssm (0.65), rer (0.75), epm (0.88) | Health conditions cluster — prone to one → likelier to carry others                 |
| `CHR_COLOR`        | extension (0.20), agouti (0.45), gray (0.65), cream (0.85)                                   | Coat genetics — independent from performance chromosomes                            |
| `CHR_MARKINGS`     | socks (0.15), face (0.35), silverDapple (0.55), sabino (0.72), splashWhite (0.88)            | Independent cosmetics                                                               |

Markers (`leopardComplex`, `lethalCarriers`, `sensoryPerception`, `signalTransduction`, `immunity`, `geneticDiversity`) remain independently assorting — they represent diverse genomic origins and are handled by the existing `crossover()` wrapper.

---

## 3. Marker Inheritance (Incomplete Dominance)

### What changes

`inheritTrait()` in `inheritance.ts` currently flips a coin — `excellent × poor` has a 50% chance of producing `excellent`. This prevents selective breeding programs from reliably concentrating behavioral and health traits.

### Replacement table

| Sire × Dam            | Foal distribution                |
| --------------------- | -------------------------------- |
| excellent × excellent | 100% excellent                   |
| excellent × good      | 70% excellent, 30% good          |
| excellent × fair      | 100% good _(regression to mean)_ |
| excellent × poor      | 50% good, 50% fair               |
| good × good           | 100% good                        |
| good × fair           | 70% good, 30% fair               |
| good × poor           | 100% fair _(regression to mean)_ |
| fair × fair           | 100% fair                        |
| fair × poor           | 70% fair, 30% poor               |
| poor × poor           | 100% poor                        |

The `excellent × fair → good` and `good × poor → fair` cases model incomplete dominance — offspring land between parents. The extreme cross `excellent × poor` produces variance (good or fair) rather than always inheriting the stronger value, so fixing a trait in a line requires multiple generations of deliberate selection.

**Applied to:** `sensoryPerception`, `signalTransduction`, `immunity`. Locus-based stats (speed, stamina, etc.) use numerical crossover and are unaffected.

---

## 4. Health Condition Expansion

### Three new loci added to `HealthGenotype`

```ts
health: {
  bleeder: Locus,   // existing
  roarer: Locus,    // existing
  ocd: Locus,       // existing
  efna5: Locus,     // existing
  pssm: Locus,      // new — Polysaccharide Storage Myopathy
  rer: Locus,       // new — Recurrent Exertional Rhabdomyolysis
  epm: Locus,       // new — EPM immune susceptibility
}
```

Convention: **low allele sum = susceptible**, high = healthy (consistent with existing health loci).

### Phenotype effects

| Condition              | Sum ≤ 3 (affected)                                            | Sum ≤ 6 (carrier)   | Sum ≥ 7 (healthy) |
| ---------------------- | ------------------------------------------------------------- | ------------------- | ----------------- |
| **PSSM**               | trainability −20%, caps at "fair" under hard workouts         | trainability −8%    | no effect         |
| **RER**                | injury risk +0.05 during intense training; recovery rate −15% | injury risk +0.02   | no effect         |
| **EPM susceptibility** | immunity treated as one tier lower for illness checks         | susceptibility flag | no effect         |

### Generation probabilities (new horses in `generation.ts`)

| Tier             | PSSM affected | RER affected | EPM susceptible |
| ---------------- | ------------- | ------------ | --------------- |
| starter / budget | 8%            | 6%           | 7%              |
| mid              | 5%            | 4%           | 5%              |
| elite            | 2%            | 2%           | 3%              |

### Gameplay surface

- Breeding simulator shows risk percentages ("12% PSSM risk")
- Genetic testing service reveals carrier status before committing
- NPC AI penalises pairings where both parents carry the same condition
- Breeding compatibility score adds a small penalty when both parents have low-sum loci for the same condition

---

## 5. Breeding Simulator

### Core mechanic

A pure function in `breedingSimulator.ts` that runs `inheritDNA` 250 times with deterministic-but-varied RNG seeds, resolves each genotype to phenotype, and aggregates results. 250 runs produces stable percentile estimates at approximately 10–15ms.

### Output shape

```ts
type SimulationResult = {
  stats: {
    speed: { p10: number; p25: number; p75: number; p90: number };
    stamina: { p10: number; p25: number; p75: number; p90: number };
    acceleration: { p10: number; p25: number; p75: number; p90: number };
    consistency: { p10: number; p25: number; p75: number; p90: number };
  };
  traits: {
    fiberBias: Record<"sprinter" | "balanced" | "stayer", number>;
    strideType: Record<"short" | "balanced" | "long", number>;
    runningStyle: Record<RunningStyle, number>;
    trainability: { mean: number; tier: Record<"excellent" | "good" | "fair" | "poor", number> };
    distanceAptitude: { mean: number; range: [number, number] };
    surfaceAptitude: { likelyTurf: number; likelyDirt: number; versatile: number };
  };
  health: {
    bleederRisk: number;
    roarerRisk: number;
    pssmRisk: number;
    rerRisk: number;
    epmRisk: number;
    lethalRisk: { csnb: number; hypp: number; olws: number; ffs1: number };
  };
  coatColors: Record<CoatColor, number>;
  coiEstimate: number;
  compatScore: number;
};
```

### UI presentation (abstracted — no raw loci exposed)

```
SPEED        ░░░░[═══════]░░░  72–88  (avg 81)
STAMINA      ░░░░░░[═════]░░  68–82  (avg 76)
ACCEL        ░░░░░[══════]░░  70–85  (avg 78)
CONSISTENCY  ░░░[═════════]░  65–88  (avg 77)

Likely fiber: Balanced (52%)  Stayer (31%)  Sprinter (17%)
Surface lean: Turf (61%)      Dirt (28%)    Versatile (11%)
Style:        P (44%)         EP (33%)      S (23%)

⚠ PSSM risk: 14%   Bleeder risk: 8%   CSNB lethal: 3%
```

### Genetic testing service

Player pays a tier-scaled fee to reveal actual hidden alleles for one locus group (Stats / Health / Traits panel) for a specific horse. Testing is stored on the horse record and persists. Simulator automatically incorporates revealed alleles when that horse is selected, improving prediction accuracy. Eliminates surprise outcomes for players who invest in testing both parents.

### Caching

Simulator results are memoized per `(sireId, damId)` for the session. Cache invalidated only if genetic testing reveals new alleles for either horse.

---

## 6. Breeding Programs

### Core concept

A stable-level commitment to an archetype target. Progress is measured as _genetic distance_ — a weighted Euclidean distance (normalised 0–1) between the stable's best current horse and the archetype's target phenotype profile. Distance ideally decreases each generation.

### Archetype library (`archetypes.ts`)

| ID                  | Name                | Key targets                                               |
| ------------------- | ------------------- | --------------------------------------------------------- |
| `elite-turf-stayer` | Classic Turf Stayer | High stamina, distance 2400m+, surface Turf, style S/P    |
| `dirt-sprinter`     | Dirt Sprinter       | High speed, fiber sprinter, distance ≤1200m, surface Dirt |
| `classic-miler`     | Classic Miler       | Balanced speed/stamina, distance 1600m, versatile surface |
| `turf-specialist`   | Turf Specialist     | High acceleration, cornering, climbing, surface Turf      |
| `iron-horse`        | Iron Horse          | High durability, recovery, consistency, low health risk   |
| `early-developer`   | Precocious 2YO      | Low peakAge, high acceleration, sprinter/miler            |
| `late-bloomer`      | Stayer's Stayer     | High peakAge, stamina dominant, trainability              |
| `all-weather`       | All-Surface Ace     | Versatile surface, balanced stats, high mental            |

### `BreedingProgram` type (`programs.ts`)

```ts
type BreedingProgram = {
  id: string;
  stableId: string;
  archetypeId: ArchetypeId;
  createdDay: number;
  generationCount: number;
  bestHorseId: string | null;
  geneticDistance: number; // 0–1, lower is better
  milestones: ProgramMilestone[];
  enrolledDamIds: string[];
  history: { day: number; distance: number; horseId: string }[];
};
```

### Milestone triggers

- Generation 1 foal enrolled
- Distance < 0.6: "Genetic foundation established"
- Distance < 0.4: "Program taking shape"
- Distance < 0.2: "Archetype locked in"
- First stakes winner from program
- First G1 winner from program

### NPC AI integration × Personality system

**Program assignment at stable creation:**

| Personality  | Default archetype                                     | Archetype weight in `scoreStallion` | Commitment                                          |
| ------------ | ----------------------------------------------------- | ----------------------------------- | --------------------------------------------------- |
| `breeder`    | `classic-miler`                                       | 20%                                 | Medium — tiebreaker between equal-scored stallions  |
| `developer`  | `early-developer` or `all-weather`                    | 10%                                 | Low — subordinate to value; pivots if market shifts |
| `prestige`   | `elite-turf-stayer` or `turf-specialist`              | 30%                                 | Very high — program is stable identity              |
| `specialist` | Derived from `preferredDistance` + `preferredSurface` | 40%                                 | Absolute — never switches                           |

`specialist` archetype derivation from `preferredDistance` + `preferredSurface`:

- long (≥2000m) + Turf → `elite-turf-stayer`
- long (≥2000m) + Dirt → `late-bloomer`
- short (≤1400m) + Dirt → `dirt-sprinter`
- short (≤1400m) + Turf → `turf-specialist`
- mid (1400–2000m) + Dirt → `classic-miler`
- mid (1400–2000m) + Turf → `turf-specialist`
- any + Synthetic → `all-weather`

**Personality-specific program behaviours:**

- **breeder**: Tolerates COI up to 7.5% (vs. 6.25% baseline) when advancing the program. Switches only if 3 consecutive seasons pass where distance decreases by less than 0.02 (no meaningful improvement) and current distance stays above 0.6.

- **developer**: Tracks foal sale price as the primary program success signal. Enrols mares opportunistically across archetypes based on current stallion availability. Will abandon mid-cycle if a value stallion arrives that doesn't fit.

- **prestige**: Program milestones generate fame gain. Will pay up to 20% above normal fee cap for a stallion that both matches the archetype AND has `fame > 150`. Program is displayed in stable biography. Switches only for a once-per-decade G1 sire (`fame > 180`).

- **specialist**: All mares enrolled in the single program. Will refuse a stallion outright if its `archetypeFitDelta` moves distance away from the target, regardless of score. No switching mechanism.

**`scoreStallion` change** (`strategy.ts`):

```ts
// archetypeFitDelta: positive = reduces genetic distance to program target
const PROGRAM_WEIGHT: Record<Stable["personality"], number> = {
  breeder: 0.2,
  developer: 0.1,
  prestige: 0.3,
  specialist: 0.4,
  aggressive: 0,
  conservative: 0,
  "win-now": 0,
  trader: 0,
};
const programTerm = archetypeFitDelta * PROGRAM_WEIGHT[stable.personality];
// Added to existing score sum
```

**`BreedingAIState` additions** (`breedingAI.ts`):

```ts
activeProgram: BreedingProgram | null;
programDistanceHistory: {
  season: number;
  distance: number;
}
[];
programSwitchCooldown: number; // days until switch allowed
```

Learning integration: when `recordBreedingOutcome` fires, if foal's genetic distance to program is lower than the dam's → success signal for that stallion × program combination. If higher (regression) → failure signal. `strategyConfidence` builds as distance trends downward; when it falls below 0.4 the NPC diversifies — enrolls 1–2 mares outside the program per season to hedge.

---

## 7. Performance (Caching)

### Where cost accumulates

Three functions are called O(mares × stallions) times per season opener. None of their inputs change between evaluations unless a horse's pedigree or race record changes:

- `computeCoiFromSnapshot` — pedigree tree walk, O(2^5) nodes per side
- `resolveBloodline` — recursive sire-line walk with `findHorseByName` in a 4000+ record dataset
- `calculateBreedingCompatibility` — 11-factor scoring calling dosage, COI, Bruce Lowe, nicking tables

### `genotypeCache.ts`

```ts
// COI: pedigree is immutable after foaling — never invalidated
const coiCache = new Map<string, number>();
function cachedCoi(sireId: string, damId: string, pedigree: Pedigree): number;

// Bloodline: sire line never changes — never invalidated
const bloodlineCache = new Map<string, Bloodline>();
function cachedBloodline(horse: Horse, state): Bloodline;

// Compatibility: invalidated when either horse gains a race result
const compatCache = new Map<string, CompatibilityResult>();
function cachedCompat(sire: Horse, dam: Horse): CompatibilityResult;
function invalidateCompatFor(horseId: string): void; // called after race results applied
```

### Invalidation rules

| Cache         | Invalidation trigger                                                       |
| ------------- | -------------------------------------------------------------------------- |
| COI           | Never — pedigree is immutable                                              |
| Bloodline     | Never — sire line doesn't change                                           |
| Compatibility | When `careerWins`, `earnings`, or `blueHenStatus` changes for either horse |
| Simulator     | When genetic testing reveals new alleles for either horse                  |

### Expected impact

Subsequent breeding seasons hit the cache for ~90% of pairs (most pairings were evaluated the prior season and neither horse's record changed). The simulator is triggered once when the player selects both a sire and a dam in the breeding pairing screen; results are held in the cache until the screen is closed or a horse changes. It does not re-run on component re-renders.
