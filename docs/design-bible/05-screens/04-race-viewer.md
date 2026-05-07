---
name: Race viewer (worked example)
description: The live race screen — current state, mantra alignment, gap analysis, handoff
type: screen
status: Stable
owns: engineering:documentation
---

# Race viewer — the worked example

This file documents the live race screen _and_ stress-tests the rest of the bible. If the design system can describe the most divergent screen and chart a clean path back to consistency, it can describe future ones.

> **TL;DR.** The race viewer is the climax of the product (principle 7) and the strongest expression of the _race day, every screen_ mantra. It's also the screen with the most drift: hardcoded colours, magic numbers, no playback controls, dark-only. This file documents what's there, what works, what doesn't, and the path to fix.

---

## At a glance

- **Route:** `/race/$raceId` ([src/routes/race.$raceId.tsx](../../../src/routes/race.$raceId.tsx))
- **Primary persona served:** Alex (Tourist) most directly; Tomás for ceremony; Maya as power user.
- **Primary verb:** Watch.
- **Layout:** Full-bleed (breaks AppShell — see [04-patterns/01-layout-and-navigation.md](../04-patterns/01-layout-and-navigation.md)).
- **Theme:** Currently hardcoded emerald palette → **planned: broadcast theme** (see [01-design-system/05-theming.md](../01-design-system/05-theming.md)).
- **Status:** Stable in behaviour, drift in tokens.

---

## Purpose

The live race is the climax. Every management screen exists to feed this moment. It's where:

- Training pays off.
- Breeding decisions are vindicated or refuted.
- The player feels the product viscerally rather than analytically.

The screen must (a) honour the deterministic simulation behind it, (b) carry the broadcast feel, and (c) remain readable to a player who has never opened a race-form before.

---

## User journey

1. Player enters a race for one of their horses (from `/races` or `PlayerRacePrompt`).
2. On race day, they navigate to `/race/$raceId` (or accept the prompt).
3. Pre-race header loads: race name, conditions, weather, purse.
4. They choose a speed: 1× / 2× / 4×.
5. The race plays out (~30s real time at 1×, ~7s at 4×).
6. Result overlay appears with finish order and prize for owned horses.
7. They click _"Continue"_ → back to `/races`.

---

## Current state inventory

### Visual elements (today)

| Element            | Implementation                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Background         | Two-layer: weather sky photo (200px band, repeat-x) + emerald gradient (`rgb(6 78 59)` → `rgb(6 59 48)`). Hardcoded.                            |
| Header bar         | `bg-black/20`, race name + conditions + speed buttons.                                                                                          |
| Track              | Bordered emerald block, height = `runners.length * 36 + 20`. Surface texture as repeating background. Lane dividers in `border-emerald-800/40`. |
| Finish line        | 1px white vertical bar at `right-2`. _"FIN"_ label.                                                                                             |
| Horse              | Coloured silk circle (`h-8 w-8 rounded-full`), white border, position number. CSS pulse `0.5s ease-in-out infinite` while running.              |
| Owned-horse marker | _"YOU"_ chip, `bg-yellow-400 text-black`.                                                                                                       |
| Live order panel   | 280px sidebar, `bg-black/30`, sort/filter controls, leaderboard rows.                                                                           |
| Beyer badge        | `bg-yellow-400/20 text-yellow-300 tabular-nums`, mid-race projection.                                                                           |
| Result overlay     | Centred dialog over `bg-black/70`, full result + prize money.                                                                                   |

### Behaviour

| Aspect     | Implementation                                                                            |
| ---------- | ----------------------------------------------------------------------------------------- |
| Simulation | Fixed 50ms physics tick ([race.$raceId.tsx:129](../../../src/routes/race.$raceId.tsx)).   |
| Rendering  | Pure DOM. Inline `style.left` per horse per tick. No canvas, SVG, or WebGL.               |
| RNG        | Seeded by race id (`rngForRace(race)`) — replays produce identical results.               |
| Speed      | 1× / 2× / 4× via `speedRef`; multiplies the accumulator, not the tick rate.               |
| Filtering  | Sort (position / Beyer / velocity), filter (all / owned / top 5), min Beyer slider 0–120. |

