## 2024-09-18 - Stable Racing Insights Implementation Plan
**Learning:** `useAnalyticsData.ts` computes analytics for `AnalyticsRacingTab.tsx`. I can compute distance buckets and surface performance for the player's stable here, identifying the stable's best distance bucket and best surface. Wait, to follow the Tipster principles, it should be a pure, testable function rather than inline in a React hook.
I will create `src/core/analytics/stableTrends.ts` with a pure function `analyzeStableTrends(horses: Horse[])` that returns:
```typescript
{
  bestSurface: { surface: string, starts: number, winRate: number, roi?: number } | null,
  bestDistance: { distance: string, starts: number, winRate: number } | null,
  longestStreak: { horseName: string, streak: number } | null
}
```
Wait, ROI requires transactions. Better to stick to Win Rate since it's cleaner from `raceHistory` and tells them where they win.
Then `useAnalyticsData` can just call `analyzeStableTrends(owned)`.
Then `AnalyticsRacingTab` can display a new `ChartCard` named "Tipster's Insights".
Let's see if this is pure, testable, adds to an existing screen, and derives an insight from existing state. Yes.
