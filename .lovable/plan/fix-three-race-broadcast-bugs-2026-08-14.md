# Fix three race-broadcast bugs

## 1. Live Order panel doesn't update during the race

The side leaderboard derives its rows with memoized calculations keyed on the runners array. The simulation mutates runner objects in place, so the array reference never changes and the memos never recompute — the panel shows the order from the first frame (and "N/A" odds/positions stay frozen).

Fix: feed the simulation tick counter into the leaderboard derivation so rows, position ranks, and the sorted/filtered list recompute on every rendered frame.

## 2. Every horse is tagged "Flying"

The badge fires on a fixed absolute speed threshold (18.5 m/s), which nearly every thoroughbred exceeds for most of a race, so all runners are flagged permanently.

Fix: make it relative and rare — show "Flying" only for a runner meaningfully faster than the current field (e.g. clearly above the field's average speed and among the fastest at that moment), so it reads as a genuine surge instead of a constant label.

## 3. Commentary prints `{horse}` instead of the horse's name

Two causes:

- The narrative service only receives player/NPC horses from the store, not the auto-generated filler runners in the field. When a line is about a filler runner, the horse record is missing and the whole horse-placeholder block — including `{horse}` — is skipped.
- Placeholder substitution replaces only the first occurrence, so templates mentioning a horse twice keep the second `{horse}`.

Fix: always substitute the runner's name (it is available even without a horse record) with sensible fallbacks for the pedigree/coat/stable placeholders, replace all occurrences rather than the first, and pass the filler horses into the narrative generator so bio/insight lines work for the full field.

## Technical notes

- `src/hooks/race/useLeaderboardState.ts` — accept `tick` and add it to the `rows` / `positionRank` / `sorted` memo dependencies; pass `tick` from `src/routes/race.$raceId.tsx`.
- `src/components/race/Track.tsx` — replace the `r.velocity > 18.5` condition with a field-relative check (leader/mean-based) computed once per render.
- `src/services/narrative/commentaryGenerator.ts` — hoist `{horse}` (and `{rank}`) replacement out of the `context.horse` guard, use global replacement for all placeholders.
- `src/hooks/race/useRacePageData.ts` — include `fillerHorses` from `buildRaceField` in the horse list handed to `NarrativeGenerator`.
- Add/extend unit tests: commentary substitution with a runner but no horse record, and leaderboard re-derivation across ticks.
