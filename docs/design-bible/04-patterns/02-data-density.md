---
name: Data density
description: Tables, lists, sortable columns, the scannable stats row
type: pattern
status: Stable
owns: design:design-system
---

# Data density

Gallop is dense by design. The job of this pattern is to keep that density readable.

---

## Tables

### When to use a table

When the user needs to **compare across rows** on the same attributes. If they're scanning to find one item and not comparing, a card grid is usually better.

### Table conventions

- **`<Table>`** primitive ([src/components/ui/table.tsx](../../../src/components/ui/table.tsx)).
- **Numeric columns** — `text-right` aligned, `tabular-nums` always.
- **Text columns** — `text-left`.
- **Header row** — `text-xs uppercase tracking-wide text-muted-foreground`. Quiet, not shouty.
- **Row hover** — `hover:bg-muted/50 transition-colors`. No transform, no border change.
- **Stripes** — never. They distract from the data.
- **Borders** — bottom border on each row (`border-b`), no vertical borders.

### Sort affordances

- Sortable column headers are `<button>`s with a chevron (Lucide `ChevronUp` / `ChevronDown`).
- Active sort column: chevron in `text-foreground`; inactive: `text-muted-foreground`.
- Click toggles direction; click a different column resets to its default direction.

### Pagination

- < 20 rows: never paginate.
- 20–50 rows: virtualised scroll (or pure scroll if list is short).
- 50+ rows: pagination via `Pagination` primitive.

---

## Lists (card grids)

### When to use cards

When the user is **scanning to find one** rather than comparing. Cards carry richer detail per item.

### Card grid conventions

- `grid grid-cols-1 lg:grid-cols-2` for horse-card-style detail.
- `grid grid-cols-1 md:grid-cols-3` for stat tiles on dashboard.
- `gap-4` between cards (16px). Don't use `gap-3` or `gap-6` — consistency matters.
- Each card is a `Card` primitive with internal padding `p-5` (or `p-3` for compact).

---

## The scannable stats row

The most important density pattern in Gallop. A horse, a race, or an entry shown as a row of metric cells, instantly comparable to the row above and below.

```tsx
<div className="flex items-center gap-3 py-2 border-b">
  <div className="h-5 w-5 rounded-full" style={{ backgroundColor: silk }} />
  <span className="flex-1 truncate font-medium">{name}</span>
  <span className="w-16 text-right tabular-nums">{beyer}</span>
  <span className="w-20 text-right tabular-nums text-muted-foreground">{lastRaceTime}s</span>
  <span className="w-24 text-right tabular-nums">${earnings.toLocaleString()}</span>
</div>
```

**Why fixed widths on numeric columns** — without `w-16` / `w-20`, the columns won't align across rows. With them, three names of different lengths still produce three perfectly aligned Beyer columns.

---

## Filter and sort patterns

### Filter UI

- **One-of-many filters** (e.g. surface = Turf | Dirt | Synthetic) → `ToggleGroup` with `variant="outline"`. Sits above the table.
- **Many filters** → row of `Select`s. Group filters that combine logically; separate the destructive one (e.g. "show retired") to the right.
- **Search** → `Input` with the search icon, `placeholder="Search horses…"`. Debounce 200ms.
- **Reset** → small `Button variant="ghost" size="sm"`, only visible when ≥1 filter is non-default.

### Filter copy

| Use                 | Example                                          |
| ------------------- | ------------------------------------------------ |
| Default option      | _"All surfaces"_ (not _"Any"_, not _"None"_)     |
| Empty filter result | _"No horses match your filters."_ + reset button |
| Plural counts       | _"Showing 12 of 47 horses"_                      |

### URL state

Filters live in `search` params (TanStack Router). Sort direction lives there too. This means a player's filtered view is bookmarkable and survives a refresh.

---

## Information hierarchy on a row

Rule of thumb: **left = identity, right = numbers, middle = qualifiers.**

```
[silk] [name]                  [class] [date]    [Beyer] [time] [$]
 │      │                       │       │         │       │      │
 │      │                       │       │         └───┬───┴──────┘
 │      └ "what is this row"    └───┬──┘             └─ tabular-nums, right-aligned
 └─ visual anchor                   └─ qualifiers
```

The eye should be able to:

- Identify the row in 0.3s (silk + name).
- Categorise it in 0.6s (qualifiers).
- Compare it to the next row in 1.2s (numbers).

---

## What we don't do

- **Mixed unit columns** — don't put a metres column next to a furlongs column. Pick one.
- **Sparkline-in-row** — beautiful, but we save them for horse cards. Tables stay still.
- **Coloured row backgrounds for highlighting** — use a left-edge accent (`border-l-2 border-l-primary`) instead. Coloured rows feel rigged.
- **Row expansion** — don't expand a row inline to show detail. Use a sheet or a drill-in route.

---

## Open questions

- For very long horse lists (50+), do we want a sticky header? Currently no, but it would help Maya.
- Should we allow column hide/show as a power-user feature? Risk: every player ends up on a different layout, breaking shared screenshots and support.
