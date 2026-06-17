# Race Day as Broadcast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the race-day screen from a static data-tab panel into a three-act broadcast — a pre-race build-up (silks, morning-line odds, stakes hook), a full-bleed live run with commentary front-and-center, and post-race analysis demoted behind a reveal.

**Architecture:** A `phase` state machine (`"preshow" | "live" | "review"`) inside the existing `/race/$raceId` route. The live simulation no longer auto-starts; it is gated on `phase === "live"` via a new `running` flag on `useLiveRaceSimulation`. A new `RacePreShow` component owns the build-up; the existing `Track`/`BroadcastCommentary`/`Leaderboard` own the live act; the existing Splits/Sectionals/Speed-Breakdown content moves into a collapsible "Post-race analysis" section shown only in `review`.

**Tech Stack:** React 19, TanStack Router, the existing race components (`Track`, `RaceVisualizer`, `BroadcastCommentary`, `Leaderboard`, `ResultOverlay`, `SectionalTimingTable`, `PaceGraph`, `SpeedBreakdownChart`/`Table`, `JockeyReportPanel`), `useLiveRaceSimulation`, `useRacePageData`, `useRaceUIState`. Odds via `@/core/odds`.

---

## Context

Race day is the stated climax of Gallop ("Football Manager married to Photo Finish"), but [race.$raceId.tsx](src/routes/race.$raceId.tsx) currently presents it as a `Tabs` panel (`defaultValue="visualizer"`, tabs Replay/Splits/Sectionals) with a 280px data leaderboard bolted alongside, and [useLiveRaceSimulation](src/hooks/race/useLiveRaceSimulation.ts) starts the RAF loop immediately on mount. The result serves the Numbers-Trainer persona and abandons the Tourist: there is no build-up, no stakes framing, no emotional beat — the most important moment in the product reads like a spreadsheet that animates.

Everything needed for a broadcast already exists and is reused here:

- Morning-line odds + silks per runner come from [useRacePageData](src/hooks/race/useRacePageData.ts) (`runnerOdds`, `runners[].silk`).
- The animated `Track`, live `BroadcastCommentary`, and `Leaderboard` already render the run.
- `ResultOverlay`, `SectionalTimingTable`, `PaceGraph`, `SpeedBreakdownChart/Table`, `JockeyReportPanel` already render the analysis — they just need to move out of the primary tab strip.

The only engine change is making the sim **start on demand** instead of on mount, so a pre-race act can exist.

**Outcome:** Entering a race opens on a build-up the player chooses to start; the run plays full-bleed with commentary as the hero; analysis is one click away after the finish instead of competing with the race for attention.

---

## File Structure

**New files**

- `src/core/race/preShowField.ts` — pure `buildPreShowField(runners, runnerOdds)` → field ordered as a betting card.
- `src/components/race/RacePreShow.tsx` — the pre-race build-up screen.
- `src/components/race/PostRaceAnalysis.tsx` — the demoted Splits/Sectionals/Speed-Breakdown, extracted from the route.
- Tests: `src/tests/core/race/preShowField.test.ts`.

**Modified files**

- `src/hooks/race/useLiveRaceSimulation.ts` — add a `running` flag gating the RAF effect.
- `src/routes/race.$raceId.tsx` — introduce the `phase` machine; render PreShow → Live → Review.

**Reused as-is:** `Track`, `RaceVisualizer`, `BroadcastCommentary`, `Leaderboard`, `ResultOverlay`, `RaceControlBar`, `WeatherForecastStrip`, `SectionalTimingTable`, `PaceGraph`, `SpeedBreakdownChart`, `SpeedBreakdownTable`, `JockeyReportPanel`; odds helpers from `@/core/odds`.

---

## Conventions (read before starting)

- The route file is `src/routes/race.$raceId.tsx`; in shell commands escape the `$`: `src/routes/race.\$raceId.tsx`.
- `runners` elements expose `{ horseId, name, silk, owned, finishTime, position, … }` (`Runner` from `@/core/race/engine/runnerBuilder`).
- `runnerOdds` is a map/record keyed by `horseId` to a formatted morning-line string; it is produced in `useRacePageData`. Confirm its exact shape in Step 0 of Task 2.
- Run one test: `bunx vitest run <path>`. Verify UI via the preview workflow (preview_start → navigate → snapshot/console).

