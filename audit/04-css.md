# Audit 04 — CSS / Design-Bible Compliance

**Generated:** 2026-09-03
**Method:** `grep -rn "#[0-9a-fA-F]{3,8}\|oklch(\|rgb(" src/components src/hooks src/routes --include="*.tsx" --include="*.ts"` (excluding tests/stories)

## Summary

- **Hardcoded color occurrences:** 112 across 25 files
- **Inline `style={{}}` occurrences:** 95+ across 20+ files
- **Design tokens available in `styles.css`:** `--success` (emerald), `--warning` (amber), `--destructive` (red), `--info` (blue), `--gold`, `--gold-light`, `--gold-muted`, `--cream`, `--cream-muted`, `--emerald-accent`, `--broadcast-track`, + standard semantic tokens (`--background`, `--foreground`, `--primary`, etc.)

## Classification

### LEGITIMATE (allowlist — do NOT touch)

These use hardcoded colors for inherently dynamic data (silk colors, skin tones, SVG art) where tokens don't apply:

| File | Occurrences | Reason |
| ------ | ------------- | -------- |
| `jockey/JockeyPortrait.tsx` | 21 | Skin tones (`SKIN_TONES`), hair colors (`HAIR_COLORS`), eye colors (`EYE_COLORS`), silk colors — all are data-driven palettes for avatar generation |
| `jockey/JockeyFilterPanel.tsx` | 8 | Silk color filter options — user-selectable color values |
| `jockey/FaceFeatures.tsx` | 4 | SVG eye rendering (`#fff` for eye whites) — part of portrait art |
| `horse/FullBodySvg.tsx` | 6 | Horse coat markings (`#f6f1e7`, `#f4f0ea`) — SVG art palette |
| `horse/HeadSvg.tsx` | 5 | Horse face markings — SVG art palette |
| `NewGameWizard/steps/StepSilks.tsx` | 3 | Default silk color values — user-customizable |
| `briefing/RecapTab.tsx` | 3 | Fallback silk color `#000000` — data-driven |
| `race/InRunningSnapshotDialog.tsx` | 1 | Silk color fallback `#ffffff` — data-driven |
| `race/RaceVisualizer.tsx` | 2 (silk) | `runner?.silk \|\| "#666"` — data-driven silk fallback |
| `ui/chart.tsx` | 1 | Recharts CSS selectors (`#ccc`, `#fff`) — library internal selectors, not visual colors |
| `awards/VisualTrophy.tsx` | 5 | Trophy medal gradients (gold/silver/bronze/platinum) — SVG art palette |

### DIVERGENCES (should use tokens)

#### Category A: Chart backgrounds and stroke colors (recharts)

These use hardcoded colors where status tokens should be used:

| File | Line(s) | Hardcoded | Should be | Mapping |
| ------ | --------- | ----------- | ----------- | --------- |
| `FinancialChart.tsx` | 70,71,135 | `#22c55e` (green) | `--success` | Profit line |
| `FinancialChart.tsx` | 74,75,144 | `#ef4444` (red) | `--destructive` | Loss line |
| `FinancialChart.tsx` | 95 | `#020617` (slate-950) | `--background` (dark) or token | Chart background |
| `race/BeyerChart.tsx` | 96 | `#020617` | `--background` | Chart background |
| `race/BeyerChart.tsx` | 119,121,122 | `#d4af37` (gold) | `--gold` | Beyer line |
| `race/BeyerChart.tsx` | 121,122 | `#fff` | `--foreground` | Dot fill |
| `race/GradedStatsChart.tsx` | 54 | `#020617` | `--background` | Chart background |
| `race/GradedStatsChart.tsx` | 90 | `#d4af37` | `--gold` | Wins bar |
| `horse/PrivateTrialResults.tsx` | 94 | `#020617` | `--background` | Chart background |
| `horse/PrivateTrialResults.tsx` | 111 | `#d4af37` | `--gold` | Trial line |
| `horse/PrivateTrialResults.tsx` | 118 | `#60a5fa` (blue-400) | `--info` | Comparison line |
| `horse/BeyerSparkline.tsx` | 28,30 | `#d4af37` | `--gold` | Beyer line |
| `horse/BeyerSparkline.tsx` | 30 | `#020617` | `--background` | Dot fill |
| `horse/DistanceAptitudeDrift.tsx` | 111 | `#020617` | `--background` | Chart background |
| `horse/DistanceAptitudeDrift.tsx` | 134,136,137 | `#d4af37` | `--gold` | Drift line |
| `horse/DistanceAptitudeDrift.tsx` | 136,137 | `#fff` | `--foreground` | Dot stroke |
| `horse/HorseStatsRadar.tsx` | 42,44 | `#d4af37` | `--gold` | Radar stroke/fill |
| `jockey/JockeyStatsGrid.tsx` | 72,74 | `#60a5fa` | `--info` | Stats stroke/fill |
| `hooks/race/useHorseEligibleRaces.ts` | 19 | `#D4AF37`, `#C0C0C0` | `--gold`, new `--silver` token? | Eligibility colors |

