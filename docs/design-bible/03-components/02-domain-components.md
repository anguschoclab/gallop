---
name: Domain components
description: The Gallop-specific components in src/components/ — how, when, and why to use each
type: components
status: Stable
owns: design:design-system
---

# Domain components

These live in [src/components/](../../../src/components/) (not the `ui/` subdirectory). They are racing-specific and embody product knowledge — they know what a horse is, what a race is, what a pedigree looks like.

When you build a new screen, reach here first. Only fall to primitives ([01-primitives.md](01-primitives.md)) when no domain component fits.

---

## Layout shell

### `AppShell` ([AppShell.tsx](../../../src/components/AppShell.tsx))

The main layout for every management screen. Sidebar (240px wide) + main content (max 6xl, centred, 24px padding).

- **Hides itself for the live race route** (`/race/...`). This is by design — race day breaks the management chrome (principle 7).
- **Renders the cash counter, horse count, and time-advance controls** in the sidebar footer.
- **Hosts global modals**: `PlayerRacePrompt`, `AutoSimPanel`.

**Don't** add new top-level navigation items without confirming with the personas — the current 7 items (Dashboard, Stable, Races, Rival Stables, Market, Breeding, Sales) are deliberate.

---

## Horse representations

### `HorseCard` ([HorseCard.tsx](../../../src/components/HorseCard.tsx))

The standard horse summary block. Shows silk dot, name, key stats, breeding info.

**Use anywhere a horse is the unit of selection** — stable list, breeding chooser, auction lots, race entries. Consistency principle 7: the same card means the same thing wherever it appears.

### `HorseCompare` ([HorseCompare.tsx](../../../src/components/HorseCompare.tsx))

Side-by-side comparison of two or more horses. Rows are stats; columns are horses.

**Use** when the player has selected ≥2 horses with explicit intent to compare. Don't auto-trigger.

### `HorseStatsRadar` ([HorseStatsRadar.tsx](../../../src/components/HorseStatsRadar.tsx))

Radar chart of a horse's core stats (Speed, Stamina, Acceleration, Consistency, etc.).

**Use** on horse detail; pair with the numeric stat list. The radar gives shape; the numbers give precision. Maya wants both.

### `HorseBits` ([HorseBits.tsx](../../../src/components/HorseBits.tsx))

Small inline display elements (silk + name + status pill). Use anywhere a horse is mentioned in flowing copy or compact rows.

---

## Breeding

### `Lineage` ([Lineage.tsx](../../../src/components/Lineage.tsx))

The pedigree tree. Tomás's home screen. Every ancestor must be tappable.

### `BreedingRadarChart` ([BreedingRadarChart.tsx](../../../src/components/BreedingRadarChart.tsx))

Compatibility radar between sire and dam. Shows where the cross is strong and where it's a gamble.

### `BreedingTimeline` ([BreedingTimeline.tsx](../../../src/components/BreedingTimeline.tsx))

Multi-mare overview — who is in foal, who is open, due dates.

### `PregnancyTimeline` ([PregnancyTimeline.tsx](../../../src/components/PregnancyTimeline.tsx))

Single-mare progression: covered → confirmed → trimester markers → foaling.

**Pattern:** every breeding screen renders state visibly (principle 6). A mare in foal _shows_ the timeline, never just a date.

---

## Race & schedule

### `RaceDetailPanel` ([RaceDetailPanel.tsx](../../../src/components/RaceDetailPanel.tsx))

The race information block: name, conditions, distance, surface, weather, purse, entry list.

**Use** on the race browser detail pane and on the pre-race confirmation dialog. The same panel everywhere reinforces continuity into the race itself.

### `BeyerBadge` ([BeyerBadge.tsx](../../../src/components/BeyerBadge.tsx))

A compact pill displaying a Beyer figure. Yellow accent for "high" (fast-zone, ≥100), default for normal.

**Use** wherever a number could otherwise float ambiguously. The badge tells the eye "this is a Beyer", which matters because Beyer is one of the highest-density vocabulary words in the product.

### `BeyerChart` ([BeyerChart.tsx](../../../src/components/BeyerChart.tsx))

Time-series chart of a horse's Beyer figures across recent races.

### `GradedStatsChart` ([GradedStatsChart.tsx](../../../src/components/GradedStatsChart.tsx))

Bar/line chart of stakes-class win distribution.

### `RegionalSchedule`, `CanadianSchedule`, `JapaneseSchedule` (and others)

Calendar variants per region. Each takes the same data shape but tunes spacing, labels, and date formatting for that region's racing tradition.

**Pattern:** when adding a new region, copy the closest existing schedule and adjust. Don't fork the structure.

---

## Player decisions

### `PlayerRacePrompt` ([PlayerRacePrompt.tsx](../../../src/components/PlayerRacePrompt.tsx))

Modal that appears when the player's horse is about to run a race they haven't watched live. Asks: enter / skip / watch.

This is one of the most important interaction points in the game. It's the **gate to the race screen**. The copy and visual treatment must match the race screen's broadcast feel.

### `AutoSimPanel` ([AutoSimPanel.tsx](../../../src/components/AutoSimPanel.tsx))

Settings for auto-simulating periods (skip ahead through time). Gear-icon trigger in the sidebar.

---

## What's missing (and where it would go)

These don't exist yet but are likely future additions. Their place in the system is reserved here.

| Future component | Where it goes          | Notes                                              |
| ---------------- | ---------------------- | -------------------------------------------------- |
| `RaceCommentary` | `src/components/race/` | Live race text feed. Drives Tourist's experience.  |
| `OddsBoard`      | `src/components/race/` | Pre-race / live odds. Optional based on game-mode. |
| `JockeyCard`     | `src/components/`      | Jockey display analogous to `HorseCard`.           |
| `ScoutReport`    | `src/components/`      | Fog-of-war info on rival horses.                   |
| `RaceReplay`     | `src/components/race/` | Playback control HUD wrapper.                      |

When introducing one, write a short spec in [08-extending/02-how-to-add-a-component.md](../08-extending/02-how-to-add-a-component.md).

---

## Naming conventions

- **PascalCase** for the component file and exported name (`HorseCard.tsx` → `export function HorseCard`).
- **No `Container` / `Wrapper` / `Layout` suffixes** — pick a name that describes the thing.
- **Prefix family components** (`Race*`, `Horse*`, `Breeding*`) so they sort together in the directory.

---

## Open questions

- Should `HorseCard` have explicit size variants (`compact`, `default`, `hero`)? Right now sizing is implicit per usage; this could become an issue as more screens use it.
- Where do _jockey_ and _trainer_ avatars live, when we eventually add them? Reserve `JockeyCard` / `TrainerCard` and leave the question open.
