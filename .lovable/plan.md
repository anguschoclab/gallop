# Data viz rollout

A "modern analytics" pass (Linear/Vercel register) on top of the existing Noir & Gold palette. Introduces a shared chart kit, a new `/analytics` bento hub with drill-downs, and surgical chart additions across the screens you picked.

## 1. Foundations — shared chart kit

New `src/components/charts/` package. Every new chart in the game uses these primitives so we get one chart family.

- `ChartCard.tsx` — card shell with title, subtitle slot, optional delta pill, footnote. Rounded, subtle inner border, hover glow. Matches modern-analytics register.
- `Sparkline.tsx` — generic 1‑series sparkline (line/area) with optional last-value chip.
- `DeltaPill.tsx` — +/- value with trend arrow, tabular nums.
- `MiniBar.tsx` — horizontal bar row (for category breakdowns).
- `LegendChips.tsx` — uniform legend used across all charts.
- `chartTheme.ts` — refined Noir & Gold tokens, exported as `--chart-1..5`, gradient defs, grid/tick styles, tooltip styling. Replaces the ad-hoc colors currently inlined in `BeyerChart`, `GradedStatsChart`, etc.
- `useChartFormat.ts` — currency/number/date formatters with tabular-nums.

Token updates in `src/styles.css`:
- Refine `--chart-1..5` to: deep gold `#c9a84c`, light gold `#f0d78c`, cream `#f5f0e0`, slate `#2a2a32`, ember `#a8632a` (accent for negative/loss).
- Add `--chart-grid`, `--chart-axis`, `--chart-tooltip-bg`, `--gradient-chart-area` (soft gold→transparent).

## 2. New route — `/analytics` (bento overview + drill-downs)

```
src/routes/
  analytics.tsx              # layout (Outlet)
  analytics.index.tsx        # bento overview
  analytics.stable.tsx       # drill-down
  analytics.racing.tsx
  analytics.finance.tsx
  analytics.breeding.tsx
```

Bento overview tiles (each links to a drill-down):
- Stable KPI tile: active horses, avg form, low-energy count + 30d trend sparkline.
- Cash tile: balance + 90d cash curve (area, gradient fill).
- Win rate tile: rolling 30-race win/place/show donut-substitute (stacked bar — design bible bans pies).
- Earnings vs spend tile: dual-line last 12 weeks.
- Top sire tile: leaderboard #1 with AEI sparkline.
- Upcoming pressure tile: races next 14d, owned vs total, mini bar.
- Rival heat tile: top 3 rivals by friction with mini bar.
- Foal pipeline tile: pregnancies by trimester, stacked bar.

Drill-downs:
- **Stable** — fleet composition (age/discipline), training load over time, energy distribution histogram, form heat strip per horse.
- **Racing** — wins by class bar (reuse `GradedStatsChart`), Beyer distribution histogram, surface/distance scatter, last-30 results bumps chart.
- **Finance** — extend existing FinancialReport with: cash curve, income vs expense stacked area, expense category breakdown (MiniBar list), per-horse ROI ranked bar.
- **Breeding** — sire AEI/CI trend lines (from `sireTrendHistory`), progeny earnings scatter, compatibility heatmap for a chosen mare across stallions.

Nav: add "Analytics" entry to the existing sidebar; remove no other entries.

## 3. Screen-level rollouts

**Dashboard (`routes/index.tsx`)** — replace the current static KPI tiles with `ChartCard`s containing sparklines:
- Cash sparkline (90d), win-rate sparkline (30 races), upcoming race countdown strip, urgent inbox heatcount.
- Keep all existing data sources (`useDashboardData`); only the presentation changes.

**Horse detail (`stable.$horseId.tsx` / `HorseAnalyticsSection`)** — add:
- Energy/form dual-line over last 60 days.
- Earnings cumulative curve.
- Distance × surface performance matrix (small heatmap from `raceHistory`).
- Pace profile chart (proper line chart, not just the existing text summary) when `pacePositions` exist.

**Race results (`route race.$raceId.tsx`)** — add:
- Sectional-time line per runner (top 5).
- Position bumps chart across the call points.
- Field strength bar (avg Beyer of field vs class median).

**Finance (`routes/financial-report.tsx`)** — wrap existing report with cash curve + stacked income/expense area + ranked horse ROI list (covered by Finance drill-down above; same components reused inline).

**Breeding (`routes/breeding.tsx`, `sire-leaderboards.tsx`, `sire-watch.$stallionId.tsx`)** — add:
- Sire trend line on leaderboard rows (rank-change sparkline using `sireTrendHistory`).
- Progeny earnings scatter on sire-watch detail.
- Replace nothing; add as new sections.

## 4. Aesthetic — "modern analytics" applied

- Cards: `rounded-xl`, 1px subtle border, soft inner shadow, hover lifts border to `--chart-1`.
- Axes: thin `--chart-axis`, ticks `text-xs text-muted-foreground`, tabular-nums everywhere.
- Series: 1.5–2px strokes, gradient area fills (`<defs><linearGradient>`), animated draw-in (200ms), dotless lines, dot only on hover.
- Tooltips: shadcn `ChartTooltipContent`, dark glass background, mono labels, tabular values, swatch dot.
- Empty/sparse states: follow design bible (single dot for n=1, caption for n=2, empty pattern for n=0).
- Motion: `motion/react` fade+rise on mount; respect `prefers-reduced-motion`.

## 5. Out of scope

- No changes to game logic, race simulation, or store slices. All charts read from existing state (`raceHistory`, `sireTrendHistory`, `horseLeaderboards`, ledger transactions).
- No pie charts (per design bible).
- No mobile-specific redesign beyond what the existing responsive shells give us.

## Technical notes

- Recharts stays as the engine; everything goes through `ChartContainer` for SSR safety.
- `chartTheme.ts` exports a `chartConfig` factory so series colors/labels are declared once per chart.
- Memoize derived series in `useMemo`; charts on the dashboard use `React.memo`.
- New files only; existing chart components (`BeyerChart`, `GradedStatsChart`, `HorseStatsRadar`, `BreedingRadarChart`, `BeyerSparkline`) get a small refactor pass to consume the new tokens but keep their public APIs unchanged.
- File counts: ~7 chart primitives, ~5 route files, ~12 chart components, ~3 screen integrations. Estimated ~25 new files, ~10 light edits.

## Rollout order

1. Tokens + chart kit primitives.
2. `/analytics` shell + bento overview.
3. Drill-downs (Stable → Racing → Finance → Breeding).
4. Dashboard re-skin.
5. Horse detail + race detail additions.
6. Refactor existing charts onto new tokens.
