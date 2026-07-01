# Animated Race Visualization (2D Side-View) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The race simulation engine already drives `Runner[]` objects (with `.position`, `.velocity`, `.lane`, `.finishTime`, `.coatColor`, `.silk`) through a RAF loop in `useLiveRaceSimulation`. The `Track` component already reads those values and renders horse sprites via `HorseSprite`. However, the `Track` component is only shown during the live phase when `race.snapshots` does not exist (`hasReplay = false`), and there are several gaps: no progress bar during the live sim, no velocity-driven sprite animation speed hookup beyond what `HorseSprite` does statically, no finish-crossing visual burst, and the component is not visually prominent enough for the player to orient themselves. This plan closes those gaps so the player gets a polished, real-time 2D side-view race view from start to finish, including a finish-flash, a live progress indicator, and smooth sprite animation tied to velocity.

**Architecture:** The `Track` component is the live-race visualization (DOM-based, CSS-animated, receives mutated `Runner[]` on every tick). The `RaceVisualizer` is the post-race canvas replay (driven by `RaceSnapshot[]`). Both already exist and are already wired in `RaceBroadcast` through the `hasReplay` gate. The work is primarily inside `Track` (polish: velocity-speed animation, finish burst, progress bar, per-runner trailing velocity spark), with a small addition to `useLiveRaceSimulation` (expose `simTime` properly) and a CSS expansion to `src/styles.css`. No new dependencies are required.

**Tech Stack:** React 19, CSS custom properties, CSS animations, existing `HorseSprite` + `raceVisualHelpers` utilities, `useLiveRaceSimulation` hook, `Runner` type from `runnerBuilder.ts`, Tailwind v4 utility classes via `src/styles.css`, `src/components/race/Track.tsx`.

---

## Context

`RaceBroadcast` gates between two visualizers:
- `hasReplay = race.resolved && race.snapshots && race.snapshots.length > 0` — shows the canvas-based `RaceVisualizer` (snapshot replay).
- Otherwise — shows the DOM-based `Track` (live sim, `Runner[]` direct mutation).

During a live race, the player only sees `Track`. That component already has camera logic, lane lines, distance markers, finish line, and `HorseSprite`. The gaps are:

1. No live progress bar at the top or bottom of the track showing distance covered.
2. The velocity-based animation speed hookup exists in `HorseSprite` via `getAnimationDuration(runner.velocity)` but the `animationDuration` style is only applied when `isAnimated && spriteUrl`. If the horse has no sprite asset, it falls back to a silk-colored circle with a static pulse — not velocity-aware.
3. When a horse crosses the finish line (`r.finishTime !== null`), there is no visual burst or "finished" banner.
4. There is no real-time velocity readout per runner on the track itself (optional enhancement for legibility).
5. The `simTime` returned from `useLiveRaceSimulation` is a snapshot-at-render-time value because it reads `simTimeRef.current` at return-statement time, not reactively. This means the `Track` gets `tick` (incrementing int) but not a live `simTime` to display.

The plan addresses these gaps in three focused tasks.

## File Structure

**New files** — none required

**Modified files:**
- `src/components/race/Track.tsx` — primary target: add live progress bar, finish burst indicators, velocity readout badges, refine sprite animation speed binding
- `src/styles.css` — add `@keyframes finish-burst`, `@keyframes runner-finish-label`, and `.horse-finished` CSS classes
- `src/hooks/race/useLiveRaceSimulation.ts` — expose `simTimeRef` as a stable ref (already done via `simTime: simTimeRef.current`; confirm it is adequate or switch to exposing the ref directly)
- `src/components/race/RaceBroadcast.tsx` — pass `simTime` down to `Track` (currently `simTime` is available in `race.$raceId.tsx` but not forwarded to `Track`)

---

## Conventions (read before starting)

