---
name: Theming
description: Light, dark, and the planned 'broadcast' theme — and how to add a new theme
type: design-system
status: Draft
owns: design:design-system
---

# Theming

Gallop ships three themes today: light (management), dark (management), and broadcast (live race). Themes are distinct from tokens: the _tokens_ (semantic names) stay constant; the _values_ swap.

---

## How theming works

Every semantic token has a value in `:root` (light) and `.dark` ([styles.css:64–133](../../../src/styles.css)). The user (or system) toggles `.dark` on `<html>`; every value that was named `--muted`, `--card`, etc. swaps under their feet.

**The contract:** components consume tokens via `bg-muted`, `text-muted-foreground`, etc. They never branch on theme. If you find yourself writing `if (theme === 'dark')`, you're doing it wrong — extend the token instead.

---

## Light theme — the default

White-ish background, deep slate text, restrained accents. Cool and clinical. The default management experience.

Hero values:

- `background: oklch(1 0 0)` — pure white.
- `foreground: oklch(0.129 0.042 264.695)` — near-black, faintly blue.
- `primary: oklch(0.208 0.042 265.755)` — dark slate, the highest-emphasis surface (active nav, primary buttons).
- `chart-1` through `chart-5` — warm orange → teal → navy → gold → amber. A diverse palette without losing harmony.

Use light theme for management screens. Day-light, sober.

---

## Dark theme

Dark slate background, near-white text, slightly cooler accents. Same information density, lower energy cost on screens used for hours.

Hero values:

- `background: oklch(0.129 0.042 264.695)` — deep slate.
- `card: oklch(0.208 0.042 265.755)` — medium slate.
- `primary: oklch(0.929 0.013 255.508)` — light slate (high contrast against dark background).
- `chart-1` through `chart-5` — royal blue → emerald → gold → violet → rose. Higher saturation; dark theme can carry it.

**A note on inversion:** in dark theme, `primary` is _light_ and `primary-foreground` is _dark_ — the inverse of light theme. This is by design: filled buttons stay high-contrast on either background.

---

## The broadcast theme

The live race screen uses a dedicated `.broadcast` theme applied via a `.broadcast` class on the race-screen wrapper. It prioritises high-contrast readability against dark emerald backgrounds, mimicking a sports television broadcast.

The fix: introduce a third theme variant — `broadcast` — applied via a `.broadcast` class on the race-screen wrapper.

### Proposed broadcast tokens

| Token                          | Role                                      | Proposed value                                 |
| ------------------------------ | ----------------------------------------- | ---------------------------------------------- |
| `--broadcast-track`            | Track surface base (under texture)        | `oklch(0.45 0.12 155)` — emerald-700 family    |
| `--broadcast-rail`             | Lane dividers, finish line                | `oklch(0.95 0.02 100)` — near-white            |
| `--broadcast-sky-overlay`      | Tint over sky photo                       | `oklch(0.2 0.05 220 / 0.2)` — subtle cool wash |
| `--broadcast-marquee`          | Top-bar / score bar                       | `oklch(0.1 0.02 220 / 0.4)` — dark cool wash   |
| `--broadcast-accent`           | Beyer badges, "YOU" chip, stat highlights | `oklch(0.85 0.18 95)` — yellow-400 family      |
| `--broadcast-foreground`       | All text                                  | `oklch(0.99 0.005 100)` — near-white           |
| `--broadcast-foreground-muted` | Secondary text                            | `oklch(0.99 0.005 100 / 0.7)`                  |

The race screen now consumes these tokens exclusively:

```tsx
<div className="broadcast min-h-screen bg-broadcast-track text-broadcast-foreground">
```

All inline hex and RGB values have been purged from [race.$raceId.tsx](../../../src/routes/race.$raceId.tsx).

### When the broadcast theme is loaded

- Live race screen — full bleed.
- Race recap — partial (top banner only, management chrome retained below).
- Race-day-adjacent CTAs in management UI (e.g. "Watch live") — accent colour only, full theme not loaded.

---

## How to add a new theme

See [08-extending/01-how-to-add-a-token.md](../08-extending/01-how-to-add-a-token.md). The short version:

1. Add token values for every semantic name in a new selector (e.g. `.broadcast { --background: ...; }`).
2. If the theme introduces _new_ roles not in the global semantic set (e.g. `--broadcast-track`), register them in `@theme inline`.
3. Apply the theme by adding the class to the root of the relevant subtree — never globally to `<html>` unless it's a true root theme.
4. Document the theme in this file.

---

## What we won't do

- **Custom user themes.** Players can't tweak colours. We ship the system; we own consistency.
- **Auto-switching mid-session.** Light/dark follows the OS preference at app start; no animated palette transitions.
- **Per-screen overrides.** A screen using "dark theme inside light theme" because it's "moodier" is forbidden. Use the broadcast theme or write a token.

---

## Open questions

- Should the broadcast theme be a _theme_, or a _layer_ (e.g. semantic tokens stay; broadcast adds extra ones)? The current proposal leans toward layer; revisit on first implementation.
- High-contrast accessibility theme — needed? Track in [07-quality/01-accessibility.md](../07-quality/01-accessibility.md).
