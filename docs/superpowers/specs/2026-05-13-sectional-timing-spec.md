# Sectional Timing & Course Intelligence Spec

**Date:** 2026-05-13  
**Feature:** Sectional Timing + Course Intelligence  
**Scope:** Split computation from existing snapshots + course visit tracking

---

## Overview

The race simulation runs at 0.1s time steps and already stores position/velocity per horse in `RaceSnapshot[]`. This feature:

1. Derives quarter-mile split times from those snapshots after each race
2. Stores splits on the `Race` and abbreviated pace positions in horse `raceHistory`
3. Displays a "Sectionals" tab in the race viewer
4. Adds a pace profile summary on the horse detail page
5. Tracks how many times a horse has raced at each track and applies a small course familiarity modifier in the simulation

---

## Existing Infrastructure

| What                                                                        | Location                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------- |
| `RaceSnapshot[]` — `{ t, horses: [{ horseId, position, velocity, lane }] }` | `src/core/race/types.ts`                           |
| Simulation loop, `dt = 0.1s`                                                | `src/core/race/engine/simulation.ts`               |
| `runRaceToCompletion()`                                                     | `src/core/race/engine/simulation.ts`               |
| `Horse.raceHistory[]`                                                       | `src/core/horse/types.ts`                          |
| `Race.result[]`                                                             | `src/core/race/types.ts`                           |
| Post-race impact generation                                                 | `src/game/liveRaceResolution.ts`                   |
| Race viewer (live + replay tabs)                                            | `src/routes/race.$raceId.tsx`                      |
| Horse detail Analytics section                                              | `src/routes/stable.$horseId.tsx`                   |
| Track geometry, `trackId` on Race                                           | `src/game/tracks.ts` + `src/game/data/tracks.json` |

---

## Phase A — Types

### `src/core/race/types.ts`

Add new type:

```typescript
type SectionalEntry = {
  horseId: string;
  splitTime: number; // seconds to run this segment (not cumulative)
  cumulativeTime: number; // seconds from gate to this marker
  rank: number; // field position at this marker (1 = leading)
  velocityMs: number; // average m/s during this segment
};

type SectionalSplit = {
  label: string; // "¼", "½", "¾", "Fin"
  distanceMeters: number; // absolute meters from start
  entries: SectionalEntry[];
};
```

Extend `Race`:

```typescript
type Race = {
  // ... existing fields ...
  sectionalSplits?: SectionalSplit[];
};
```

Extend the horse `raceHistory` entry type (wherever it is defined — likely inline in `Horse` or a named type):

```typescript
{
  // ... existing fields (raceId, raceName, position, day, beyer, etc.) ...
  pacePositions?: number[];     // rank at each quarter marker, e.g. [5, 3, 2, 1]
  courseVisitCount?: number;    // how many times this horse had raced at this track BEFORE this race
}
```

### `src/core/horse/types.ts`

Add field to `Horse`:

```typescript
courseVisits: Record<string, number>; // trackId -> total races run at that track
```

Default value: `{}` (must be handled in new-game initialisation and any migration).

---

## Phase B — Computation

### New file: `src/core/race/sectionalAnalysis.ts`

This module is pure — takes snapshots and returns derived data, no state writes.

```typescript
import type { RaceSnapshot, SectionalSplit } from "@/core/race/types";

/**
 * Find the simulation time (seconds) when a horse crossed a given distance marker.
 * Linearly interpolates between the two nearest snapshots.
 * Returns null if the horse never reached that distance (DNF).
 */
export function interpolateTimeAtDistance(
  snapshots: RaceSnapshot[],
  horseId: string,
  targetDistanceMeters: number,
): number | null;

/**
 * Compute quarter-point sectional splits for all horses in a race.
 * splitMarkers defaults to [0.25, 0.5, 0.75, 1.0] * distance.
 * Returns [] if snapshots is empty or undefined.
 */
export function calculateSectionalSplits(
  snapshots: RaceSnapshot[],
  raceDistanceMeters: number,
  horseIds: string[],
  splitMarkers?: number[],
): SectionalSplit[];

/**
 * Produce a short pace position string: "3-2-2-1" (rank at each split marker).
 * Used for storage in raceHistory and display in analytics.
 */
export function buildPacePositionString(splits: SectionalSplit[], horseId: string): string;

/**
 * Derive a human-readable running style label from pace positions.
 * e.g. [1,1,1,1] -> "Wire-to-wire", [5,5,3,1] -> "Deep closer"
 */
export function derivePaceStyleLabel(pacePositions: number[], fieldSize: number): string;
```