- `Runner.position` is in meters from the start line. `Runner.lane` is in track-unit space (barrier 1 = lane 0, barrier 2 = lane 3.5 because of `LANE_WIDTH = 3.5`). In `Track`, lane `i` visual row is the array index `i` (0-indexed render order), not `r.lane`.
- `laneHeight = 36` pixels per row in `Track`. Track height = `runners.length * 36 + 20`.
- `viewportWidth = distance * 0.6` — the viewport shows 60% of the total distance at once.
- Camera: follows `followTarget` horse if set, otherwise the current leader. `cameraPos` is the world-space left edge of the viewport.
- `screenPct = (r.position - cameraPos) / viewportWidth * 100` gives the horse's CSS `left` percent.
- `finishActive = leaderPos > distance - 100 && leaderPos < distance` — true when within 100m of finish.
- Sprite animation: `.horse-sprite-animated` uses `@keyframes sprite-run` (CSS steps(6) over 300px sprite sheet). `getAnimationDuration(velocity)` returns a CSS time string `"${d}s"` scaled by velocity. The `animationDuration` style prop on `HorseSprite` feeds directly into the CSS `animation-duration`.
- When `r.finishTime !== null`, `isRunning` is `false` (because `tick > 0 && !paused && r.finishTime === null`). The sprite stops animating correctly.
- `HorseSprite` respects `prefers-reduced-motion` — preserve this in all additions.
- Do not add React state (`useState`) inside the `Track` RAF per-frame path. All animation is CSS-driven. React state is for one-time transitions (e.g., "horse just finished").
- All new CSS goes in `src/styles.css` (no new `.css` files unless the team specifically requests component-scoped files).
- TypeScript: `Track` props must stay backward-compatible; all new props must be optional with sensible defaults.
- Commit messages must use conventional-commit format: `feat(race): ...`.

---

## Task 1: Expose simTime to Track and add a live progress bar

**Files:**
- Modify: `src/hooks/race/useLiveRaceSimulation.ts`
- Modify: `src/components/race/RaceBroadcast.tsx`
- Modify: `src/routes/race.$raceId.tsx`
- Modify: `src/components/race/Track.tsx`

The live progress bar mirrors what `RaceVisualizer` has (`race-progress-bar`) but for the real-time DOM track. It should show leader progress as a horizontal fill from 0 to 100% of `distance`.

- [ ] **Step 1: Expose `simTimeRef` from `useLiveRaceSimulation`**

  Currently `useLiveRaceSimulation` returns `simTime: simTimeRef.current` — a snapshot value at the time of the last React re-render. Because the RAF loop mutates `simTimeRef.current` between renders, the returned value is always one render stale. This is fine for most purposes. However, if we want `Track` to display `simTime`, we should expose the ref directly so `Track` can read the current value without needing another render.

  In `/src/hooks/race/useLiveRaceSimulation.ts`, add `simTimeRef` to the return object:

  ```ts
  return {
    tick,
    speed,
    setSpeed,
    finished,
    paused,
    setPaused,
    simTime: simTimeRef.current,
    simTimeRef,          // <-- add this
    liveSplits: splitCrossingsRef.current,
  };
  ```

- [ ] **Step 2: Forward `simTimeRef` through `race.$raceId.tsx` to `RaceBroadcast`**

  In `/src/routes/race.$raceId.tsx`, destructure `simTimeRef` from the `useLiveRaceSimulation` call:

  ```ts
  const { tick, speed, setSpeed, finished, paused, setPaused, simTime, simTimeRef, liveSplits } =
    useLiveRaceSimulation({ ... });
  ```

  Then pass `simTimeRef` to `RaceBroadcast`:

  ```tsx
  <RaceBroadcast
    ...
    simTimeRef={simTimeRef}
  />
  ```

- [ ] **Step 3: Add `simTimeRef` to `RaceBroadcastProps` and forward to `Track`**

  In `/src/components/race/RaceBroadcast.tsx`:
  - Add `simTimeRef?: React.MutableRefObject<number>` to `RaceBroadcastProps`
  - Destructure it in the component
  - Pass `simTimeRef` to `<Track ... simTimeRef={simTimeRef} />`

