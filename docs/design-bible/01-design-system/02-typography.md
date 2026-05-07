---
name: Typography
description: Type scale, weights, numeric formatting
type: design-system
status: Stable
owns: design:design-system
---

# Typography

We ship system fonts, not custom webfonts. The reasons: zero load cost, native legibility on every OS, and a quietly authoritative feel that suits a sim. If we ever introduce a display face, it will appear _only_ on race-screen overlays — never in management UI.

---

## Family stack

Tailwind's defaults, unmodified:

- **Sans (default):** `ui-sans-serif, system-ui, ...` — used for everything.
- **Mono:** `ui-monospace, SFMono-Regular, Menlo, ...` — reserved for race times and split times that genuinely benefit from the fixed grid. Use sparingly.

We do **not** use a serif face. Serifs feel editorial; this is a control room.

---

## Scale

| Use                             | Class                                                       | Size        |
| ------------------------------- | ----------------------------------------------------------- | ----------- |
| Page H1 (e.g. _"My Stable"_)    | `text-3xl font-bold tracking-tight`                         | 30px / 36px |
| Section H2                      | `text-2xl font-semibold`                                    | 24px / 32px |
| Card title                      | `text-lg font-semibold`                                     | 18px / 28px |
| Card subtitle / meta            | `text-xs text-muted-foreground`                             | 12px / 16px |
| Body                            | (default) `text-sm`                                         | 14px / 20px |
| Button label                    | `text-sm font-medium`                                       | 14px / 20px |
| Stat headline (the number)      | `text-lg font-bold tabular-nums`                            | 18px / 28px |
| Stat headline (hero, e.g. cash) | `text-2xl font-bold tabular-nums`                           | 24px / 32px |
| Tiny label (uppercased)         | `text-[10px] uppercase tracking-wide text-muted-foreground` | 10px        |

Why `text-sm` as the body default: data-forward UIs want the next-line fact, not breathing room between sentences. 14px lets us pack a horse card densely without losing legibility.

---

## Weights

We use four weights consistently:

| Weight         | Class           | Use                                                                 |
| -------------- | --------------- | ------------------------------------------------------------------- |
| 400 (regular)  | (default)       | Body, table cells, secondary metadata                               |
| 500 (medium)   | `font-medium`   | Button labels, active nav items, the player's owned horses in lists |
| 600 (semibold) | `font-semibold` | Card titles, section headings                                       |
| 700 (bold)     | `font-bold`     | Page titles, headline stats, owned-horse emphasis on race screen    |

**Don't use** `font-light`, `font-thin`, or `font-extrabold`. We don't need the range, and they hurt our legibility on dark theme.

---

## Tracking

| Class                         | When                                                                    |
| ----------------------------- | ----------------------------------------------------------------------- |
| `tracking-tight`              | Headlines (`text-2xl` and above). Tightens slightly to feel commanding. |
| `tracking-wide` + `uppercase` | Tiny labels above values (e.g. _"PURSE"_, _"BEYER"_).                   |
| (default)                     | Everything else.                                                        |

---

## Numbers — the special case

Every number that participates in a column, row, or comparison gets `tabular-nums`. Without it, the digit `1` is narrower than `0`, and a column of times stops being a column.

```tsx
<span className="tabular-nums">{cash.toLocaleString()}</span>
<span className="tabular-nums">{beyer}</span>
<span className="tabular-nums">{r.finishTime?.toFixed(2)}s</span>
```

Money formatting: always `toLocaleString()`. Never `Math.round()` followed by hand-rolled comma logic.

Distances: integer metres (`1600m`) for race entries, _furlongs_ (with `f` suffix) for short-distance descriptions. Decimal point in distance is forbidden.

Times: two decimal places for finish times (`92.41s`), one decimal for splits (`23.4s`).

Percentages: integer (`87%`) unless the value moves on a finer grain (e.g. _win rate by track condition_ might warrant `87.4%`). Never more than one decimal.

See [02-voice/02-ux-copy-patterns.md](../02-voice/02-ux-copy-patterns.md) for the full number/copy treatment.

---

## Examples in the wild

- Cash in the sidebar — [AppShell.tsx:67](../../../src/components/AppShell.tsx) — `text-lg font-bold tabular-nums`.
- Race name on live race — [race.$raceId.tsx:214](../../../src/routes/race.$raceId.tsx) — `text-xl font-bold`.
- Beyer badge — [race.$raceId.tsx:288](../../../src/routes/race.$raceId.tsx) — `text-[10px] tabular-nums`.

---

## Open questions

- Do we need a hero numeric size larger than `text-2xl`? The race screen finish-line moment might want it.
- Should we introduce a single display face for the race-screen marquee (purse, race name)? Tracked for future.