---

## Task 1: Gate the live simulation on a `running` flag

Today the RAF loop starts in a `useEffect` keyed on `race` ([useLiveRaceSimulation.ts:62](src/hooks/race/useLiveRaceSimulation.ts)). Add an opt-in `running` flag (default `true`, so all existing callers are unaffected) and gate the effect on it.

**Files:**

- Modify: `src/hooks/race/useLiveRaceSimulation.ts`

- [ ] **Step 1: Add `running` to the params**

In the destructured params object (the `{ race, runners, … }` block starting near line 20) add `running = true`, and add it to the TypeScript param type:

```ts
export function useLiveRaceSimulation({
  race,
  runners,
  resolveRaceWithImpacts,
  narrativeRef,
  messageQueue,
  rngRef,
  course,
  windKph,
  windDirectionDeg,
  running = true,
}: {
  race: any;
  runners: Runner[];
  resolveRaceWithImpacts: (raceId: string, finishOrder: any[]) => void;
  narrativeRef: React.MutableRefObject<NarrativeGenerator | null>;
  messageQueue: React.MutableRefObject<CommentaryLine[]>;
  rngRef: React.MutableRefObject<any>;
  course?: CourseSpecification;
  windKph?: number;
  windDirectionDeg?: number;
  running?: boolean;
}) {
```

- [ ] **Step 2: Gate the RAF effect on `running`**

In the simulation `useEffect` (the one beginning `if (!race || race.resolved) return;` near line 62), change the guard and add `running` to the dependency array so the loop starts when `running` flips to `true`:

```ts
useEffect(() => {
  if (!race || race.resolved || !running) return;
  // ...existing RAF loop body unchanged...
}, [race, runners, running]); // add `running`; keep the effect's existing deps
```

(Keep the rest of the effect body and the existing dependency entries exactly as they are — only add `!running` to the guard and `running` to the deps.)

- [ ] **Step 3: Verify no regression for existing callers**

Run: `bunx tsc --noEmit`
Expected: clean. Existing callers pass no `running`, so it defaults to `true` and behavior is unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/race/useLiveRaceSimulation.ts
git commit -m "feat(race): gate live sim on a running flag (default true)"
```

---

## Task 2: `buildPreShowField` — order the field as a betting card

**Files:**

- Create: `src/core/race/preShowField.ts`
- Test: `src/tests/core/race/preShowField.test.ts`

- [ ] **Step 0: Confirm the `runnerOdds` shape**

Run: `grep -nE "runnerOdds|probabilityToMorningLine|formatOdds|calculateWinProbability" src/hooks/race/useRacePageData.ts`
Note whether `runnerOdds` is keyed by `horseId` and whether the value is a formatted string (e.g. `"5/2"`) or `{ odds, probability }`. The test and helper below assume `Record<horseId, { oddsLabel: string; probability: number }>`. If the real shape differs, adjust the `RunnerOdds` type below to match — do not change `useRacePageData`.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/core/race/preShowField.test.ts
import { describe, it, expect } from "vitest";
import { buildPreShowField, type PreShowRunner } from "@/core/race/preShowField";

const runners = [
  { horseId: "a", name: "Long Shot", silk: { primary: "#111" }, owned: false },
  { horseId: "b", name: "Favourite", silk: { primary: "#222" }, owned: true },
  { horseId: "c", name: "Mid", silk: { primary: "#333" }, owned: false },
] as unknown as PreShowRunner[];

const odds = {
  a: { oddsLabel: "20/1", probability: 0.05 },
  b: { oddsLabel: "2/1", probability: 0.45 },
  c: { oddsLabel: "6/1", probability: 0.18 },
};

describe("buildPreShowField", () => {
  it("orders runners by descending win probability (favourite first)", () => {
    const field = buildPreShowField(runners, odds);
    expect(field.map((r) => r.horseId)).toEqual(["b", "c", "a"]);
  });

  it("attaches each runner's odds label and marks the morning-line favourite", () => {
    const field = buildPreShowField(runners, odds);
    expect(field[0].oddsLabel).toBe("2/1");
    expect(field[0].isFavourite).toBe(true);
    expect(field[1].isFavourite).toBe(false);
  });

  it("is stable when odds are missing (keeps input order, blank label)", () => {
    const field = buildPreShowField(runners, {});
    expect(field.map((r) => r.horseId)).toEqual(["a", "b", "c"]);
    expect(field[0].oddsLabel).toBe("—");
    expect(field.some((r) => r.isFavourite)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

Run: `bunx vitest run src/tests/core/race/preShowField.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
// src/core/race/preShowField.ts
export interface PreShowRunner {
  horseId: string;
  name: string;
  silk: unknown;
  owned: boolean;
}

