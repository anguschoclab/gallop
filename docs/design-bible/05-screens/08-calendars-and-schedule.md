---
name: Calendars and schedule
description: Regional race calendars and the unified track schedule
type: screen
status: Stable
owns: engineering:documentation
---

# Calendars and schedule

## At a glance

- **Routes:**
  - `/canadian-calendar` ([canadian-calendar.tsx](../../../src/routes/canadian-calendar.tsx))
  - `/german-calendar` ([german-calendar.tsx](../../../src/routes/german-calendar.tsx))
  - `/scandinavian-calendar` ([scandinavian-calendar.tsx](../../../src/routes/scandinavian-calendar.tsx))
  - `/south-american-calendar` ([south-american-calendar.tsx](../../../src/routes/south-american-calendar.tsx))
  - `/uae-calendar` ([uae-calendar.tsx](../../../src/routes/uae-calendar.tsx))
  - `/track-schedule` ([track-schedule.tsx](../../../src/routes/track-schedule.tsx))
- **Persona:** Tomás (planning a campaign), Maya (data view).
- **Primary verb:** Plan.
- **Layout:** AppShell.

## Purpose

Each region has its own calendar with its own race traditions, naming conventions, and stakes ladder. The calendars are **planning surfaces**: the player looks ahead 3–6 months and decides where their horses will run.

`/track-schedule` is the **unified, all-regions** view — a single horizontal week-grid for cross-regional planning.

## User journey

1. Player has a turf horse, wants to find a stakes campaign.
2. Goes to a regional calendar (or unified track schedule).
3. Browses upcoming weeks, identifying stakes races by class, surface, distance.
4. Builds a mental campaign — *"He runs at Saratoga, then Belmont, then ships to Dubai."*

## Layout

### Regional calendar

Vertical scrolling list of weeks. Each week shows:
- Date range (top).
- Races in that week, grouped by track.
- Within a track, races sorted by class then time.

```
┌─ Header: "Canadian calendar" ────────────────────┐
├──────────────────────────────────────────────────┤
│ Apr 14–20                                         │
│ ─ Woodbine                                        │
│   • Queen's Plate — G1 · 2000m turf · $1.5M      │
│   • Maiden — Md · 1200m dirt · $80k              │
│ ─ Hastings                                        │
│   ...                                             │
│ Apr 21–27                                         │
│ ...                                               │
└──────────────────────────────────────────────────┘
```

### Unified track schedule (`/track-schedule`)

Horizontal grid: rows are tracks, columns are weeks. Cells show race counts and the highlight stakes race.

```
        │ W14 │ W15 │ W16 │ W17 │ ...
Belmont │  3  │  G1 │  4  │     │
Woodbine│     │  2  │  5  │ G2  │
Royal A.│     │     │  G1 │  6  │
...
```

## Components used

- Domain: `RegionalSchedule`, `CanadianSchedule`, `JapaneseSchedule` (and other regional variants).
- Primitives: `Card`, `Badge`, `Tooltip`.

## Copy

- Region selector copy: *"Canadian calendar"*, *"German calendar"*, *"South American calendar"*, etc.
- Stakes badge: G1 / G2 / G3 / Listed (uppercase, badge style).
- Track name: title case, full.
- Distance: integer + `m`.
- Tooltip on cell (unified schedule): the headline race in that week.

## States

- Default.
- Empty week — render the week row, no entries below the date.
- Past week — slightly dimmed (`opacity-60`); historical races view-only.

## Accessibility

- Calendar grid must have row/column headers properly marked (`<th scope="row">` / `scope="col"`).
- Week cells in the unified view are buttons with descriptive `aria-label` (*"Week 16, Belmont, 4 races including Belmont Stakes G1"*).

## Open questions

- Should we add a **Northern American calendar** as the catch-all for US tracks (currently scattered)? Tracked.
- Calendar export — `.ics` for the player's real calendar. Cute, low value, deferred.
