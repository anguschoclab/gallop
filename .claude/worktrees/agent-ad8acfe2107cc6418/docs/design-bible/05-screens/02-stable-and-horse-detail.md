---
name: Stable and horse detail
description: The roster screen and the deep-dive horse page
type: screen
status: Stable
owns: engineering:documentation
---

# Stable and horse detail

Two screens, one spec: they share data, components, and a coherent flow.

## At a glance

| | Stable list | Horse detail |
|---|---|---|
| **Route** | `/stable` ([stable.tsx](../../../src/routes/stable.tsx)) | `/stable/$horseId` ([stable.$horseId.tsx](../../../src/routes/stable.$horseId.tsx)) |
| **Persona** | Maya, Tomás | All three |
| **Primary verb** | Browse / Compare | Train, Inspect |
| **Layout** | AppShell | AppShell |

## Purpose

**Stable** — the player's roster. Sortable, filterable, comparable. A working tool.

**Horse detail** — a single horse, all dimensions: stats, pedigree, race record, training history, breeding status. Deep enough to satisfy Tomás and Maya simultaneously.

## User journeys

### Stable

1. Player lands on `/stable`.
2. Sees a card grid (or table, future toggle) of every owned horse.
3. Filters by status (in training / racing / resting / in foal).
4. Sorts by Beyer, age, earnings.
5. Drills into a horse → `/stable/$horseId`.

### Horse detail

1. Lands from stable list, race entry, or breeding screen.
2. Sees stats radar + numeric stats (Maya), pedigree (Tomás), recent races (all).
3. Acts: train, enter race, retire, sell.

## Layout

### Stable

```
┌─ Header: "My stable" — n horses ────── [Browse auction] ─┐
├──────────────────────────────────────────────────────────┤
│ Filters: [Status ▼] [Sex ▼] [Age ▼] [Reset]              │
├──────────────────────────────────────────────────────────┤
│ ┌─HorseCard──┐ ┌─HorseCard──┐                            │
│ ├────────────┤ ├────────────┤   grid-cols-1 lg:grid-cols-2│
│ ┌─HorseCard──┐ ┌─HorseCard──┐                            │
│ ├────────────┤ ├────────────┤                            │
│ ...                                                      │
└──────────────────────────────────────────────────────────┘
```

### Horse detail

```
┌─ Header: silk + name + age + sex      [Train] [Enter race] ─┐
├──────────────────────────────────────────────────────────────┤
│ Tabs: [Overview] [Pedigree] [Record] [Training]              │
├──────────────────────────────────────────────────────────────┤
│ Overview:                                                    │
│   ┌─Stats radar──┐ ┌─Numeric stats──┐                        │
│   │              │ │ Speed:   78    │                        │
│   └──────────────┘ │ Stamina: 72    │                        │
│                    │ ...            │                        │
│                    └────────────────┘                        │
│   ┌─Recent Beyer trend────────────────────────┐              │
│   └────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

## Components used

- **Primitives:** `Card`, `Tabs`, `Table`, `Button`, `Badge`, `Progress`.
- **Domain:** `HorseCard`, `HorseStatsRadar`, `BeyerChart`, `BeyerBadge`, `Lineage`, `BreedingRadarChart`, `HorseCompare`.

## Data

- `useGame((s) => s.horses)` for the list.
- `s.horses.find(h => h.id === horseId)` for detail.
- Race history derived from `s.races.filter(r => r.entries.includes(horseId))`.

## Copy

- Stable title: *"My stable"* + *"n horses"* subtitle.
- Horse detail title: horse name (title case, given by player or generated).
- Primary CTA on horse detail: *"Train"* if eligible today, otherwise *"Enter race"* if races available.
- Tab labels: *"Overview"*, *"Pedigree"*, *"Record"*, *"Training"*.
- Empty state for "Record": *"No races run yet."*

## States

- Stable empty — see [Dashboard](01-dashboard.md) empty pattern.
- Filtered to empty — *"No horses match your filters."* + reset.
- Horse detail not found / sold — *"This horse is no longer in your stable."* + back link.
- Horse retired — overview shows retirement banner; train/enter buttons disabled.
- Horse in foal (mare) — `PregnancyTimeline` becomes the lead element.

## Accessibility

- Tab keyboard nav (arrow keys cycle tabs).
- Multi-select for compare requires `cmd+click` on desktop; tablet uses a toolbar "Select" button.
- All chart elements must have a fallback table (collapsible) for screen readers.

## Open questions

- Compact list view (table) vs. card grid: should it be a toggle or a breakpoint behaviour?
- Where does *jockey assignment* live — on the horse detail or on the race entry flow?
