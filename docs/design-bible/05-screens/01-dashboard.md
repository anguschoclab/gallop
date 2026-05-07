---
name: Dashboard
description: The home screen — daily orientation, what to do next
type: screen
status: Stable
owns: engineering:documentation
---

# Dashboard

## At a glance

- **Route:** `/` ([src/routes/index.tsx](../../../src/routes/index.tsx))
- **Primary persona served:** All three (the rare three-persona screen).
- **Primary verb:** Orient. (Action verbs live on linked screens.)
- **Layout:** AppShell.
- **Theme:** Light/dark.
- **Status:** Stable.

## Purpose

The dashboard is **today's briefing**. The player arrives here every session start; they should know within 10 seconds what's happening, what's pending, and what they want to do next.

This is one of two screens in Gallop that serves all three personas (the other is [Recap](09-recap.md)). It has to be both rich and scannable.

## User journey

1. Player loads the game / advances a day → lands here.
2. Sees the day, the cash, the headline stats.
3. Sees today's races (if any) and which of their horses are entered.
4. Sees notable events: foaling due, training expiring, big race tomorrow.
5. Clicks into the next thing — usually `Stable` or `Races`.

## Layout

```
┌─ Header ─────────────────────────────────────────────┐
│ "Welcome back."                                       │
│ Year 3, Apr 14                       [Advance day]    │
├──────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│ │ Cash     │ │ Horses   │ │ This week│  Stat tiles   │
│ └──────────┘ └──────────┘ └──────────┘               │
├──────────────────────────────────────────────────────┤
│ Today's races                          See all →     │
│ [RaceDetailPanel × 1-3]                              │
├──────────────────────────────────────────────────────┤
│ My horses today                        See stable → │
│ [Scannable rows]                                     │
└──────────────────────────────────────────────────────┘
```

Three-column stat grid uses `grid grid-cols-1 md:grid-cols-3 gap-4`.

## Components used

- **Primitives:** `Card`, `Button`.
- **Domain:** `RaceDetailPanel`, `HorseCard` (compact variant), `BeyerBadge`.

## Data

- `useGame((s) => s.day)`, `s.cash`, `s.horses`.
- `s.races.filter(r => r.day === s.day)` for today's races.
- Recent events from a future events log (TBD — currently inferred).

## Copy

- Title: _"Welcome back."_ (after first session) or _"Welcome to your stable."_ (first session).
- Sub-title: in-game date via `gameCalendarDate(day)`.
- Primary CTA: _"Advance day"_ (already in sidebar; dashboard mirrors).
- Stat tile labels: _"Cash"_, _"Horses"_, _"This week"_ (number of races scheduled).
- Empty state for "Today's races": _"No races today."_ (no CTA — calendar shift is automatic).
- Empty state for "My horses": _"No horses yet."_ + _"Browse auction"_ CTA.

## States

- **First-session** — no horses, no races. Empty states for both sections; the auction CTA is more prominent.
- **Active day** — full content.
- **Race day with player entry** — top race highlighted with a _"Watch live"_ CTA leading to `/race/$id`.
- **End of season** — banner: _"End of season — review your record."_ linking to recap.

## Accessibility

- Focus order: header → advance-day button → stat tiles → races → horses.
- Live region: when a day advances, announce _"Now Year 3, Apr 14. Three horses trained."_

## Telemetry

- Dashboard load.
- Primary CTA click ("Advance day").
- Race-card click-through.

## Open questions

- Should the dashboard show a "quick actions" row (Train all idle, Set training plan) for Maya?
- How many races deserve to be on the dashboard before "See all" wins? Currently capped at 3.
