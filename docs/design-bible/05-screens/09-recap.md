---
name: Recap
description: The post-race / post-day / post-season summary
type: screen
status: Stable
owns: engineering:documentation
---

# Recap

## At a glance

- **Route:** `/recap` ([recap.tsx](../../../src/routes/recap.tsx))
- **Persona:** All three.
- **Primary verb:** Reflect.
- **Layout:** AppShell.

## Purpose

The recap is the **moment of memory**. After a day (or week, or season), what happened? Who won? What changed?

This is the _Football Manager inbox_ analogue — except instead of a list of bullet points, it's a curated story.

It serves all three personas because each finds something different here:

- **Maya** — the numbers: Beyer per race, training gains, stat shifts.
- **Tomás** — the legacy: foals born, sires confirmed, lines extended.
- **Alex** — the highlights: replays of the best race, vibes.

## User journey

1. Player advances time (day, week, season).
2. Optionally lands on `/recap` (or recap appears as a banner on dashboard).
3. Scrolls through a curated narrative of the period.
4. Replays a featured race (link to `/race/$id`).
5. Returns to dashboard.

## Layout

```
┌─ Header: "Year 3 — Apr 14" ──────────────────┐
├──────────────────────────────────────────────┤
│ Highlights                                   │
│ ┌─Hero card: featured race───────────────┐   │
│ │ "Belmont Stakes — Stardust takes G1"   │   │
│ │ silk + finishing pic + Beyer 108       │   │
│ │ [Watch replay →]                       │   │
│ └────────────────────────────────────────┘   │
├──────────────────────────────────────────────┤
│ All races today                              │
│ Scannable rows — race · winner · Beyer · $   │
├──────────────────────────────────────────────┤
│ Stable changes                               │
│ • Athena confirmed in foal                   │
│ • Diamond's training: Speed +2               │
│ • Bullet retired                             │
├──────────────────────────────────────────────┤
│ Foals born                                   │
│ • Filly by Galileo II out of Brigid          │
│ • Colt by Storm Cat II out of Athena         │
└──────────────────────────────────────────────┘
```

The hero card uses a **partial broadcast theme treatment** — the same emerald accent, weather sky as banner image. This is principle 3 in action: race-day thread on a management screen.

## Components used

- Primitives: `Card`, `Button`, `Badge`.
- Domain: `BeyerBadge`, `HorseBits`, race-card preview.

## Data

- `useGame((s) => s.day)` for current.
- `s.races.filter(r => r.day === currentDay && r.resolved)` for today's results.
- Stable diff: derived from a (future) events log; for now, computed from horse state changes.

## Copy

- Title: in-game date.
- Section labels: _"Highlights"_, _"All races today"_, _"Stable changes"_, _"Foals born"_.
- Hero card title pattern: _"[Race name] — [horse name] takes [class]"_.
- Replay CTA: _"Watch replay"_.
- Empty period: _"Quiet day — no races run."_

## States

- **Standard day** — full content.
- **Quiet day** — minimal content, _"Quiet day"_ line.
- **Big day** (multiple owned wins) — recap takes you to a celebration variant with multiple hero cards.
- **Loss day** — same structure, no special treatment. Honesty principle.

## Accessibility

- Recap is read top-to-bottom, no interactive timeline.
- All race rows have replay links with descriptive `aria-label`.

## Open questions

- Should season recap have a different visual treatment (more ceremonial)? Probably yes when seasons land formally.
- Do we generate prose commentary ("It was a wet day at Belmont, where…") or stay structured? Currently structured; future feature could layer in narrative.
