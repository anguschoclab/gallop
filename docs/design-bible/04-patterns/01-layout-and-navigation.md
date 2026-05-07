---
name: Layout and navigation
description: How screens are structured, when to break the shell, how the player moves
type: pattern
status: Stable
owns: design:design-system
---

# Layout and navigation

Every Gallop screen lives inside one of three layouts. Pick the right one for the job; don't invent a fourth without a decision-log entry.

---

## Layout 1 — `AppShell` (default management layout)

[AppShell.tsx](../../../src/components/AppShell.tsx). 240px sidebar + main content. Used for everything except the live race screen.

```
┌──────────┬─────────────────────────────────┐
│ Sidebar  │ Main (max-w-6xl, mx-auto, p-6)  │
│ • Brand  │                                 │
│ • Nav    │  <Outlet />                     │
│ • Cash   │                                 │
│ • Time   │                                 │
└──────────┴─────────────────────────────────┘
```

- **Sidebar:** brand block (top), nav items (middle, flex-1), cash + time controls (bottom). Always visible.
- **Main:** centred content column, capped at `max-w-6xl` (~1152px). Padding `p-6`.
- **Background:** `bg-muted/30` for the page; cards inside use `bg-card`. The slight backdrop tint is what makes cards float.

**The 7 nav items** — Dashboard, Stable, Races, Breeding, Auction, Market, Settings — are deliberate. Adding an 8th needs a vision-level conversation, not just an icon. Secondary screens (Recap, Awards, Rivals, Broodmares) have been integrated into these primary pillars.

---

## Layout 2 — Full-bleed (race screen)

`AppShell` early-returns `<Outlet />` for any path starting with `/race/`. The race screen owns its full-bleed layout:

```
┌────────────────────────────────────────────────┐
│ Race header (title, conditions, controls)      │
├────────────────────────────────┬───────────────┤
│ Track (1fr)                    │ Sidebar 280px │
│                                │ (live order)  │
└────────────────────────────────┴───────────────┘
```

Why we break the shell: the live race is the **climax**. The sidebar of management chrome would visually flatten the moment.

**Rules for full-bleed screens:**

- Must own all of (a) navigation back, (b) primary controls, (c) result handling.
- Must use the broadcast theme (implemented — see [05-theming.md](../01-design-system/05-theming.md)).
- Must use the same tokens, typography, and silk treatment as the rest of the product.

---

## Layout 3 — Modal-ish (overlays)

Some interactions belong on top of the current screen, not as a new route:

| Pattern | Component | When                                                                        |
| ------- | --------- | --------------------------------------------------------------------------- |
| Modal   | `Dialog`  | Pause-the-world decisions (PlayerRacePrompt, retire-to-stud).               |
| Sheet   | `Sheet`   | Inspect detail without losing list context (e.g. tap a horse → side panel). |
| Popover | `Popover` | Show detail attached to an element (e.g. info icon).                        |
| Toast   | `Sonner`  | Transient feedback.                                                         |

**Don't** use a modal where a route would do (and vice versa). A modal interrupts; a route is a destination.

---

## Navigation principles

### 1. Top-level nav is flat

The sidebar shows seven destinations, no nesting. Sub-paths (`/stable/$horseId`, `/auction/$saleId`) are reachable from inside the parent screen, not the sidebar.

### 2. Active state is obvious

Active nav item: `bg-primary text-primary-foreground`. Inactive: `text-muted-foreground` with `hover:bg-accent hover:text-foreground`. The contrast must read instantly.

### 3. Back-out is the player's job

Routes don't auto-redirect. If a player ends up at `/stable/$horseId` for a horse they sold, the screen shows an empty state with _"This horse is no longer in your stable"_ and a link back. We don't kick them out.

### 4. URL is the source of truth

Filters, sorts, and selections that survive a refresh live in the URL (search params via TanStack Router). Ephemeral UI state (which row is hovered, modal open) lives in component state.

### 5. The race screen is its own URL

`/race/$raceId` is bookmarkable, refreshable, and replays deterministically (seeded RNG). Closing the tab mid-race and reopening must show the same outcome.

---

## Responsive

Gallop targets desktop (≥1024px) as its primary canvas, but every screen must work down to 768px (tablet portrait) without breaking.

| Breakpoint        | What changes                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| ≥ 1024px (`lg`)   | Default. Sidebar visible, multi-column grids, race-screen sidebar visible.                         |
| 768–1023px (`md`) | Sidebar visible (still 240px), grids collapse to 1 col, race-screen sidebar moves under the track. |
| < 768px           | Out of scope for v1. We don't break — but we don't optimise. Future work.                          |

The race screen explicitly uses `grid-cols-1 lg:grid-cols-[1fr_280px]` ([race.$raceId.tsx:235](../../../src/routes/race.$raceId.tsx)).

---

## Page anatomy template

Every management screen follows this anatomy:

1. **Page header** — page title (h1), one-line subtitle if needed, primary action (button) on the right.
2. **Filters / controls** — left-aligned, sit below the header.
3. **Content** — list, grid, or detail.
4. **Empty / loading state** — fills the content area when applicable (see [03-empty-loading-error.md](03-empty-loading-error.md)).

```tsx
<div>
  <header className="flex items-end justify-between mb-4">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">My stable</h1>
      <p className="text-sm text-muted-foreground">8 horses · 3 in training</p>
    </div>
    <Button>Browse auction</Button>
  </header>
  {/* filters */}
  {/* content */}
</div>
```

---

## Open questions

- Do we want a `Cmd-K` command palette layer for power users (Maya)? Reserved.
- Is `AppShell` collapsing the sidebar to icons-only on narrow viewports a worthwhile feature? Currently no; revisit if mobile becomes a priority.
