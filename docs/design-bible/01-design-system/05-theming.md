---
name: Theming
description: Light, dark, and the planned 'broadcast' theme — and how to add a new theme
type: design-system
status: Draft
owns: design:design-system
---

# Theming

Gallop's product identity is the dark **racing noir** theme — near-black turf greens with gold accents — and it is the default. Light theme exists but is experimental. The broadcast theme is a subtree layer for the live race screen. Themes are distinct from tokens: the _tokens_ (semantic names) stay constant; the _values_ swap.

---

## How theming works

Semantic token values live in `:root` (dark racing-noir, the default) with overrides under `.light` ([styles.css](../../../src/styles.css)). The resolved theme is applied as a `.dark` / `.light` class on `<html>`.

Three layers cooperate:

1. A pre-hydration inline script in [src/routes/__root.tsx](../../../src/routes/__root.tsx) reads the cached theme from `localStorage` (`gallop.theme`) and applies the class before paint — no flash of wrong theme.
2. `useTheme` ([src/domains/shell/application/hooks/useTheme.ts](../../../src/domains/shell/application/hooks/useTheme.ts)) reads `userSettings.display.theme` (`"dark" | "light" | "system"`, default `"dark"`), applies the class, and re-resolves on OS changes when set to `system`.
3. The toggle lives in Display settings ([DisplaySettingsCard.tsx](../../../src/domains/settings/ui/DisplaySettingsCard.tsx)).

**The contract:** components consume tokens via `bg-muted`, `text-muted-foreground`, etc. They never branch on theme. If you find yourself writing `if (theme === 'dark')`, you're doing it wrong — extend the token instead.

**Primitive racing tokens are not consumed directly.** The `t950…t500`, `cream`, `gold*` utility families remain registered for the design bible's reference, but production TSX must use the semantic layer (`background`, `foreground`, `muted-foreground`, `primary`, `border`, `card`, `muted`, `surface`, `surface-hover`, `surface-strong`, `accent`, `accent-bright`). A guardrail test enforces this.

---

## Dark theme — the default

Racing noir: turf-dark surfaces, cream text, gold accent. Applied in `:root` so the first paint is already dark.

Hero values:

- `background` → `--t950` (`oklch(0.06 0.02 150)`) — near-black green.
- `card` → `--t800`; `surface` → `--t900`; `surface-hover` → `--t600`; `surface-strong` → `--t500`.
- `foreground` → `--cream`; `muted-foreground` → `--cream-muted`.
- `primary` → `--gold` (`oklch(0.65 0.15 85)`); `accent` → `--gold-subtle`; `accent-bright` → `--gold-light`.
- `border` → `--gold-muted` (gold at 30%).

---

## Light theme — experimental

White-ish background, deep slate text, restrained accents. Coherent but not yet audited screen-by-screen; enabled via Settings → Display → Theme = "light" or "system".

- `background: oklch(1 0 0)` — pure white.
- `foreground: oklch(0.129 0.042 264.695)` — near-black, faintly blue.
- `primary: oklch(0.208 0.042 265.755)` — dark slate.
- `surface`/`surface-hover`/`surface-strong` — light neutral steps matching the dark ramp's roles.

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
