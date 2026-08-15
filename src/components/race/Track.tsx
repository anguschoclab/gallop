import { type MutableRefObject, useEffect, useRef } from "react";
import {
  getTrackBackground,
  getSpriteUrl,
  isAnimatedSprite,
} from "@/components/race/raceVisualHelpers";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Weather } from "@/core/race/types";
import {
  buildFieldContext,
  deriveRunnerConditions,
  captureRunnerMoods,
} from "@/core/race/runnerConditions";
import { RunnerConditionBadges } from "./RunnerConditionBadges";
import { RunnerMoodFace } from "./RunnerMoodFace";
import { HorseSprite } from "./HorseSprite";
import {
  TRACK_LANE_HEIGHT,
  TRACK_HEIGHT_PADDING,
  TRACK_TOP_OFFSET,
  TRACK_VIEWPORT_DISTANCE_RATIO,
  TRACK_BG_TILE_WIDTH,
  TRACK_DISTANCE_MARKER_INTERVAL,
  TRACK_OFFSCREEN_PCT_MIN,
  TRACK_OFFSCREEN_PCT_MAX,
  FINISH_LINE_PROXIMITY,
  HORSE_FINISH_POP_MS,
  VELOCITY_BADGE_FAST_RATIO,
  VELOCITY_BADGE_OK_RATIO,
  VELOCITY_BADGE_FAST_COLOR,
  VELOCITY_BADGE_OK_COLOR,
  VELOCITY_BADGE_SLOW_COLOR,
  FADING_PROGRESS_THRESHOLD,
  FADING_VELOCITY_RATIO,
  KICKING_PROGRESS_THRESHOLD,
  LEADING_PROXIMITY_METRES,
} from "@/constants/raceBroadcastConstants";

interface TrackProps {
  runners: Runner[];
  distance: number;
  tick: number;
  surface?: string;
  weather?: Weather;
  followTarget?: string | null;
  paused?: boolean;
  subjectHorseId?: string | null;
  simTimeRef?: MutableRefObject<number>;
}