- [ ] **Step 4: Add progress bar and sim-time display to `Track`**

  In `/src/components/race/Track.tsx`:
  - Add `simTimeRef?: React.MutableRefObject<number>` to `TrackProps`
  - Add a `simTimeDisplayRef = useRef<HTMLSpanElement>(null)` inside the component
  - Add a `progressBarRef = useRef<HTMLDivElement>(null)` inside the component
  - Add a `useEffect` that runs a RAF loop to update the progress bar and simTime display via DOM refs (no `setState`), stopping when component unmounts:

  ```ts
  useEffect(() => {
    let frameId = 0;
    const update = () => {
      const leaderProgress = Math.min(
        1,
        runners.reduce((max, r) => Math.max(max, r.position), 0) / distance,
      );
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${leaderProgress * 100}%`;
      }
      if (simTimeDisplayRef.current && simTimeRef) {
        simTimeDisplayRef.current.textContent = simTimeRef.current.toFixed(1) + 's';
      }
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [runners, distance, simTimeRef]);
  ```

  - Add the progress bar DOM element inside the Track outer `div`:

  ```tsx
  {/* Live progress bar — bottom of track */}
  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
    <div
      ref={progressBarRef}
      className="h-full bg-broadcast-accent transition-none"
      style={{ width: '0%' }}
    />
  </div>

  {/* Sim time + leader distance overlay */}
  <div className="absolute top-1 right-2 flex gap-3 tabular-nums text-[10px] text-muted-foreground pointer-events-none">
    <span>
      <span ref={simTimeDisplayRef}>0.0s</span>
    </span>
    <span>{Math.round(leaderPos)}m / {distance}m</span>
  </div>
  ```

- [ ] **Commit:**
  ```bash
  git add src/hooks/race/useLiveRaceSimulation.ts src/components/race/RaceBroadcast.tsx src/routes/race.$raceId.tsx src/components/race/Track.tsx
  git commit -m "feat(race): expose simTimeRef from useLiveRaceSimulation and add live progress bar to Track"
  ```

---

## Task 2: Velocity-aware sprite animation and finish-line crossing burst

**Files:**
- Modify: `src/components/race/Track.tsx`
- Modify: `src/styles.css`

When a horse crosses the finish line, the current code simply stops the sprite animation (because `isRunning` becomes `false`). The player gets no visual signal. This task adds: (a) a per-runner "FINISHED" label with a brief pop-in animation, (b) a finish-line burst CSS effect when `finishActive` is true, and (c) ensures the velocity-based `animationDuration` binding actually propagates velocity changes at 60fps without triggering React re-renders.

- [ ] **Step 1: Add `@keyframes finish-burst` and `.horse-finish-pop` to `src/styles.css`**

  ```css
  /* Finish crossing celebration */
  @keyframes finish-burst {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.35); }
    60%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }

  @keyframes finish-label-pop {
    0%   { opacity: 0; transform: translateY(4px) scale(0.8); }
    60%  { opacity: 1; transform: translateY(-2px) scale(1.05); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  .horse-finish-pop {
    animation: finish-burst 0.45s ease-out forwards;
  }

  .horse-finish-label {
    animation: finish-label-pop 0.35s ease-out forwards;
  }

  /* Reduced motion overrides */
  @media (prefers-reduced-motion: reduce) {
    .horse-finish-pop,
    .horse-finish-label {
      animation: none !important;
    }
  }
  ```

- [ ] **Step 2: Track which horses have *just* finished to trigger the burst once**

  The challenge is that `r.finishTime` transitions from `null` to a number once per runner. We need to detect this transition to fire the one-shot CSS animation. Use a `useRef<Set<string>>` to track IDs that already fired:

  In `Track.tsx`, inside the component body:

  ```ts
  const finishedSetRef = useRef<Set<string>>(new Set());
  const horseElemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  ```

  For each runner that now has `r.finishTime !== null` and is not yet in `finishedSetRef.current`, add the `horse-finish-pop` class imperatively on the DOM element and add to `finishedSetRef.current`. This avoids React state-triggered re-renders.

  In the `useEffect` that runs the progress bar RAF (from Task 1), also check for new finishers:

  ```ts
  // Inside the RAF update function:
  for (const r of runners) {
    if (r.finishTime !== null && !finishedSetRef.current.has(r.horseId)) {
      finishedSetRef.current.add(r.horseId);
      const el = horseElemRefs.current.get(r.horseId);
      if (el) {
        el.classList.add('horse-finish-pop');
        // Remove the class after animation so it can re-trigger if needed
        setTimeout(() => el.classList.remove('horse-finish-pop'), 500);
      }
    }
  }
  ```

- [ ] **Step 3: Wire `horseElemRefs` to each runner's DOM element in `Track.tsx`**

  In the runner render loop, add a `ref` callback on the outer `div`:

  ```tsx
  <div
    key={r.horseId}
    ref={(el) => {
      if (el) horseElemRefs.current.set(r.horseId, el);
      else horseElemRefs.current.delete(r.horseId);
    }}
    className="absolute transition-none"
    style={{
      left: `${screenPct}%`,
      top: 10 + i * laneHeight,
      zIndex: Math.round(r.position),
    }}
  >
  ```

- [ ] **Step 4: Add finish position label overlay per runner**

  When `r.finishTime !== null`, display a small finishing position badge below the horse sprite. Track finish rank via a ref:

  ```ts
  const finishedCountRef = useRef(0);
  const finishRankMapRef = useRef<Map<string, number>>(new Map());

  // In the RAF loop:
  const currentFinished = runners.filter(r => r.finishTime !== null);
  if (currentFinished.length !== finishedCountRef.current) {
    finishedCountRef.current = currentFinished.length;
    finishRankMapRef.current = new Map(
      [...currentFinished]
        .sort((a, b) => a.finishTime! - b.finishTime!)
        .map((r, i) => [r.horseId, i + 1])
    );
  }
  ```

  Then in the runner JSX, below the name label:

  ```tsx
  {r.finishTime !== null && finishRankMapRef.current.has(r.horseId) && (
    <div className="horse-finish-label absolute -bottom-10 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-broadcast-accent text-black text-[10px] font-black tabular-nums">
      #{finishRankMapRef.current.get(r.horseId)} · {r.finishTime.toFixed(1)}s
    </div>
  )}
  ```

- [ ] **Step 5: Enhance finish line glow when `finishActive`**

  Add to `src/styles.css`:

  ```css
  .finish-line-active {
    box-shadow: 0 0 16px 4px rgba(255, 255, 255, 0.7);
  }
  ```

- [ ] **Commit:**
  ```bash
  git add src/components/race/Track.tsx src/styles.css
  git commit -m "feat(race): add finish-crossing burst animation and finish position badges to Track"
  ```

---

## Task 3: Velocity readout badges and sprite animation speed sync

**Files:**
- Modify: `src/components/race/Track.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add per-runner velocity badge refs in `Track.tsx`**

  Create a ref map for velocity badge DOM elements:

  ```ts
  const velocityBadgeRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  ```

  In the RAF `update` loop (from Task 1), update all velocity badges directly:

  ```ts
  for (const r of runners) {
    const badgeEl = velocityBadgeRefs.current.get(r.horseId);
    if (badgeEl) {
      badgeEl.textContent = r.velocity.toFixed(1) + ' m/s';
      const color = r.velocity > 17
        ? 'var(--color-success)'
        : r.velocity > 14
          ? 'var(--color-warning)'
          : 'oklch(0.65 0.2 25)';
      badgeEl.style.color = color;
    }
  }
  ```

- [ ] **Step 2: Add velocity badge span in the runner render JSX**

  ```tsx
  {/* Velocity badge — updated imperatively by RAF, no React re-render */}
  <span
    ref={(el) => {
      if (el) velocityBadgeRefs.current.set(r.horseId, el);
      else velocityBadgeRefs.current.delete(r.horseId);
    }}
    className="absolute -bottom-14 left-1/2 -translate-x-1/2 text-[9px] tabular-nums font-mono opacity-70 pointer-events-none"
  >
    {r.velocity.toFixed(1)} m/s
  </span>
  ```

- [ ] **Step 3: Add a "fading" visual indicator**

  Add to `src/styles.css`:

  ```css
  .horse-fading {
    filter: brightness(0.75) saturate(0.6);
    transition: filter 1s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .horse-fading {
      filter: none !important;
      transition: none !important;
    }
  }
  ```

  In the `HorseSprite` wrapper div in Track:

  ```tsx
  const isFading = r.position / distance > 0.7 && r.velocity < r.topSpeed * 0.75;

  <div className={`relative ${isFading ? 'horse-fading' : ''}`}>
    <HorseSprite ... />
  </div>
  ```

- [ ] **Step 4: Increase `laneHeight` to accommodate new overlays**

  ```ts
  const laneHeight = 48; // was 36; increased to accommodate finish labels and velocity badges
  ```

- [ ] **Commit:**
  ```bash
  git add src/components/race/Track.tsx src/styles.css
  git commit -m "feat(race): add velocity badges and fading indicator to live race Track"
  ```

---

## Task 4: Fix `RaceBroadcast` gate — prevent blank flash on race resolve

**Files:**
- Modify: `src/components/race/RaceBroadcast.tsx`

- [ ] **Step 1: Guard against blank-flash with phase-aware visualizer selection**

  Replace the single `hasReplay` flag with an explicit phase-aware selection:

  ```tsx
  // Show the canvas replay only when: race is resolved AND has snapshot data AND NOT in active live phase.
  const showReplay = phase !== "live" && race.resolved && !!race.snapshots?.length;
  ```

  Then:
  ```tsx
  {showReplay ? (
    <RaceVisualizer ... />
  ) : (
    <Track ... />
  )}
  ```

- [ ] **Commit:**
  ```bash
  git add src/components/race/RaceBroadcast.tsx
  git commit -m "fix(race): prevent blank flash when race resolves by gating replay on phase not just resolved flag"
  ```

---

## Task 5: Overflow fix and compositor hints

**Files:**
- Modify: `src/components/race/Track.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Separate background clip from overlay clip**

  Change the track outer `div` from `overflow: hidden` to `overflow: visible`, and move the background tile into its own absolutely-positioned inner `div` with `overflow: hidden`:

  ```tsx
  <div
    className="relative rounded-lg border border-white/10 shadow-2xl"
    style={{
      height: trackHeight,
      backgroundColor: "var(--broadcast-track)",
      overflow: "visible",
    }}
  >
    {/* Track background — clipped separately so overlays can exceed bounds */}
    <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: trackBg,
          backgroundSize: "auto 100%",
          backgroundRepeat: "repeat-x",
          backgroundPosition: `${trackOffset}px 0`,
          willChange: "background-position",
        }}
      />
    </div>
    {/* rest of track content */}
  ```

- [ ] **Step 2: Add `will-change: left` to horse position divs**

  ```tsx
  style={{
    left: `${screenPct}%`,
    top: 10 + i * laneHeight,
    zIndex: Math.round(r.position),
    willChange: 'left',
  }}
  ```

- [ ] **Step 3: Ensure all new CSS classes are covered by `prefers-reduced-motion`**

  ```css
  @media (prefers-reduced-motion: reduce) {
    .horse-finish-pop,
    .horse-finish-label,
    .horse-fading {
      animation: none !important;
      transition: none !important;
      filter: none !important;
    }
  }
  ```

- [ ] **Step 4: Typecheck**

  ```bash
  bun run typecheck
  ```

- [ ] **Commit:**
  ```bash
  git add src/components/race/Track.tsx src/styles.css
  git commit -m "fix(race): prevent overlay clipping, add will-change compositor hint, expand reduced-motion coverage"
  ```

---

## Verification (whole-plan)

- [ ] `bun run typecheck` — clean
- [ ] `bun run test` — full suite green
- [ ] Manual: navigate to a live race, confirm:
  - Horses move smoothly left-to-right across the track
  - Progress bar at the bottom fills as the leader advances
  - Sim time display in top-right ticks upward in real time
  - Horse sprite animation speed visibly increases at high velocity vs. fading late
  - When a horse crosses the finish line it briefly scales up (finish-burst animation)
  - Finished horses show a `#1 · 92.3s` badge below their sprite
  - Fading horses in the last 30% of the race visually desaturate
  - Velocity badges update in real time with color coding (green/amber/red)
  - Finish line flashes and glows when leader is within 100m
  - After race finishes, view transitions to `RaceVisualizer` canvas replay without a blank flash
  - With `prefers-reduced-motion: reduce`: all animations suppressed, static state still legible
  - At 1x, 2x, and 4x speed: progress bar and positions remain correct
  - For a 14-runner field: track does not overflow container, all rows legible
- [ ] Manual: press Space to pause mid-race — horse sprites freeze, progress bar stops
- [ ] Manual: revisit a resolved race — `RaceVisualizer` (canvas replay) shown, not `Track`