#### Category B: Gazette newspaper styling

| File | Line(s) | Hardcoded | Should be | Notes |
| ------ | --------- | ----------- | ----------- | ------- |
| `dashboard/GallopGazette.tsx` | 31 | `#f4f1ea` (parchment) | New `--parchment` token? | Newspaper paper color — may need new token |
| `dashboard/GallopGazette.tsx` | 31,32,39,65,69,75,82 | `#2c2c2c` (dark text) | `--foreground` (light mode) | Newspaper text — but this is a light-on-dark themed card |
| `dashboard/GallopGazette.tsx` | 62,100 | `#d3d3d3` (light gray) | `--border` | Divider lines |
| `dashboard/GallopGazette.tsx` | 75,82 | `#1a1a1a` | `--foreground` | Headline text |
| `dashboard/GallopGazette.tsx` | 85,89 | `#333` | `--muted-foreground` | Body text |

**Mapping decision needed:** GallopGazette is a newspaper-themed card with its own light palette. It may warrant its own tokens (`--parchment`, `--newspaper-ink`) or be an intentional design exception. Needs design review.

#### Category C: Cash pressure status colors

| File | Line(s) | Hardcoded | Should be | Notes |
| ------ | --------- | ----------- | ----------- | ------- |
| `stable/CashPressureTrend.tsx` | 20 | `#9ca3af` (gray) | `--muted-foreground`? | "comfortable" — no exact status token |
| `stable/CashPressureTrend.tsx` | 21 | `#fbbf24` (amber) | `--warning` | "tight" |
| `stable/CashPressureTrend.tsx` | 22 | `#fb923c` (orange) | No exact token — between `--warning` and `--destructive` | "strained" — needs mapping decision |
| `stable/CashPressureTrend.tsx` | 23 | `#f87171` (red) | `--destructive` | "desperate" |
| `stable/CashPressureTrend.tsx` | 77 | `#60a5fa` (blue) | `--info` | Sparkline color |

**Mapping decision needed:** "comfortable" (gray) and "strained" (orange) don't map 1:1 to status tokens. Options: (a) use `--muted-foreground` for comfortable and `--warning` for strained, (b) add new tokens.

#### Category D: Race visualizer canvas colors

| File | Line(s) | Hardcoded | Should be | Notes |
| ------ | --------- | ----------- | ----------- | ------- |
| `race/RaceVisualizer.tsx` | 41 | `#2d5a27` (turf green) | `--broadcast-track`? | Track surface — race emerald palette (known gap) |
| `race/RaceVisualizer.tsx` | 42 | `#8b4513` (dirt brown) | New `--broadcast-dirt` token? | Track surface |
| `race/RaceVisualizer.tsx` | 170,217 | `#fff` | `--foreground` | Canvas stroke/fill |
| `race/RaceVisualizer.tsx` | 213,422,434 | `#facc15` (yellow) | `--warning` or `--gold`? | Highlight color |

**Note:** Race emerald palette is an explicit design-bible gap (`05-theming.md`). Track surface colors may be part of that gap. Needs design review.

#### Category E: RunnerMoodFace — already using tokens with fallback

| File | Line(s) | Hardcoded | Verdict |
| ------ | --------- | ----------- | --------- |
| `race/RunnerMoodFace.tsx` | 31-33 | `#34d399`, `#facc15`, `#ef4444` | **Already using `var(--color-success, #34d399)` etc.** — hardcoded values are fallbacks for the CSS var. ✅ Acceptable. |

#### Category F: Other

| File | Line(s) | Hardcoded | Should be |
| ------ | --------- | ----------- | ----------- |
| `history/RecordsDashboard.tsx` | 20 | `#0a0a0a` | `--background` (dark) |

## Inline styles (style={{}})

95 inline styles across 20+ files. Most are in:

- `awards/AwardCeremony.tsx` (9) — animation/positioning, likely dynamic
- `race/Track.tsx` (7) — canvas/track positioning, likely dynamic
- `race/HorseSprite.tsx` (3) — sprite positioning, dynamic

**Action:** Review each during Phase G. Convert to Tailwind classes where the value is static; keep inline only for genuinely dynamic values (computed positions, animation transforms).

## Mapping decisions needed (Phase G)

1. **GallopGazette newspaper palette** — add `--parchment` / `--newspaper-ink` tokens, or document as intentional exception?
2. **CashPressureTrend "comfortable" (gray) and "strained" (orange)** — map to existing tokens or add new ones?
3. **Race track surface colors** — part of the race emerald palette gap (out of scope)?
4. **`#d4af37` (gold) in charts** — maps to `--gold` token, but `--gold` is `oklch(0.65 0.15 85)` which may render differently than the hex. Verify visually.
5. **`#020617` (slate-950) in chart backgrounds** — maps to dark `--background` (`oklch(0.129 0.042 264.695)`), verify visually.
