---
name: Design handoff
description: How designs become code — spec template, redline conventions, token mapping
type: quality
status: Stable
owns: design:design-handoff
---

# Design handoff

When a design crosses from Figma (or sketch) into the codebase, this is how it's spec'd. The goal: an engineer should be able to implement without asking questions about colour, spacing, or behaviour.

---

## The handoff packet

Every screen handoff includes:

1. **Layout artwork** — the design itself, in canonical states (default, loading, empty, error, plus screen-specific states).
2. **Token map** — what tokens each visible element consumes (see template below).
3. **Component map** — which primitives and domain components are used, and any new components introduced.
4. **Copy table** — every string on the screen, including states.
5. **Behaviour notes** — interactions, animations, navigation outcomes.
6. **Open questions** — anything unresolved at handoff time.

If any of the six is missing, the handoff is not ready.

---

## Token map template

Per visible region of the screen:

| Region | Token / utility | Notes |
|---|---|---|
| Page background | `bg-muted/30` | (AppShell layouts) |
| Card surface | `bg-card` | |
| Card border | `border` | |
| Card padding | `p-5` (default) or `p-3` (compact) | |
| Headings | `text-3xl font-bold tracking-tight` (h1), `text-lg font-semibold` (card) | |
| Body | `text-sm` | |
| Muted text | `text-muted-foreground` | |
| Numeric | `tabular-nums` | mandatory in numeric columns |
| Buttons | variant + size | e.g. `variant="default" size="sm"` |
| Silk dot | inline `style={{ backgroundColor: silk }}` + `border-white/40` | data colour, exception |
| Spacing | `gap-3` / `gap-4` / `gap-6` | per scale |

---

## Component map

| Component | File | Why this one |
|---|---|---|
| `Button` | `src/components/ui/button.tsx` | Primary CTA |
| `Card` | `src/components/ui/card.tsx` | Container |
| `HorseCard` | `src/components/HorseCard.tsx` | Each horse row |
| ... | | |

If a new component is introduced, link to its [03-components/](../03-components/) entry (or, if not yet documented, a stub). New components don't ship without a doc.

---

## Copy table

For every string on the screen:

| Location | Copy | Persona / tone |
|---|---|---|
| Page title | *"My stable"* | Composed, factual |
| Subtitle | *"8 horses · 3 in training"* | Composed |
| Primary CTA | *"Browse auction"* | Verb + object |
| Empty state heading | *"No horses yet."* | Factual |
| Empty state body | *"Visit the auction or breed your first foal."* | Inviting |
| Empty state CTA | *"Browse auction"* | Verb + object |
| Filter reset | *"Reset filters"* | Verb + object |
| Tooltip (Beyer) | *"A speed figure (0–~120) standardised across distances and tracks."* | Encyclopedia-tight |

---

## Behaviour notes

For each interaction:

| Trigger | Outcome |
|---|---|
| Click row | Drill into `/stable/$horseId` |
| Click header column | Sort by that column; toggle direction |
| Cmd+click row | Enter multi-select mode; show bottom action bar |
| Click "Compare" (in action bar) | Navigate to compare view (route or sheet, see [04-patterns/04-interaction-patterns.md](../04-patterns/04-interaction-patterns.md)) |
| Empty state CTA | Navigate to `/auction` |

For each animation:

| Element | Motion | Duration | Easing |
|---|---|---|---|
| Row hover | colour-only | 75ms | `ease-out` |
| Sheet slide-in | `translate-x` | 250ms | `ease-out` |
| Skeleton → content | fade in | 150ms | `ease-out` |

---

## Redline conventions

When marking up a design (in Figma or otherwise):

- **Solid red line** = required spacing or alignment.
- **Dashed red line** = container bound (not visible).
- **Yellow callout** = behaviour note.
- **Green callout** = copy with persona/tone tag.

Don't redline what the system already specifies (e.g. don't redline the height of a `Button size="sm"` — it's fixed). Redline only what the screen *uniquely decides*.

---

## What an engineer should never have to ask

If the engineer has to ask any of these, the handoff is incomplete:

- *"What colour is this?"* — token map covers it.
- *"What's this button label?"* — copy table covers it.
- *"What does it do when there's no data?"* — empty state in the screen file covers it.
- *"What happens after I click?"* — behaviour notes cover it.
- *"Can I just use a `<div>` here?"* — component map answers (no — use the documented primitive or domain component).

---

## Tailwind cheat-sheet (the most-used utilities)

| Use | Class |
|---|---|
| Card with default padding | `bg-card border rounded-lg p-5` |
| Page H1 | `text-3xl font-bold tracking-tight` |
| Section header row | `flex items-end justify-between mb-4` |
| Muted small text | `text-xs text-muted-foreground` |
| Numeric column | `text-right tabular-nums` |
| Tiny uppercase label | `text-[10px] uppercase tracking-wide text-muted-foreground` |
| Active nav item | `bg-primary text-primary-foreground` |
| Hover row | `hover:bg-muted/50 transition-colors` |
| Standard grid | `grid grid-cols-1 lg:grid-cols-2 gap-4` |
| Stat tile grid | `grid grid-cols-1 md:grid-cols-3 gap-4` |
| Race-screen sidebar | (post-G2) `w-[var(--race-sidebar-width)]` |

---

## When the design changes after handoff

1. Update the screen file ([05-screens/](../05-screens/)).
2. Communicate the change in the team channel — link to the updated file.
3. If it changes a token or component contract, append a [decision log](../08-extending/04-decision-log.md) entry.
4. Status of the screen file moves to `Needs review` until both design and engineering re-confirm.

---

## Open questions

- Should we adopt **Figma Tokens / Variables** to round-trip token values automatically? Probably yes once we have a Figma source.
- Is there a way to enforce token-only colour at the lint level? (e.g. ESLint rule that bans inline `style={{ background: '#...' }}`.) Track as engineering work.