---

## Mantra alignment — what's right

This is the section to **borrow from**, not fix. The race viewer embodies the mantra directly:

### Numbers over noise (principle 1)

- Beyer figures live in the leaderboard, `tabular-nums`, recomputed every tick.
- Finish times use two decimals + `s`.
- The min-Beyer slider lets Maya filter for relevance live.
- Owner prizes show as `+$900,000` — same currency formatting as the dashboard.

### Authentic, never gatekeeping (principle 2)

- The screen uses real terms: _"Live order"_, _"Proj. Beyer"_, _"FIN"_.
- Weather is shown as emoji + word (_"☀️ Sunny"_) so newcomers see _both_.
- The track condition string is verbatim (_"Firm"_, _"Sloppy"_) — no translation.

### Race day, every screen (principle 3)

- Silks (the dot beside each name) are the _same_ silks used everywhere else. Continuity wins.
- Track surface (turf/dirt/synthetic) carries through from the race-detail screen.
- Weather sky moods the whole screen — race day = mood.

**These elements are the constitution.** Every other screen borrows from here, not the reverse (principle 7).

---

## Gap analysis — what to fix

The race viewer is also the most divergent screen. Each gap below has a target — what changes, where, in service of which principle.

### G1. Hardcoded emerald palette → broadcast theme

**Today.** Inline `rgb(6 59 48)`, `rgb(6 78 59)`, `rgb(4 120 87)`, `border-emerald-600`, `border-emerald-800`. Yellow-400 accents inline.

**Target.** Replace with the planned `broadcast` theme tokens (`--broadcast-track`, `--broadcast-rail`, `--broadcast-sky-overlay`, `--broadcast-marquee`, `--broadcast-accent`, `--broadcast-foreground`).

**Why.** Principle 7: the race screen is the constitution. It must use _the_ design system, even when it's the screen most defining it. Today, a re-skin would require touching the route source. After tokenising, a re-skin is a token swap.

**See.** [01-design-system/05-theming.md](../01-design-system/05-theming.md) for the proposed token list.

### G2. Hardcoded geometry → tokenised race units

**Today.** Lane height `36px`, sidebar width `280px`, finish-line right offset `right-2`, track inset `4px / 96%`. All inline.

**Target.** Add a small set of race-screen-specific tokens:

```css
--race-lane-height: 2.25rem; /* 36px */
--race-sidebar-width: 17.5rem; /* 280px */
--race-track-inset: 1rem; /* both sides */
--race-finish-offset: 0.5rem;
```

Surface them in `@theme inline` so Tailwind utilities can consume them.

**Why.** Tokenisation makes the screen responsive-friendly: a future tablet/mobile pivot can override the units in a media query without forking the layout.

### G3. No pause / scrub / replay controls

**Today.** Player can change speed (1/2/4) but cannot pause or scrub. The race plays continuously until finish.

**Target.** Adopt the playback control pattern from [04-patterns/04-interaction-patterns.md](../04-patterns/04-interaction-patterns.md):

- **Pause/resume** — implement via a `paused` ref that gates the RAF loop accumulator drain. Spacebar shortcut.
- **Scrub** — record fixed-tick state into a ring buffer (every 0.5s of simTime is enough). Slider in the header.
- **Skip to result** — single button that completes simulation in a tight loop, then opens the overlay.
- **Replay** — re-create runners from the seeded RNG. Already implemented as a side effect of route refresh; surface it as a button on the result overlay.

**Why.** Alex (Tourist) wants to _re-watch_ the great moment. Maya wants to scrutinise pace. Both are blocked today.

### G4. Sprite assets present but unused

