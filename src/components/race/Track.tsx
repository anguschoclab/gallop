import { getTrackBackground, getSpriteUrl, isAnimatedSprite } from "@/components/races/raceVisualHelpers";
import type { Runner } from "@/game/raceSim";
import { HorseSprite } from "./HorseSprite";

interface TrackProps {
  runners: Runner[];
  distance: number;
  tick: number;
  surface?: string;
  weather?: any;
  followTarget?: string | null;
  paused?: boolean;
  subjectHorseId?: string | null;
}

export function Track({
  runners,
  distance,
  tick,
  surface,
  followTarget,
  paused,
  subjectHorseId,
}: TrackProps) {
  const laneHeight = 36;
  const trackHeight = runners.length * laneHeight + 20;
  const trackBg = getTrackBackground(surface);
  const viewportWidth = distance * 0.6;

  const cameraPos = (() => {
    if (followTarget) {
      const target = runners.find((r) => r.horseId === followTarget);
      if (target) {
        return Math.max(0, Math.min(distance - viewportWidth, target.position - viewportWidth / 2));
      }
    }
    const leader = runners.reduce((max, r) => (r.position > max.position ? r : max), runners[0]);
    return Math.max(0, Math.min(distance - viewportWidth, leader.position - viewportWidth / 2));
  })();

  const leaderPos = runners.reduce((max, r) => Math.max(max, r.position), 0);
  const finishActive = leaderPos > distance - 100 && leaderPos < distance;
  const trackOffset = -(cameraPos % 512);

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-white/10 shadow-2xl"
      style={{
        height: trackHeight,
        backgroundColor: "var(--broadcast-track)",
      }}
    >
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

      {runners.map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-b border-white/5"
          style={{ top: 10 + i * laneHeight + laneHeight }}
        />
      ))}

      {Array.from({ length: Math.ceil(distance / 200) }, (_, i) => {
        const markerPos = i * 200;
        const relativePos = markerPos - cameraPos;
        const screenPct = (relativePos / viewportWidth) * 100;
        if (screenPct < -10 || screenPct > 110) return null;
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
        if (screenPct < -10 || screenPct > 110) return null;

        const isRunning = tick > 0 && !paused && r.finishTime === null;
        const isSubject = r.horseId === subjectHorseId;

        return (
          <div
            key={r.horseId}
            className="absolute transition-none"
            style={{
              left: `${screenPct}%`,
              top: 10 + i * laneHeight,
              zIndex: Math.round(r.position),
            }}
          >
            <div className="relative">
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
                {r.tactics === "rail" && r.lane === 0 && (
                  <div className="px-1.5 py-0.5 rounded-full bg-cyan-500/80 text-[8px] font-black text-white flex items-center gap-1">
                    RAIL
                  </div>
                )}
                {r.tactics === "outside" && r.lane > 1 && (
                  <div className="px-1.5 py-0.5 rounded-full bg-orange-500/80 text-[8px] font-black text-white flex items-center gap-1">
                    OUTSIDE
                  </div>
                )}
                {r.tactics === "save" && r.draftingHorseId && (
                  <div className="px-1.5 py-0.5 rounded-full bg-emerald-500/80 text-[8px] font-black text-white flex items-center gap-1">
                    SAVING
                  </div>
                )}
                {r.tactics === "lead" && r.position >= leaderPos - 2 && (
                  <div className="px-1.5 py-0.5 rounded-full bg-gold/80 text-[8px] font-black text-t950 flex items-center gap-1">
                    LEADING
                  </div>
                )}
                {r.tactics === "late_kick" && r.position / distance > 0.85 && (
                  <div className="px-1.5 py-0.5 rounded-full bg-red-600 text-[8px] font-black text-white flex items-center gap-1 animate-pulse">
                    KICKING
                  </div>
                )}
                {r.draftingHorseId && !r.tactics && (
                  <div className="px-1.5 py-0.5 rounded-full bg-muted text-[8px] font-bold text-foreground flex items-center gap-1 animate-pulse">
                    <span className="h-1 w-1 rounded-full bg-foreground" />
                    Drafting
                  </div>
                )}
                {r.velocity > 18.5 && (
                  <div className="px-1.5 py-0.5 rounded-full bg-warning/80 text-[8px] font-bold text-warning-foreground flex items-center gap-1 animate-bounce">
                    <span className="h-1 w-1 rounded-full bg-warning-foreground" />
                    Flying
                  </div>
                )}
              </div>

              <HorseSprite
                runner={r}
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