export function Track({
  runners,
  distance,
  tick,
  surface,
  followTarget,
  paused,
  subjectHorseId,
  simTimeRef,
}: TrackProps) {
  const laneHeight = TRACK_LANE_HEIGHT;
  const trackHeight = runners.length * laneHeight + TRACK_HEIGHT_PADDING;
  const trackBg = getTrackBackground(surface);
  const viewportWidth = distance * TRACK_VIEWPORT_DISTANCE_RATIO;

  const progressBarRef = useRef<HTMLDivElement>(null);
  const simTimeDisplayRef = useRef<HTMLSpanElement>(null);
  const leaderDistDisplayRef = useRef<HTMLSpanElement>(null);
  const horseElemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const velocityBadgeRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const finishedSetRef = useRef<Set<string>>(new Set());
  const finishRankMapRef = useRef<Map<string, number>>(new Map());
  const finishedCountRef = useRef(0);
  const peakVelocityRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let frameId = 0;
    const update = () => {
      let maxPos = 0;
      for (const r of runners) if (r.position > maxPos) maxPos = r.position;
      const leaderProgress = Math.min(1, maxPos / distance);
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${leaderProgress * 100}%`;
      }
      if (simTimeDisplayRef.current && simTimeRef) {
        simTimeDisplayRef.current.textContent = simTimeRef.current.toFixed(1) + "s";
      }
      if (leaderDistDisplayRef.current) {
        leaderDistDisplayRef.current.textContent = `${Math.round(maxPos)}m / ${distance}m`;
      }

      // Velocity badges — field-relative colouring computed once per frame
      const liveRunners = runners.filter((r) => r.finishTime === null && r.velocity > 0);
      const fieldMeanVel = liveRunners.length
        ? liveRunners.reduce((s, r) => s + r.velocity, 0) / liveRunners.length
        : 0;
      for (const r of runners) {
        const badgeEl = velocityBadgeRefs.current.get(r.horseId);
        if (badgeEl) {
          badgeEl.textContent = r.velocity.toFixed(1) + " m/s";
          const ratio = fieldMeanVel > 0 ? r.velocity / fieldMeanVel : 1;
          const color =
            ratio >= VELOCITY_BADGE_FAST_RATIO
              ? VELOCITY_BADGE_FAST_COLOR
              : ratio >= VELOCITY_BADGE_OK_RATIO
                ? VELOCITY_BADGE_OK_COLOR
                : VELOCITY_BADGE_SLOW_COLOR;
          badgeEl.style.color = color;
        }
      }

      // Finish detection
      let newFinisher = false;
      for (const r of runners) {
        if (r.finishTime !== null && !finishedSetRef.current.has(r.horseId)) {
          finishedSetRef.current.add(r.horseId);
          newFinisher = true;
          const el = horseElemRefs.current.get(r.horseId);
          if (el) {
            el.classList.add("horse-finish-pop");
            setTimeout(() => el.classList.remove("horse-finish-pop"), HORSE_FINISH_POP_MS);
          }
        }
      }
      const currentFinished = runners.filter((r) => r.finishTime !== null);
      if (newFinisher || currentFinished.length !== finishedCountRef.current) {
        finishedCountRef.current = currentFinished.length;
        finishRankMapRef.current = new Map(
          [...currentFinished]
            .sort((a, b) => a.finishTime! - b.finishTime!)
            .map((r, i) => [r.horseId, i + 1]),
        );
      }

      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [runners, distance, simTimeRef]);

  const { cameraPos, leaderPos } = (() => {
    let target: Runner | undefined;
    let maxPos = 0;
    for (const r of runners) {
      if (followTarget && r.horseId === followTarget) target = r;
      if (r.position > maxPos) maxPos = r.position;
    }
    let cam: number;
    if (target) {
      cam = Math.max(0, Math.min(distance - viewportWidth, target.position - viewportWidth / 2));
    } else {
      const leader = runners.reduce((max, r) => (r.position > max.position ? r : max), runners[0]);
      cam = Math.max(0, Math.min(distance - viewportWidth, leader.position - viewportWidth / 2));
    }
    return { cameraPos: cam, leaderPos: maxPos };
  })();
  const finishActive = leaderPos > distance - FINISH_LINE_PROXIMITY && leaderPos < distance;

  // Per-runner peak velocity drives the "is it fading?" readings. Runners are
  // mutated in place, so history has to live in a ref keyed by horse id.
  for (const r of runners) {
    const prev = peakVelocityRef.current.get(r.horseId) ?? 0;
    if (r.velocity > prev) peakVelocityRef.current.set(r.horseId, r.velocity);
  }

  captureRunnerMoods(runners, peakVelocityRef.current, distance);

  const trackOffset = -(cameraPos % TRACK_BG_TILE_WIDTH);

  return (
    <div
      className="relative rounded-lg border border-white/10 shadow-2xl"
      style={{
        height: trackHeight,
        backgroundColor: "var(--broadcast-track)",
        overflow: "visible",
      }}
    >
      {/* Clipped background */}
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

      {/* Sim time + leader overlay */}
      <div className="absolute top-1 right-2 z-20 flex gap-3 tabular-nums text-[10px] text-muted-foreground pointer-events-none font-mono">
        <span ref={simTimeDisplayRef}>0.0s</span>
        <span ref={leaderDistDisplayRef}>0m / {distance}m</span>
      </div>

      {runners.map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-b border-white/5"
          style={{ top: TRACK_TOP_OFFSET + i * laneHeight + laneHeight }}
        />
      ))}

      {Array.from({ length: Math.ceil(distance / TRACK_DISTANCE_MARKER_INTERVAL) }, (_, i) => {
        const markerPos = i * TRACK_DISTANCE_MARKER_INTERVAL;
        const relativePos = markerPos - cameraPos;
        const screenPct = (relativePos / viewportWidth) * 100;
        if (screenPct < TRACK_OFFSCREEN_PCT_MIN || screenPct > TRACK_OFFSCREEN_PCT_MAX) return null;
        return (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-border"
            style={{ left: `${screenPct}%` }}
          >
            <span className="absolute -top-4 left-1 text-[10px] text-muted-foreground tabular-nums">
              {markerPos}m
            </span>
          </div>
        );
      })}

      <div
        className={`absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] ${finishActive ? "finish-line-active" : ""}`}
        style={{
          left: `${((distance - cameraPos) / viewportWidth) * 100}%`,
        }}
      />

      {runners.map((r, i) => {
        const relativePos = r.position - cameraPos;
        const screenPct = (relativePos / viewportWidth) * 100;
        if (screenPct < TRACK_OFFSCREEN_PCT_MIN || screenPct > TRACK_OFFSCREEN_PCT_MAX) return null;

        const isRunning = tick > 0 && !paused && r.finishTime === null;
        const isSubject = r.horseId === subjectHorseId;
        const isFading =
          r.position / distance > FADING_PROGRESS_THRESHOLD &&
          r.velocity < r.topSpeed * FADING_VELOCITY_RATIO &&
          r.finishTime === null;
        const finishRank =
          r.finishTime !== null ? finishRankMapRef.current.get(r.horseId) : undefined;

        const conditions =
          r.finishTime === null
            ? deriveRunnerConditions(
                r,
                buildFieldContext(runners),
                { peakVelocity: peakVelocityRef.current.get(r.horseId) ?? 0 },
                distance,
              )
            : [];

        return (
          <div
            key={r.horseId}
            ref={(el) => {
              if (el) horseElemRefs.current.set(r.horseId, el);
              else horseElemRefs.current.delete(r.horseId);
            }}
            className="absolute transition-none"
            style={{
              left: `${screenPct}%`,
              top: TRACK_TOP_OFFSET + i * laneHeight,
              zIndex: Math.round(r.position),
              willChange: "left",
            }}
          >
            <div className={`relative ${isFading ? "horse-fading" : ""}`}>
              {isSubject && (
                <div className="absolute inset-0 -m-4 rounded-full bg-broadcast-accent/30 animate-ping pointer-events-none" />
              )}
              {isSubject && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-broadcast-accent text-black text-[10px] font-black uppercase rounded shadow-lg animate-in zoom-in-50 fade-in duration-300">
                  Subject
                </div>
              )}

              {/* Tactical Indicators */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1 items-center">
                {r.jockeyInstructions?.ridingStyle === "front_runner" && r.lane === 0 && (
                  <div className="px-1.5 py-0.5 rounded-full bg-cyan-500/80 text-[8px] font-black text-white flex items-center gap-1">
                    RAIL
                  </div>
                )}
                {r.jockeyInstructions?.ridingStyle === "closer" && r.lane > 1 && (
                  <div className="px-1.5 py-0.5 rounded-full bg-orange-500/80 text-[8px] font-black text-white flex items-center gap-1">
                    OUTSIDE
                  </div>
                )}
                {r.jockeyInstructions?.ridingStyle === "closer" &&
                  r.jockeyInstructions?.moveTiming === "late" &&
                  r.draftingHorseId && (
                    <div className="px-1.5 py-0.5 rounded-full bg-emerald-500/80 text-[8px] font-black text-white flex items-center gap-1">
                      SAVING
                    </div>
                  )}
                {r.jockeyInstructions?.earlyPosition === "lead" &&
                  r.position >= leaderPos - LEADING_PROXIMITY_METRES && (
                    <div className="px-1.5 py-0.5 rounded-full bg-gold/80 text-[8px] font-black text-t950 flex items-center gap-1">
                      LEADING
                    </div>
                  )}
                {r.jockeyInstructions?.moveTiming === "late" &&
                  r.position / distance > KICKING_PROGRESS_THRESHOLD && (
                    <div className="px-1.5 py-0.5 rounded-full bg-red-600 text-[8px] font-black text-white flex items-center gap-1 animate-pulse">
                      KICKING
                    </div>
                  )}
                {r.draftingHorseId && !r.jockeyInstructions && (
                  <div className="px-1.5 py-0.5 rounded-full bg-muted text-[8px] font-bold text-foreground flex items-center gap-1 animate-pulse">
                    <span className="h-1 w-1 rounded-full bg-foreground" />
                    Drafting
                  </div>
                )}
                <RunnerConditionBadges conditions={conditions} />
                {r.finishTime === null && r.finalMood && (
                  <RunnerMoodFace mood={r.finalMood} horseName={r.name} />
                )}
              </div>

              <HorseSprite
                coatColor={r.coatColor}
                silk={r.silk}
                velocity={r.velocity}
                finishTime={r.finishTime}
                horseName={r.name}
                isRunning={isRunning}
                spriteUrl={getSpriteUrl(r.coatColor)}
                isAnimated={isAnimatedSprite(r.coatColor)}
              />

              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span
                  className={`text-[10px] whitespace-nowrap drop-shadow-md tabular-nums ${r.owned ? "font-bold text-broadcast-accent" : "text-foreground"}`}
                >
                  {r.name}
                </span>
                {r.owned && (
                  <div className="text-[8px] font-black text-broadcast-accent uppercase tracking-tighter">
                    Owner
                  </div>
                )}
              </div>

              {/* Velocity badge (RAF-updated) */}
              <span
                ref={(el) => {
                  if (el) velocityBadgeRefs.current.set(r.horseId, el);
                  else velocityBadgeRefs.current.delete(r.horseId);
                }}
                className="absolute -bottom-14 left-1/2 -translate-x-1/2 text-[9px] tabular-nums font-mono opacity-70 pointer-events-none whitespace-nowrap"
              >
                {r.velocity.toFixed(1)} m/s
              </span>

              {/* Finish position badge */}
              {finishRank !== undefined && (
                <div className="horse-finish-label absolute -bottom-10 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-broadcast-accent text-black text-[10px] font-black tabular-nums whitespace-nowrap">
                  #{finishRank} · {r.finishTime!.toFixed(1)}s
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Live progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-lg overflow-hidden">
        <div
          ref={progressBarRef}
          className="h-full bg-broadcast-accent transition-none"
          style={{ width: "0%" }}
        />
      </div>
    </div>
  );
}