export interface RunnerOdd {
  oddsLabel: string;
  probability: number;
}

export interface PreShowFieldRow extends PreShowRunner {
  oddsLabel: string;
  probability: number;
  isFavourite: boolean;
}

/**
 * Order runners as a betting card: highest win probability first, each row
 * annotated with its morning-line odds label, and the single favourite flagged.
 *
 * @param runners - the race field
 * @param odds - per-horse odds keyed by horseId (may be empty/partial)
 * @returns rows sorted favourite-first; falls back to input order when odds are absent
 */
export function buildPreShowField(
  runners: PreShowRunner[],
  odds: Record<string, RunnerOdd>,
): PreShowFieldRow[] {
  const rows = runners.map((r) => {
    const o = odds[r.horseId];
    return {
      ...r,
      oddsLabel: o?.oddsLabel ?? "—",
      probability: o?.probability ?? 0,
      isFavourite: false,
    };
  });

  const hasOdds = rows.some((r) => r.probability > 0);
  if (hasOdds) {
    rows.sort((a, b) => b.probability - a.probability);
    rows[0].isFavourite = true;
  }
  return rows;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `bunx vitest run src/tests/core/race/preShowField.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/race/preShowField.ts src/tests/core/race/preShowField.test.ts
git commit -m "feat(race): buildPreShowField — betting-card ordering for pre-race"
```

---

## Task 3: `RacePreShow` build-up component

**Files:**

- Create: `src/components/race/RacePreShow.tsx`

- [ ] **Step 1: Build the component**

```tsx
// src/components/race/RacePreShow.tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SilkDot } from "@/components/SilkDot";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import { buildPreShowField, type RunnerOdd } from "@/core/race/preShowField";
import { Flag, Play } from "lucide-react";

interface RacePreShowProps {
  race: {
    name: string;
    distance: number;
    surface?: string;
    trackId?: string;
    trackCondition?: import("@/game/types").TrackCondition;
    graded?: { grade?: string; track?: string };
  };
  runners: { horseId: string; name: string; silk: unknown; owned: boolean }[];
  runnerOdds: Record<string, RunnerOdd>;
  onStart: () => void;
}

export function RacePreShow({ race, runners, runnerOdds, onStart }: RacePreShowProps) {
  const field = buildPreShowField(runners, runnerOdds);
  const gradeLabel = race.graded?.grade ? `${race.graded.grade} Stakes` : "Race";

  return (
    <div className="broadcast min-h-screen text-white bg-broadcast-track relative">
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-12 space-y-8">
        {/* Stakes hook */}
        <div className="text-center space-y-3">
          <Badge className="bg-broadcast-accent text-black font-black uppercase tracking-[0.2em]">
            <Flag className="h-3 w-3 mr-1" />
            {gradeLabel}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter font-[family-name:var(--font-display)]">
            {race.name}
          </h1>
          <p className="text-sm font-mono uppercase tracking-widest text-white/50">
            {race.distance}m{race.surface ? ` · ${race.surface}` : ""}
            {race.graded?.track ? ` · ${race.graded.track}` : ""}
          </p>
          <div className="flex justify-center">
            <WeatherForecastStrip trackId={race.trackId} trackCondition={race.trackCondition} />
          </div>
        </div>

        {/* The field, as a betting card */}
        <div className="border border-white/10 bg-black/30 rounded-lg divide-y divide-white/5">
          <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/30">
            <span>Silk</span>
            <span>Runner</span>
            <span className="text-right">M/L</span>
          </div>
          {field.map((r) => (
            <div
              key={r.horseId}
              className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-3 items-center"
            >
              <SilkDot silk={r.silk as never} />
              <span className="flex items-center gap-2">
                <span className={r.owned ? "text-gold font-bold" : "text-white/80"}>{r.name}</span>
                {r.isFavourite && (
                  <Badge variant="outline" className="h-4 px-1 text-[9px] border-gold/40 text-gold">
                    FAV
                  </Badge>
                )}
                {r.owned && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1 text-[9px] border-white/20 text-white/50"
                  >
                    YOURS
                  </Badge>
                )}
              </span>
              <span className="text-right font-mono tabular-nums text-white/70">{r.oddsLabel}</span>
            </div>
          ))}
        </div>

        {/* Start CTA */}
        <div className="flex justify-center pt-2">
          <Button
            onClick={onStart}
            className="h-14 px-10 bg-gold hover:bg-gold/90 text-slate-950 font-black uppercase tracking-[0.18em] text-sm gap-2"
          >
            <Play className="h-4 w-4 fill-current" />
            Start Race
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Confirm `SilkDot` prop name**

Run: `grep -nE "interface|Props|silk|export function SilkDot" src/components/SilkDot.tsx | head`
If `SilkDot` takes a differently-named prop (e.g. `color` instead of `silk`), adjust the `<SilkDot …/>` usage accordingly. Do not change `SilkDot`.

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: clean (resolve any prop-shape mismatches surfaced here against the real `race`/`runners` types from the route).

- [ ] **Step 4: Commit**

```bash
git add src/components/race/RacePreShow.tsx
git commit -m "feat(race): pre-race build-up screen (silks, odds, stakes hook)"
```

---

## Task 4: Extract `PostRaceAnalysis` from the route

Move the Splits/Sectionals/Speed-Breakdown JSX currently inside the route's tab panels into one component, so the route can show it as a post-race reveal instead of primary tabs.

**Files:**

- Create: `src/components/race/PostRaceAnalysis.tsx`
- Modify: `src/routes/race.$raceId.tsx` (remove the moved JSX in Task 5)

- [ ] **Step 1: Create the component**

Create `PostRaceAnalysis.tsx` exporting `function PostRaceAnalysis({ race, runners })`. Move into it the contents currently rendered under the `"sectionals"` and `"splits"` tab panels of [race.$raceId.tsx](src/routes/race.$raceId.tsx) (the `PaceGraph`, `SectionalTimingTable`, `SpeedBreakdownChart`, `SpeedBreakdownTable`, `JockeyReportPanel`, and `LiveSplitsTable` blocks). Keep the same props those children receive today (copy the `runners.map(...)` prop-shaping verbatim). The component renders them stacked in sections (no Tabs), guarded by the same `race.resolved && race.sectionalSplits?.length` conditions already in the route.

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/race/PostRaceAnalysis.tsx
git commit -m "refactor(race): extract PostRaceAnalysis from the race route"
```

---

## Task 5: Wire the phase machine into the route

**Files:**

- Modify: `src/routes/race.$raceId.tsx`

- [ ] **Step 1: Add phase state and gate the sim**

Near the top of the `LiveRace` component body, add:

```tsx
import { useState } from "react";
import { RacePreShow } from "@/components/race/RacePreShow";
import { PostRaceAnalysis } from "@/components/race/PostRaceAnalysis";
// ...
const [phase, setPhase] = useState<"preshow" | "live" | "review">(
  // a race the player is revisiting (already resolved) skips straight to review
  race?.resolved ? "review" : "preshow",
);
```

Pass `running` into the sim hook call:

```tsx
const { tick, speed, setSpeed, finished, paused, setPaused, simTime, liveSplits } =
  useLiveRaceSimulation({
    race,
    runners,
    resolveRaceWithImpacts,
    narrativeRef,
    messageQueue,
    rngRef,
    course,
    windKph: raceWeather?.windKph,
    windDirectionDeg: raceWeather?.windDirectionDeg,
    running: phase === "live",
  });
```

Advance to `review` when the run finishes — add an effect:

```tsx
useEffect(() => {
  if (finished) setPhase("review");
}, [finished]);
```

- [ ] **Step 2: Render by phase**

Replace the route's single render path with a phase switch. **Preshow** returns `RacePreShow` and nothing else:

```tsx
if (phase === "preshow") {
  return (
    <RacePreShow
      race={race}
      runners={runners}
      runnerOdds={runnerOdds}
      onStart={() => setPhase("live")}
    />
  );
}
```

**Live** keeps the existing full-bleed broadcast layout but **without the Tabs strip** — render only the `Track`/`RaceVisualizer` + `BroadcastCommentary` as the hero, the `RaceControlBar`, and the `Leaderboard` sidebar. Remove the `<Tabs>`/`<TabsList>`/`<TabsTrigger>` scaffolding and the `splits`/`sectionals` `<TabsContent>` blocks from this path (their content now lives in `PostRaceAnalysis`).

**Review** renders the same broadcast frame plus `ResultOverlay` (as today) and, below it, the reveal:

```tsx
{
  phase === "review" && (
    <details
      className="relative z-10 mx-4 mb-10 border border-white/10 bg-black/20 rounded-lg"
      open={false}
    >
      <summary className="cursor-pointer px-6 py-4 text-sm font-black uppercase tracking-widest text-broadcast-accent">
        Post-race analysis
      </summary>
      <div className="p-6">
        <PostRaceAnalysis race={race} runners={runners} />
      </div>
    </details>
  );
}
```

(Keep `ResultOverlay`, `RaceFieldDialog`, the `aria-live` announcer, and keyboard controls exactly as they are. The `useRaceUIState` hook and `Leaderboard` props are unchanged.)

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: clean. Remove now-unused imports (`Tabs*`, the analysis components that moved into `PostRaceAnalysis`) flagged by `tsc`/lint.

- [ ] **Step 4: Verify the full flow in the app**

Start the preview and run a race end-to-end:

```bash
# preview_start "dev"; create/continue a game; navigate to a race the player is in
```

Using preview tooling, confirm:

1. Entering `/race/$raceId` shows the **build-up**: stakes badge, race name, the field with silks + M/L odds, favourite flagged, a **Start Race** button — and the horses are **not** moving (sim not started).
2. Clicking **Start Race** begins the animated run; commentary shows; no Splits/Sectionals tabs compete for attention.
3. On finish, the result overlay appears and a collapsed **Post-race analysis** reveal is present; expanding it shows pace/sectionals/speed breakdowns.
4. `preview_console_logs` — no errors (especially no `Maximum update depth`).

- [ ] **Step 5: Commit**

```bash
git add src/routes/race.\$raceId.tsx
git commit -m "feat(race): three-act broadcast (preshow → live → review)"
```

---

## Verification (whole-plan)

- [ ] `bunx vitest run src/tests/core/race/preShowField.test.ts` — passes.
- [ ] `bun run test` — full suite green (no regressions).
- [ ] `bunx tsc --noEmit` — clean.
- [ ] Manual broadcast flow (Task 5 Step 4) verified in preview, including a **revisited resolved race** opening directly in `review` (no empty preshow).

## Self-review notes

- **Spec coverage:** Improvement #3 = "(a) full-bleed animated race default with a pre-race beat (silks/odds/stakes), (b) demote Splits/Sectionals/Speed-Breakdown behind a Post-race-analysis reveal." Tasks 2–3 = the pre-race beat; Task 1 enables on-demand start; Tasks 4–5 = demotion + live-as-hero.
- **No placeholders:** all new component/helper code is concrete; route edits reference exact existing blocks to move.
- **Type consistency:** `running` flag (Task 1) consumed in Task 5; `buildPreShowField`/`RunnerOdd` (Task 2) consumed by `RacePreShow` (Task 3).
- **Verification points to confirm against real code (each has an inline step):** `runnerOdds` shape (Task 2 Step 0), `SilkDot` prop name (Task 3 Step 2), the exact analysis JSX blocks to move (Task 4 Step 1).
