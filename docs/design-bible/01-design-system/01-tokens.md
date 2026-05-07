---
name: Design tokens
description: Colour, radius, and spacing tokens — what they are and where they live
type: design-system
status: Stable
owns: design:design-system
---

# Tokens

Tokens are the indivisible particles of the design system. Every colour, every radius, every space lives here — defined once, used everywhere via Tailwind utility classes.

**Source of truth:** [src/styles.css](../../../src/styles.css). Edit there; this file documents and explains.

---

## Naming model

Tokens are layered:

| Layer                | Example                             | What it is                                                                        |
| -------------------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| **Primitive**        | `oklch(0.968 0.007 247.896)`        | Raw value. Lives only in `:root` / `.dark`. Never used directly in components.    |
| **Semantic**         | `--muted`                           | A primitive given a _role_. Used in `@theme inline` to expose Tailwind utilities. |
| **Tailwind utility** | `bg-muted`, `text-muted-foreground` | What components actually consume.                                                 |

**Rule:** components consume _Tailwind utilities_, never primitives. If you find a hex code or `oklch(...)` in a component, file it as a bug. The only exception is the race screen's emerald palette — and that's an explicit gap to be closed (see [05-theming.md](05-theming.md)).

---

## Colour tokens

### Why OKLCH

All colours use OKLCH (`oklch(L C H)`), not hex or HSL. OKLCH is perceptually uniform — equal L deltas feel like equal lightness deltas, which makes themed pairs (light/dark) much easier to keep balanced.

### Semantic palette

| Token                                    | Role                              | Light value                  | Dark value                                |
| ---------------------------------------- | --------------------------------- | ---------------------------- | ----------------------------------------- |
| `background`                             | Page background                   | `oklch(1 0 0)` (white)       | `oklch(0.129 0.042 264.695)` (deep slate) |
| `foreground`                             | Primary text on `background`      | deep slate                   | near-white                                |
| `card`                                   | Card / panel background           | white                        | medium slate                              |
| `card-foreground`                        | Text on `card`                    | deep slate                   | near-white                                |
| `popover` / `popover-foreground`         | Floating layers (menus, tooltips) | white / deep slate           | medium slate / near-white                 |
| `primary` / `primary-foreground`         | Highest-emphasis surfaces         | dark slate / off-white       | off-white / dark slate (inverts)          |
| `secondary` / `secondary-foreground`     | Lower-emphasis filled surfaces    | very pale slate / dark slate | mid-dark slate / off-white                |
| `muted` / `muted-foreground`             | Backdrops, subtle text            | very pale slate / mid-grey   | mid-dark slate / mid-grey                 |
| `accent` / `accent-foreground`           | Hover and pressed states          | very pale slate / dark slate | mid-dark slate / off-white                |
| `destructive` / `destructive-foreground` | Errors, dangerous actions         | red / off-white              | red / off-white                           |
| `border`                                 | Component borders                 | pale slate                   | white at 10% alpha                        |
| `input`                                  | Form-field borders                | pale slate                   | white at 15% alpha                        |
| `ring`                                   | Focus rings                       | mid slate                    | mid slate                                 |

### Status tokens

Used for consistent feedback and data visualization across management and broadcast views.

| Token         | Role                                     | Colour          |
| ------------- | ---------------------------------------- | --------------- |
| `success`     | Positive outcomes, profit, owned entries | Emerald / Green |
| `warning`     | Risks, low energy, covering sickness     | Amber / Yellow  |
| `destructive` | Errors, negative outcomes, losses        | Red             |
| `info`        | Grade 3 races, neutral context           | Blue / Sky      |
| `fame`        | Grade 1 races, horse of the year, awards | Gold / Gold     |

### Chart palette

Five tokens, light/dark flavoured, intended for data viz. Use in this order; if you need a sixth, you're probably making the chart too busy.

| Token     | Light       | Dark       |
| --------- | ----------- | ---------- |
| `chart-1` | warm orange | royal blue |
| `chart-2` | teal        | emerald    |
| `chart-3` | navy        | gold       |
| `chart-4` | gold        | violet     |
| `chart-5` | amber       | rose       |

Charts use these via the `<ChartContainer>` wrapper (see [03-components/03-data-visualization.md](../03-components/03-data-visualization.md)).

### Sidebar palette

The sidebar (`AppShell`) has its own family so it can carry a slightly different mood from the main content area. Tokens: `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-accent`, `sidebar-border`, `sidebar-ring`. Same naming pattern as the global palette.

### The broadcast theme

The live race screen uses a dedicated `.broadcast` theme with emerald backgrounds and high-contrast accessibility tokens. Documented in [05-theming.md](05-theming.md).

| Token                  | Role                       |
| ---------------------- | -------------------------- |
| `broadcast-track`      | Track surface base         |
| `broadcast-rail`       | Lane dividers, finish line |
| `broadcast-accent`     | Beyer badges, "YOU" chip   |
| `broadcast-foreground` | All text                   |

---

## Radius tokens

Base radius is `--radius: 0.625rem` (~10px). All other radii derive from it:

| Token                       | Calc           | Pixels (at base) | Used for                          |
| --------------------------- | -------------- | ---------------- | --------------------------------- |
| `radius-sm`                 | `radius - 4px` | 6px              | Tag-like badges, very small chips |
| `radius-md`                 | `radius - 2px` | 8px              | Buttons, inputs                   |
| `radius-lg`                 | `radius`       | 10px             | Cards, panels                     |
| `radius-xl`                 | `radius + 4px` | 14px             | Hero cards, modals                |
| `radius-2xl`                | `radius + 8px` | 18px             | Sheet drawers                     |
| `radius-3xl` / `radius-4xl` | larger         | 22px / 26px      | Reserve for visual hero blocks    |

**Rule of thumb:** if two adjacent surfaces have different radii, the larger surface should have the larger radius (so the smaller nests cleanly inside).

---

## Spacing

We use Tailwind's default spacing scale (4px increments). The opinionated bits:

| Use                             | Class                   | Pixels |
| ------------------------------- | ----------------------- | ------ |
| Inline gap inside a card row    | `gap-2`                 | 8      |
| Standard component gap          | `gap-3`                 | 12     |
| Card-to-card gap on a grid      | `gap-4`                 | 16     |
| Section gap (header to content) | `gap-6`                 | 24     |
| Page padding                    | `p-6` (`AppShell` main) | 24     |
| Card padding (default)          | `p-5`                   | 20     |
| Card padding (compact)          | `p-3`                   | 12     |
| Sidebar nav item padding        | `px-3 py-2`             | 12 / 8 |

The race screen uses different units (36px lane height, 280px sidebar) because it's pixel-locked to the simulation. These will be tokenised — see [05-theming.md](05-theming.md).

---

## Tabular numerics

Any column or row of numbers should use the `tabular-nums` Tailwind class. This is a non-negotiable expression of principle 1 ("Numbers are the protagonist").

Examples in the codebase: cash counter in [AppShell.tsx](../../../src/components/AppShell.tsx) (line 67), every leaderboard row in [race.$raceId.tsx](../../../src/routes/race.$raceId.tsx).

---

## How to add a new token

See [08-extending/01-how-to-add-a-token.md](../08-extending/01-how-to-add-a-token.md).

---

## Open questions

- Should we expose a _neutral_ slate scale (50–900) for advanced cases, or keep semantic-only?
- The `sidebar-primary` dark value is currently a saturated blue — is that intentional or accidental? Reconcile when introducing the broadcast theme.
