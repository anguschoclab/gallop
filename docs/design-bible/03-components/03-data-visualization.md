---
name: Data visualization
description: Charting conventions — when, how, and what tokens
type: components
status: Stable
owns: design:design-system
---

# Data visualization

Charts in Gallop serve Maya's archetype most directly: the player who wants to _see_ a distribution, a trend, or a comparison at a glance. They follow strict rules so that across screens they read like one chart family.

**Library:** Recharts, wrapped via `<ChartContainer>` ([src/components/ui/chart.tsx](../../../src/components/ui/chart.tsx)).

---

## When to use which chart

| Question                                          | Chart                            |
| ------------------------------------------------- | -------------------------------- |
| _How does this horse compare across attributes?_  | Radar (`HorseStatsRadar`)        |
| _How has this horse's Beyer trended?_             | Line (`BeyerChart`)              |
| _How does this horse's wins distribute by class?_ | Bar (`GradedStatsChart`)         |
| _How does sire compatibility vary by attribute?_  | Radar (`BreedingRadarChart`)     |
| _Where does this horse fall in a population?_     | Histogram (future)               |
| _How did the field's pace look in this race?_     | Line w/ multiple series (future) |
| _What's the share of X across categories?_        | **Don't pie.** Use a bar.        |

We **never** use pie charts. The eye can't compare angles well; bar charts always win on accuracy.

---

## Token mapping

Charts pull colours from `--chart-1` through `--chart-5` ([01-tokens.md](../01-design-system/01-tokens.md)). Use them in order; if you need a sixth, the chart is doing too much.

```tsx
const config = {
  speed: { label: "Speed", color: "var(--chart-1)" },
  stamina: { label: "Stamina", color: "var(--chart-2)" },
} satisfies ChartConfig;
```

**Background:** `bg-card`. Charts don't get their own gradient or pattern fill.

**Text:** axis labels and tick text use `text-muted-foreground` and `text-xs`. Title is `font-semibold text-sm`.

**Grid:** `stroke-border`, `strokeDasharray="3 3"` for non-zero gridlines, solid for the zero/baseline.

---

## Axes

- Always label both axes when their meaning isn't self-evident.
- Always show units on the axis label (e.g. _"Beyer"_, _"Distance (m)"_, _"Wins"_).
- **Never truncate the y-axis without saying so.** A Beyer chart from 90 to 110 is misleading without a "y-axis: 90–110" caption.
- **Tabular numerics on tick labels** — Recharts respects `font-variant-numeric: tabular-nums` if you set it on the parent.

---

## Tooltips on charts

Use the shadcn `<ChartTooltip>` and `<ChartTooltipContent>`. Pattern:

- Title: the x-value (date, race name).
- Body: each series, with its swatch, label, and value (`tabular-nums`).
- Don't put more than 4 series in one tooltip — split the chart instead.

---

## Annotations

Sometimes the line itself isn't enough. Acceptable annotations:

- **Race markers** on a Beyer trend line (a small dot + tooltip "G1 Belmont, won").
- **Reference lines** for a benchmark (e.g. "100 Beyer threshold for stakes").
- **Shaded ranges** for a horse's career phase (juvenile / open / veteran).

What we don't do: speech-bubble callouts, watermarks, decorative gridlines.

---

## Empty / sparse data

- A chart with **0 data points**: show the empty-state pattern (see [04-patterns/03-empty-loading-error.md](../04-patterns/03-empty-loading-error.md)) instead of an empty axis.
- A chart with **1 data point**: render it as a single dot with a label, not a line. ("First race — Beyer 87.")
- A chart with **2 data points**: render the line, but with a caveat label _"Two races so far"_.

---

## Mobile / narrow

Most Gallop charts assume desktop width. On narrow viewports:

- Radar charts collapse gracefully — they're square.
- Time-series charts: keep the time axis, drop minor gridlines, increase tick spacing.
- Multi-series bar charts: stack the categories vertically rather than horizontally.

---

## Performance

- Don't redraw on every state tick. The race screen recomputes `projectedBeyer` per tick; charts must memoise.
- 100 data points is the soft cap for live updating. Older points should be summarised (e.g. last-5 races detailed, older races as a single trend block).

---

## Examples in code

- [BeyerChart.tsx](../../../src/components/BeyerChart.tsx) — line, time series.
- [GradedStatsChart.tsx](../../../src/components/GradedStatsChart.tsx) — bar.
- [HorseStatsRadar.tsx](../../../src/components/HorseStatsRadar.tsx) — radar.
- [BreedingRadarChart.tsx](../../../src/components/BreedingRadarChart.tsx) — radar (compatibility).

---

## Open questions

- Should we standardise on a "small chart" preset (200×100, no axes) for inline sparklines on horse cards? Currently each component sizes itself.
- Time-series x-axis: in-game days vs. race-count vs. season-relative? Picked per-chart today; consider unifying.