**Today.** [HorseSprite](../../../src/routes/race.$raceId.tsx#L391) renders a coloured circle. The note in the code says _"For now, use colored circle; future: use CSS sprite animation with spriteUrl"_.

**Target.** Adopt the sprite path. The `horse-*.png` files are 6-frame running sprite sheets (per [01-design-system/03-iconography-and-imagery.md](../01-design-system/03-iconography-and-imagery.md)). CSS animation: `steps(6)` over a `background-position` keyframe at the simulation's apparent gait rate.

**Constraint.** The silk dot stays beside the sprite — the sprite carries _coat_ (the horse's identity), the silk dot carries _ownership_ (whose horse). They are not redundant.

**Why.** Principle 3 — race day, every screen. The sprite is the strongest race-day visual. Leaving it on the floor leaves the screen feeling underdone.

### G5. No commentary / odds / ribbon HUD

**Today.** Header + track + leaderboard. Nothing else.

**Target.** Reserve a **HUD region** below the header, above the track:

```
┌─ Header ─────────────────────────────┐
├─ HUD ribbon (configurable) ──────────┤  ← NEW: commentary / odds / split times
├─ Track ──────────────┬─ Live order ──┤
└──────────────────────┴───────────────┘
```

The HUD region is a flexible slot. Future features drop in:

- **Commentary** — live text feed (positions changing, pace notes).
- **Odds board** — pre-race tote, in-race "current favourite" indicator.
- **Split times** — quarter/half/three-quarter splits for completed sections.
- **Multi-cam selector** — when multiple visual treatments land.

**Why.** Designing the slot now means future features compose without re-architecting. Principle 6 (state visible).

### G6. Live region for screen readers

**Today.** No `aria-live`. Sighted players get position changes; screen-reader players get nothing.

**Target.** A polite live region announces:

- Race start: _"Belmont Stakes underway."_
- Position changes for owned horses: _"Stardust now in 2nd."_
- Finish: _"Stardust finishes 1st in 92.4 seconds."_

Throttle to one announcement per 3 seconds to avoid flooding.

**See.** [07-quality/01-accessibility.md](../07-quality/01-accessibility.md).

### G7. Reduced-motion treatment

**Today.** Pulse animation on every horse, every tick, regardless of OS preference.

**Target.** With `prefers-reduced-motion: reduce`, drop the pulse and the horse sprite animation. Position updates remain (they carry information). Result overlay appears instantly with no fade.

**See.** [01-design-system/04-motion.md](../01-design-system/04-motion.md).

### G8. Light-theme variant

**Today.** Dark only. The screen ignores the user's system preference.

**Target.** Once the broadcast theme is tokenised (G1), build a _daylight_ broadcast variant — same theme structure, lighter values. Toggle by user preference or by race weather (sunny + day-time → daylight; sunset/night → dark).

**Why.** It's a polish item, not a P0. But it's the kind of thing that elevates the broadcast feel from _"good"_ to _"of course"_.

---

## Layout (target state, post-fixes)

```
┌─ Header — title, conditions, controls ──────────── [Pause] [Speed ▼] ─┐
├─ HUD ribbon — commentary / odds / splits ─────────────────────────────┤
├─ Track — full width minus sidebar ──────────────┬─ Live order ────────┤
│                                                  │ Sort / Filter      │
│   Lane 1: silk + sprite + name                   │ Min Beyer ─────●── │
│   Lane 2: ...                                    │                     │
│   Lane n: ...                  FIN ▌             │ Row × n            │
│                                                  │                     │
└──────────────────────────────────────────────────┴─────────────────────┘
[ ◀──── Scrub timeline ────▶ ]
```

---

## Components used

- Primitives: `Button`, `Select`, `Slider`, `Dialog` (result overlay).
- Domain: future `RaceCommentary`, `OddsBoard`, `RaceReplay` controls.
- The track and `HorseSprite` remain race-screen-specific (they are not reusable elsewhere).

---

## Data

- `useGame((s) => s.races.find(r => r.id === raceId))`.
- `useGame((s) => s.horses)`.
- `buildRaceField`, `rngForRace` from [src/services/raceSimulationService.ts](../../../src/services/raceSimulationService.ts).
- `stepRunner`, `computePaceContext` from [src/game/raceSim.ts](../../../src/game/raceSim.ts).
- Beyer projection: `beyerFigure` from [src/game/beyer.ts](../../../src/game/beyer.ts).

---

## Copy

- Header title: race name (title case).
- Header subtitle: _"{distance}m · {raceClass} · Purse ${purse} · {weather emoji + word} · Track: {condition}"_.
- Speed buttons: `1x`, `2x`, `4x`. Active uses `secondary` variant.
- Live-order label (uppercase tiny): _"LIVE ORDER"_.
- Min Beyer label: _"Min Beyer {value}"_.
- Owned-horse chip: _"YOU"_.
- Empty leaderboard (filtered out): _"No runners match the current filters."_
- Result overlay title: race name.
- Result overlay subtitle: _"Final result"_.
- Continue CTA: _"Continue"_.

---

## States

- **Pre-race / loading** — currently instant. Future: brief intro card with race name + ceremonial silk parade.
- **Live** — continuous simulation.
- **Filtered to empty** — leaderboard shows the empty message.
- **Finished** — result overlay; speed controls hidden; _"Back to races"_ CTA in the header.
- **Resolved (revisit)** — _"This race has already been run."_ page-level.
- **Not found** — _"Race not found."_ page-level.
- **Reduced motion** — no pulse, no sprite animation, fade replaced by instant.

---

## Accessibility (current + target)

- All interactive controls keyboard-accessible (already true today via Radix primitives).
- Speed buttons have visible labels; no icon-only states.
- **Add (G6):** `aria-live="polite"` region for race announcements.
- **Add:** descriptive `aria-label` on the track itself: _"Live race track. Stardust currently 2nd of 8."_
- **Add (G7):** reduced-motion contract.

---

## Handoff spec (per [07-quality/03-design-handoff.md](../07-quality/03-design-handoff.md))

| Field           | Value                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout pattern  | Full-bleed, broadcast theme                                                                                                                       |
| Tokens consumed | (post-G1) `broadcast-*` family, `chart-*` for any added visualisations, `radius-lg`                                                               |
| Spacing         | Lane height = `--race-lane-height`, sidebar = `--race-sidebar-width`                                                                              |
| Typography      | Title `text-xl font-bold`, subtitle `text-xs text-broadcast-foreground-muted`, leaderboard rows `text-sm`, beyer badge `text-[10px] tabular-nums` |
| Motion          | `motion-race-pulse`, race-screen-specific (G7 contract)                                                                                           |
| Live regions    | `aria-live="polite"` (race calls), `aria-live="assertive"` (only at finish)                                                                       |
| Animations      | Sprite frame stepper (`steps(6)`), leaderboard reorder transition (250ms `ease-out`)                                                              |
| Open issues     | G1–G8 above                                                                                                                                       |

---

## Telemetry

- Race screen viewed (race id, owned horses present?).
- Speed selection chosen.
- Finish reached (vs. tab closed).
- Replay button clicked.
- Filter / sort use.

---

## Open questions

- **Audio.** No sound today. A discreet ambient (crowd murmur + hooves) would massively elevate the broadcast feel. Decision pending — needs an audio direction document of its own.
- **Camera / zoom.** Today the track is fit-to-screen. Could a "follow camera" mode (centred on the leader, faster horses dramatised) work? Or does that betray Maya's preference for global view?
- **Multi-race day.** When 4+ races run on the same in-game day, can the player jump between them mid-race day, or does each race finish before the next begins? Current implementation: sequential.

---

## Verification — does the system describe this screen?

Walk it back through the bible:

| Aspect                                | Resolved by                                                                |
| ------------------------------------- | -------------------------------------------------------------------------- |
| Why this screen exists, who it serves | [00-foundations/](../00-foundations/)                                      |
| Colours, type, motion, theme          | [01-design-system/](../01-design-system/) (with broadcast-theme gap noted) |
| Copy patterns                         | [02-voice/](../02-voice/)                                                  |
| Components used (today and target)    | [03-components/](../03-components/)                                        |
| Layout, density, interactions         | [04-patterns/](../04-patterns/)                                            |
| Accessibility                         | [07-quality/01-accessibility.md](../07-quality/01-accessibility.md)        |
| How to add the missing pieces         | [08-extending/](../08-extending/)                                          |

Every drift here has a documented home. The bible holds.