**`interpolateTimeAtDistance` implementation notes:**

- Walk `snapshots` in order
- For each snapshot, find the horse entry by `horseId`
- When `horse.position >= targetDistanceMeters` for the first time, interpolate with the previous snapshot
- If horse never crosses the marker (e.g. DNF), return `null`

**`calculateSectionalSplits` implementation notes:**

- Generate split markers from `[0.25, 0.5, 0.75, 1.0].map(f => f * raceDistanceMeters)`
- For each marker: call `interpolateTimeAtDistance` for every horse
- Compute `splitTime` = `cumulativeTime[i] - cumulativeTime[i-1]` (first segment's cumulativeTime = splitTime)
- Sort entries by `cumulativeTime` ascending to assign `rank`
- If a horse returns `null` for a marker (DNF), omit from that split's entries

---

## Phase C — Wiring into `liveRaceResolution.ts`

After the race is fully resolved (results assigned, Beyers calculated), add the following steps in order:

### Step 1: Compute sectionals

```typescript
if (race.snapshots && race.snapshots.length > 0) {
  const horseIds = race.entries.map((e) => e.horseId);
  race.sectionalSplits = calculateSectionalSplits(race.snapshots, race.distance, horseIds);
}
```

### Step 2: Write pace positions to horse raceHistory

For each entry in `race.entries` that is player-owned:

```typescript
const pacePositions =
  race.sectionalSplits?.map((split) => {
    const entry = split.entries.find((e) => e.horseId === horse.id);
    return entry?.rank ?? 0;
  }) ?? [];

// Find and update the matching raceHistory entry (added this race)
const historyEntry = horse.raceHistory.at(-1);
if (historyEntry && historyEntry.raceId === race.id) {
  historyEntry.pacePositions = pacePositions;
  historyEntry.courseVisitCount = horse.courseVisits[race.trackId ?? ""] ?? 0;
}
```

### Step 3: Increment course visits

For every horse (player and NPC) that ran:

```typescript
const trackId = race.trackId ?? race.graded?.trackId;
if (trackId) {
  horse.courseVisits = horse.courseVisits ?? {};
  horse.courseVisits[trackId] = (horse.courseVisits[trackId] ?? 0) + 1;
}
```

---

## Phase D — Course Intelligence in Simulation

### `src/core/race/engine/simulation.ts`

The `Runner` type (or wherever per-horse simulation input is assembled) needs one new optional field:

```typescript
courseFamiliarityMultiplier?: number; // applied to maxVelocity at sim start
```

**Modifier table:**

| Prior visits to track | Multiplier       |
| --------------------- | ---------------- |
| 0 (debut)             | 0.985            |
| 1–2                   | 0.995            |
| 3–4                   | 1.000 (baseline) |
| 5–9                   | 1.005            |
| 10+                   | 1.010            |

**Where to compute the multiplier:** In `liveRaceResolution.ts` (or wherever runners are assembled before calling `runRaceToCompletion()`), read `horse.courseVisits[trackId]` **before** incrementing it (Step 3 above must happen **after** the simulation runs):

```typescript
const visits = horse.courseVisits?.[trackId] ?? 0;
runner.courseFamiliarityMultiplier = getCourseMultiplier(visits);
```

Add helper `getCourseMultiplier(visits: number): number` in `sectionalAnalysis.ts` or alongside the simulation utilities.

**Apply in simulation:** During `initRunner()` or at the point where `maxVelocity` is set:

```typescript
runner.maxVelocity *= runner.courseFamiliarityMultiplier ?? 1.0;
```

---

## Phase E — Race Entry Screen Badge

On whatever component renders horse entries for race selection (likely in `src/routes/races.tsx` or a race entry modal), show a small badge beside each horse's name when the race has a `trackId`:

```
visits = horse.courseVisits?.[race.trackId] ?? 0

visits = 0  → badge: "Debut at {trackName}"  (grey)
visits = 1–4 → badge: "{trackName}: {visits} run(s)"  (yellow)
visits ≥ 5  → badge: "{trackName}: {visits} runs ★"  (green)
```

No badge if `race.trackId` is undefined.

---

## Phase F — Race Viewer Sectionals Tab

### New file: `src/components/race/SectionalTimingTable.tsx`

Props: `{ race: Race }`

Renders only when `race.sectionalSplits && race.sectionalSplits.length > 0`.

**Table structure:**

| Horse      | ¼          | ½          | ¾            | Fin          | Style   |
| ---------- | ---------- | ---------- | ------------ | ------------ | ------- |
| Horse Name | 24.1 (3rd) | 48.8 (2nd) | 1:13.2 (2nd) | 1:37.4 (1st) | Stalker |

- Split cell format: `{segmentSeconds} ({rank}{ordinal})`
- Style column: derived from `derivePaceStyleLabel()`
- Sort rows by finish position (rank at "Fin" split)
- Highlight player-owned horses with a subtle border or background

### `src/routes/race.$raceId.tsx`

Add a new tab "Sectionals" alongside the existing Replay/Results tabs. Render `<SectionalTimingTable race={race} />` in that tab panel. Show tab only when `race.sectionalSplits` exists (i.e. after the race is resolved and snapshots were recorded).

---

## Phase G — Horse Detail Pace Profile

### New file: `src/components/horse/PaceProfileSummary.tsx`

Props: `{ horse: Horse }`

Reads `horse.raceHistory` — filter to entries that have `pacePositions` set (non-empty array). Use the last 10 such races.

**Display:**

1. **Average pace profile bar chart** — 4 bars (one per quarter), each showing average rank across those races (lower = closer to the lead). Invert the y-axis so "leading" is at top.

2. **Running style label** — Call `derivePaceStyleLabel()` on the average positions. Display as a tag: "Front Runner", "Presser", "Stalker", "Closer", "Deep Closer".

3. **Course visit summary** — List the top 3 tracks by visit count: `"Woodbine: 8 runs"`, `"Churchill Downs: 3 runs"`.

### `src/routes/stable.$horseId.tsx`

In the existing **Analytics** section (where the Beyer chart lives), add `<PaceProfileSummary horse={horse} />` below the Beyer chart. Conditionally render: only show when `horse.raceHistory.some(r => r.pacePositions?.length)`.

---

## Implementation Order

```
Phase A  Types only (Race, Horse, SectionalSplit, SectionalEntry)
Phase B  src/core/race/sectionalAnalysis.ts (pure functions, no state)
Phase C  Wire into liveRaceResolution.ts
Phase D  Simulation multiplier
Phase E  Race entry badge
Phase F  SectionalTimingTable component + race viewer tab
Phase G  PaceProfileSummary component + horse detail wire-up
```

Phases A–D must be done before E–G. Phases E, F, G are independent of each other.

---

## Edge Cases

- **No snapshots recorded:** `race.snapshots` may be undefined (snapshots are opt-in). In that case `sectionalSplits` is simply not set — UI components must handle `undefined` gracefully.
- **Short races (< 800m):** Quarter markers still work; the "¾" marker will be close to the finish. Consider skipping intermediate markers for races ≤ 400m and only recording "½" and "Fin".
- **DNF / withdrawn horses:** `interpolateTimeAtDistance` returns `null` — omit those horses from split entries rather than crashing.
- **New horses (no courseVisits field):** Default to `{}` in the modifier lookup (`horse.courseVisits?.[trackId] ?? 0`).
- **NPC horses:** Sectionals are computed for all entries (NPC and player alike) so the table is meaningful. Course visits are incremented for all horses so the modifier applies fairly.

---

## Testing Checklist

- [ ] Run any race that records snapshots; inspect `race.sectionalSplits` — expect 4 `SectionalSplit` entries with `distanceMeters` at 25/50/75/100% of race distance
- [ ] Verify `splitTime` values sum to ≈ the winning horse's finish time (within 0.5s rounding)
- [ ] Check `horse.raceHistory.at(-1).pacePositions` is a 4-element array after race resolution
- [ ] Run a horse at the same track twice; confirm `horse.courseVisits[trackId]` = 2 after second race
- [ ] On a horse's debut at a track, confirm the simulation multiplier = 0.985 is applied (check via Beyer figure being slightly lower than expected for a first-time visit)
- [ ] Race entry screen: confirm debut badge shows on first visit, star badge shows after 5+ visits
- [ ] Race viewer: confirm "Sectionals" tab appears only after race is resolved and snapshots exist
- [ ] Horse detail Analytics: confirm pace profile summary only renders when at least one race has `pacePositions`
- [ ] Short race (400m): confirm no crash and graceful degradation of split display
