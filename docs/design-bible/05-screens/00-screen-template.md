---
name: Screen template
description: The standard spec template every screen file follows
type: screen
status: Stable
owns: engineering:documentation
---

# Screen template

Copy this file to a new `05-screens/NN-screen-name.md` when adding a screen. Fill every section. Delete this header line and replace with the screen's name and frontmatter.

---

# {Screen name}

## At a glance

- **Route:** `/path/$param` (link to `src/routes/...tsx`)
- **Primary persona served:** Maya / Tomás / Alex (one or two)
- **Primary verb:** Train / Breed / Enter / Bid / Watch / Browse
- **Layout:** AppShell (default) | Full-bleed | Modal-only
- **Theme:** Light/dark | Broadcast (race-screen only)
- **Status:** Stable / Draft / Needs review

## Purpose

One paragraph: what this screen is for. Who comes here, why, and what they leave with.

## User journey

The 3-5 step happy path:

1. Player arrives from {entry point}.
2. Sees {key information}.
3. Makes {decision or action}.
4. Leaves to {next screen} or back to {previous}.

## Layout

ASCII or description of the major regions. Reference the layout pattern from [04-patterns/01-layout-and-navigation.md](../04-patterns/01-layout-and-navigation.md).

```
┌─ Header ────────────────────────────────┐
│ Title / Subtitle              [CTA]     │
├─────────────────────────────────────────┤
│ Filters / controls                      │
├─────────────────────────────────────────┤
│ Content                                 │
└─────────────────────────────────────────┘
```

## Components used

- **Primitives:** `Button`, `Card`, `Table`, ...
- **Domain:** `HorseCard`, `BeyerBadge`, ...
- **Custom (this screen only):** if any. Justify their absence from the shared library.

## Data

- **Source:** Zustand selectors (`useGame((s) => ...)`), service calls (`...Service.ts`).
- **Loading state:** Skeleton pattern, route deferred load, etc.
- **Empty state:** Copy + CTA.
- **Error state:** What happens when the data fails.

## Copy

- Page title: _"..."_
- Subtitle (if any): _"..."_
- Primary CTA: _"..."_
- Empty state: _"..."_ + button label.
- Tooltips on jargon: list any term that gets a tooltip on this screen.

## States

- Default
- Loading
- Empty (no data)
- Filtered to empty
- Error
- (Screen-specific states — e.g. "race not yet started", "horse retired")

## Accessibility

- Keyboard navigation paths.
- Live-region announcements (if relevant — e.g. race screen).
- Focus order.
- Anything color-only that needs a non-colour signal.

See [07-quality/01-accessibility.md](../07-quality/01-accessibility.md) for project-wide rules.

## Telemetry (when implemented)

What events do we want to capture? (Page view, primary CTA click, filter use, drill-in.)

## Open questions

Anything unresolved about this screen.

---

## How to use this template

1. Copy this file. Rename it `NN-screen-name.md` (where `NN` is the next number).
2. Replace the placeholder content section by section.
3. Add an entry in [README.md](../README.md) reading paths if the screen serves a path that's not already covered.
4. Cross-link from any related component or pattern.
5. Set status to `Draft` until reviewed by both design and engineering, then `Stable`.

The template is **mandatory**. New screen specs that skip sections will be rejected at PR review.
