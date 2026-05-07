---
name: Races and race detail
description: The race browser and the pre-race scrutiny screen
type: screen
status: Stable
owns: engineering:documentation
---

# Races and race detail

## At a glance

| | Races browser | Race detail |
|---|---|---|
| **Route** | `/races` ([races.tsx](../../../src/routes/races.tsx)) | `/race-browser` ([race-browser.tsx](../../../src/routes/race-browser.tsx)) (intermediate) |
| **Persona** | All three | Maya, Tomás |
| **Primary verb** | Find a race | Decide entry |
| **Layout** | AppShell | AppShell |

## Purpose

**Races browser** — the schedule. Find the right race for a horse: by grade, country, surface, distance, day.

**Race detail** — once a race is found, scrutinise it: conditions, purse, current entries, your eligibility.

## User journey

1. Player needs a race for *Stardust*. Goes to `/races`.
2. Filters: this week, turf, ≥ 1400m, G3 or higher.
3. Browses results, opens a candidate.
4. Sees the `RaceDetailPanel`: conditions, purse, entries.
5. Confirms eligibility, clicks *"Enter Stardust"*.
6. Returns to schedule, or follows to live race when day comes.

## Layout

### Races browser

```
┌─ Header: "Races" ─────────────────── [My entries] ──┐
├─────────────────────────────────────────────────────┤
│ Filters row:                                        │
│ [Grade ▼] [Country ▼] [Surface ▼] [Track ▼] [Reset] │
├─────────────────────────────────────────────────────┤
│ Date │ Race            │ Class │ Dist │ Surface │ $ │
│ Mon  │ Belmont H       │ G2    │ 1600 │ Turf    │ … │  ← scannable rows
│ Mon  │ Maiden          │ Md    │ 1200 │ Dirt    │ … │
│ ...                                                  │
└─────────────────────────────────────────────────────┘
```

### Race detail (in panel or sub-route)

`RaceDetailPanel` carries:
- Race name (title case, large)
- Conditions (distance, surface, class, restrictions)
- Purse (right-aligned, `tabular-nums`)
- Weather + track condition
- Entry list (silks + names + Beyer averages)
- Your eligibility ribbon (green / amber / red)
- *"Enter [horse]"* CTA, or *"Watch live"* if it's race day

## Components used

- Primitives: `Table`, `Select`, `ToggleGroup`, `Button`, `Badge`.
- Domain: `RaceDetailPanel`, `BeyerBadge`, `RegionalSchedule` (calendar variants).

## Data

- `useGame((s) => s.races)` (filtered by upcoming).
- Filters via URL search params.
- Eligibility computed per (horse, race): age band, sex restriction, claiming price, etc.

## Copy

- Title: *"Races"*.
- Filter reset: *"Reset filters"*.
- Eligibility ribbon (good): *"Eligible"* (subtle green badge).
- Eligibility ribbon (bad): plain reason — *"Restricted to fillies"*, *"Distance too short"*.
- Primary CTA: *"Enter [horse name]"*.
- Empty state: *"No races match your filters."* + reset.

## States

- Default (filtered view).
- No matching races (filtered empty).
- Race full (entry capped) — CTA disabled, copy *"Field full"*.
- Race already today — CTA changes to *"Watch live"* (if entered) or *"Race already started"* (if not).
- Race resolved — historical view, link to result.

## Accessibility

- Filter row uses native `<select>` semantics via Radix.
- Sort columns are buttons with `aria-sort` updated on click.
- Race row keyboard activation (Enter) drills into detail.

## Open questions

- Should the race browser have a calendar (week-grid) view as well as the table view? Probably yes — Tourist (Alex) prefers it.
- Where does the *bet* affordance live, if/when betting is added? Likely a sub-tab on race detail.
