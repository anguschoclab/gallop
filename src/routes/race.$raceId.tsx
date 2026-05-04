import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { stepRunner, computePaceContext, type Runner } from "@/game/raceSim";
import { beyerFigure } from "@/game/beyer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateClassBonus } from "@/core/common/classBonus";
import { buildRaceField, rngForRace, type RaceSimulationDependencies } from "@/services/raceSimulationService";
import type { Weather } from "@/game/types";
import { Pause, Play, Camera, Mic2 } from "lucide-react";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { NarrativeGenerator, type CommentaryLine } from "@/services/narrativeService";

// Track surface background mapping
const getTrackBackground = (surface?: string): string | undefined => {
  switch (surface) {
    case "Turf":
      return "url(/assets/track-turf.png)";
    case "Dirt":
      return "url(/assets/track-dirt.png)";
    case "Synthetic":
      return "url(/assets/track-synthetic.png)";
    default:
      return undefined;
  }
};

// Weather sky background mapping
const getSkyBackground = (weather?: Weather): string | undefined => {
  switch (weather) {
    case "sunny":
      return "url(/assets/bg-sky-sunny.png)";
    case "cloudy":
      return "url(/assets/bg-sky-cloudy.png)";
    case "rainy":
      return "url(/assets/bg-sky-pouring.png)";
    case "sunset":
      return "url(/assets/bg-sky-sunset.png)";
    case "night":
      return "url(/assets/bg-sky-night.png)";
    default:
      return undefined;
  }
};

// Weather display helper
const getWeatherDisplay = (weather?: Weather): string => {
  switch (weather) {
    case "sunny":
      return "☀️ Sunny";
    case "cloudy":
      return "☁️ Cloudy";
    case "rainy":
      return "🌧️ Rainy";
    case "sunset":
      return "🌅 Sunset";
    case "night":
      return "🌙 Night";
    default:
      return "";
  }
};

// Sprite sheet configuration
const ANIMATED_SPRITES = [
  "bay", "black", "chestnut", "dark-bay", "gray",
  "roan", "palomino", "white",
  "seal-brown", "liver-chestnut", "buckskin", "dun", "grulla", "champagne"
];

const COAT_TO_SPRITE: Record<string, string> = {
  bay: "b",
  black: "bl",
  chestnut: "ch",
  "dark-bay": "dkb",
  gray: "gr",
  roan: "roan",
  palomino: "palomino",
  white: "white",
  "seal-brown": "seal",
  "liver-chestnut": "liver",
  buckskin: "buck",
  dun: "dun",
  grulla: "grulla",
  champagne: "champagne",
};

function getSpriteUrl(coatColor?: string): string | undefined {
  if (!coatColor) return undefined;
  const sprite = COAT_TO_SPRITE[coatColor];
  return sprite ? `/assets/horse-${sprite}.png` : undefined;
}

function isAnimatedSprite(coatColor?: string): boolean {
  if (!coatColor) return false;
  return ANIMATED_SPRITES.includes(coatColor);
}

function getAnimationDuration(velocity: number): string {
  const baseSpeed = 15;
  const duration = Math.max(0.3, Math.min(0.8, 0.6 * (baseSpeed / Math.max(velocity, 5))));
  return `${duration.toFixed(2)}s`;
}

function projectedBeyer(r: Runner, distance: number, simTime: number, classBonus: number): number | null {
  if (r.finishTime !== null) {
    return beyerFigure({ distance, finishTime: r.finishTime, classBonus });
  }
  if (r.position <= 0 || r.velocity <= 0.5) return null;
  const remaining = distance - r.position;
  const projFinish = simTime + remaining / r.velocity;
  return beyerFigure({ distance, finishTime: projFinish, classBonus });
}

export const Route = createFileRoute("/race/$raceId")({
  component: LiveRace,
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Race not found</h1>
      <Link to="/races" search={{ grade: "all", country: "all", surface: "all", track: "all", owned: "all", q: "" }} className="text-primary underline">Back</Link>
    </div>
  ),
});

function LiveRace() {
  const { raceId } = Route.useParams();
  const navigate = useNavigate();
  const race = useGame((s) => s.races.find((r) => r.id === raceId));
  const horses = useGame((s) => s.horses);
  const stables = useGame((s) => s.npcStables);
  const resolveRace = useGame((s) => s.resolveRace);

  if (!race) throw notFound();
  if (race.resolved) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">This race has already been run.</p>
        <Link to="/races" search={{ grade: "all", country: "all", surface: "all", track: "all", owned: "all", q: "" }}><Button className="mt-4">Back to races</Button></Link>
      </div>
    );
  }

  const [runners] = useState<Runner[]>(() => {
    const deps: RaceSimulationDependencies = { race, horses };
    const { runners: built } = buildRaceField(deps);
    return built;
  });
  const rngRef = useRef(rngForRace(race));

  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sortBy, setSortBy] = useState<"position" | "beyer" | "velocity">("position");
  const [filter, setFilter] = useState<"all" | "owned" | "top5">("all");
  const [minBeyer, setMinBeyer] = useState(0);
  
  const ownedRunnersTotal = runners.filter(r => r.owned);
  const defaultFollowTarget = ownedRunnersTotal.length > 0 ? ownedRunnersTotal[0].horseId : null;
  const [followTarget, setFollowTarget] = useState<string | null>(defaultFollowTarget);
  
  const [announcement, setAnnouncement] = useState<string>("");
  const [commentary, setCommentary] = useState<CommentaryLine[]>([]);
  const [subjectHorseId, setSubjectHorseId] = useState<string | null>(null);
  const narrativeRef = useRef<NarrativeGenerator | null>(null);
  const messageQueue = useRef<CommentaryLine[]>([]);
  const lastMessageTime = useRef<number>(0);
  
  if (!narrativeRef.current && race) {
    narrativeRef.current = new NarrativeGenerator(race, horses, stables, rngRef.current);
  }

  // Paced message delivery effect
  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (messageQueue.current.length > 0 && now - lastMessageTime.current > 1500) {
        const next = messageQueue.current.shift()!;
        setCommentary(prev => [...prev, next].slice(-50));
        setAnnouncement(next.text);
        setSubjectHorseId(next.horseId || null);
        lastMessageTime.current = now;
        
        // Clear subject highlight after a few seconds
        setTimeout(() => {
          setSubjectHorseId(current => current === next.horseId ? null : current);
        }, 3000);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [finished]);

  const lastAnnouncedPosition = useRef<Map<string, number>>(new Map());
  const lastAnnouncementTime = useRef<number>(0);
  
  const simTimeRef = useRef(0);
  const finishOrderRef = useRef<{ horseId: string; position: number; time: number }[]>([]);
  const speedRef = useRef(speed);
  const pausedRef = useRef(paused);
  speedRef.current = speed;
  pausedRef.current = paused;

  const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const FIXED_DT = 0.05;
    let accumulator = 0;
    const MAX_STEPS_PER_FRAME = 64;

    const loop = (now: number) => {
      const real = (now - last) / 1000;
      last = now;
      if (!pausedRef.current) {
        accumulator += real * speedRef.current;
      }
      let stillRunning = runners.some((r) => r.finishTime === null);
      let steps = 0;
      while (accumulator >= FIXED_DT && stillRunning && steps < MAX_STEPS_PER_FRAME) {
        accumulator -= FIXED_DT;
        simTimeRef.current += FIXED_DT;
        steps++;
        stillRunning = false;
        const pace = computePaceContext(runners, race.distance);
        if (narrativeRef.current) {
          const newCommentary = narrativeRef.current.update(runners, simTimeRef.current, pace.pacePressure);
          if (newCommentary.length > 0) {
            messageQueue.current.push(...newCommentary);
          }
        }
        for (const r of runners) {
          if (r.finishTime === null) {
            stepRunner(r, FIXED_DT, simTimeRef.current, race.distance, rngRef.current, runners, pace);
            if (r.finishTime !== null) {
              finishOrderRef.current.push({
                horseId: r.horseId,
                position: finishOrderRef.current.length + 1,
                time: r.finishTime,
              });
            } else {
              stillRunning = true;
            }
          }
        }
      }
      setTick((t) => t + 1);
      if (stillRunning) {
        raf = requestAnimationFrame(loop);
      } else {
        setFinished(true);
        resolveRace(race.id, finishOrderRef.current);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !finished) {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finished]);

  // Legacy simple announcer is now integrated into the NarrativeGenerator
  // Keeping this effect empty to avoid conflicts but preserving the tick dependency if needed elsewhere
  useEffect(() => {
  }, [tick, runners, finished]);

  void tick;
  const rows = runners.map((r) => ({
    r,
    beyer: projectedBeyer(r, race.distance, simTimeRef.current, classBonus),
  }));

  const positionRank = new Map(
    [...rows].sort((a, b) => b.r.position - a.r.position).map((row, i) => [row.r.horseId, i + 1])
  );

  const filtered = rows.filter(({ r, beyer }) => {
    if (filter === "owned" && !r.owned) return false;
    if (filter === "top5" && (positionRank.get(r.horseId) ?? 99) > 5) return false;
    if (minBeyer > 0 && (beyer ?? 0) < minBeyer) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "beyer") return (b.beyer ?? -1) - (a.beyer ?? -1);
    if (sortBy === "velocity") return b.r.velocity - a.r.velocity;
    return b.r.position - a.r.position;
  });

  const skyBg = getSkyBackground(race.weather);

  return (
    <div className="broadcast min-h-screen text-white bg-broadcast-track">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: skyBg ? `${skyBg}, linear-gradient(to bottom, var(--broadcast-sky-overlay), transparent)` : undefined,
          backgroundSize: "auto 200px, 100% 100%",
          backgroundRepeat: "repeat-x, no-repeat",
          backgroundPosition: "top, top",
          zIndex: 0
        }}
      />

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="relative z-10 p-4 flex items-center justify-between border-b border-white/10 bg-broadcast-marquee backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold">{race.name}</h1>
          <p className="text-xs text-white/70 tabular-nums">
            {race.distance}m · {race.raceClass} · Purse ${race.purse.toLocaleString()}
            {race.weather && ` · ${getWeatherDisplay(race.weather)}`}
            {race.trackCondition && ` · Track: ${race.trackCondition}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!finished && (
            <Select value={followTarget || "leader"} onValueChange={(v) => setFollowTarget(v === "leader" ? null : v)}>
              <SelectTrigger className="h-8 w-40 text-xs bg-white/10 border-white/20 text-white">
                <Camera className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leader">Follow Leader</SelectItem>
                {runners.map((r, i) => (
                  <SelectItem key={r.horseId} value={r.horseId}>
                    {r.owned ? "⭐ " : ""}{i + 1}. {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {!finished && (
            <Button 
              size="sm" 
              variant={paused ? "secondary" : "ghost"}
              onClick={() => setPaused(!paused)}
              className="px-2"
              title="Spacebar to toggle"
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          )}
          
          {!finished && !paused && (
            <>
              <Button size="sm" variant={speed === 1 ? "secondary" : "ghost"} onClick={() => setSpeed(1)}>1x</Button>
              <Button size="sm" variant={speed === 2 ? "secondary" : "ghost"} onClick={() => setSpeed(2)}>2x</Button>
              <Button size="sm" variant={speed === 4 ? "secondary" : "ghost"} onClick={() => setSpeed(4)}>4x</Button>
            </>
          )}
          
          {finished && (
            <Button size="sm" onClick={() => navigate({ to: "/races", search: { grade: "all", country: "all", surface: "all", track: "all", owned: "all", q: "" } })}>Back to races</Button>
          )}
        </div>
      </div>

      <div className="relative z-10 p-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div>
          <Track
            runners={runners}
            distance={race.distance}
            tick={tick}
            surface={race.graded?.surface}
            weather={race.weather}
            followTarget={followTarget}
            paused={paused}
            subjectHorseId={subjectHorseId}
          />
          <BroadcastCommentary commentary={commentary} />
        </div>
        <div className="bg-broadcast-marquee rounded-lg p-3 space-y-3 backdrop-blur-md border border-white/5">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60 mb-2">Live order</p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="h-8 text-xs bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="position">Position</SelectItem>
                  <SelectItem value="beyer">Proj. Beyer</SelectItem>
                  <SelectItem value="velocity">Velocity</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <SelectTrigger className="h-8 text-xs bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All runners</SelectItem>
                  <SelectItem value="owned">My horses</SelectItem>
                  <SelectItem value="top5">Top 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-2">
              <label className="text-[10px] uppercase tracking-wide text-white/60 flex justify-between items-center mb-1">
                <span>Min <JargonTooltip term="Beyer">Beyer</JargonTooltip></span><span className="tabular-nums font-bold text-broadcast-accent">{minBeyer}</span>
              </label>
              <Slider
                min={0}
                max={120}
                step={5}
                value={[minBeyer]}
                onValueChange={(vals) => setMinBeyer(vals[0])}
                className="py-2"
              />
            </div>
          </div>
          <div className="space-y-1">
            {sorted.map(({ r, beyer }) => (
              <div key={r.horseId} className="flex items-center gap-2 text-sm py-1 border-b border-white/5 last:border-0">
                <span className="w-5 text-white/60 tabular-nums">{positionRank.get(r.horseId)}</span>
                <div
                  className="h-4 w-4 rounded-full border border-white/40 shadow-sm"
                  style={{ backgroundColor: r.silk }}
                />
                <span className={`flex-1 truncate ${r.owned ? "font-bold text-broadcast-accent" : ""}`}>{r.name}</span>
                {beyer !== null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-broadcast-accent/20 text-broadcast-accent tabular-nums font-bold">
                    {beyer}
                  </span>
                )}
                {r.finishTime !== null && (
                  <span className="text-xs text-white/60 tabular-nums">{r.finishTime.toFixed(1)}s</span>
                )}
              </div>
            ))}
            {sorted.length === 0 && (
              <p className="text-xs text-white/50 italic py-2">No runners match the current filters.</p>
            )}
          </div>
        </div>
      </div>

      {finished && <ResultOverlay race={race} runners={runners} onClose={() => navigate({ to: "/races", search: { grade: "all", country: "all", surface: "all", track: "all", owned: "all", q: "" } })} />}
    </div>
  );
}

function Track({
  runners,
  distance,
  tick,
  surface,
  weather,
  followTarget,
  paused,
  subjectHorseId,
}: {
  runners: Runner[];
  distance: number;
  tick: number;
  surface?: string;
  weather?: Weather;
  followTarget?: string | null;
  paused?: boolean;
  subjectHorseId?: string | null;
}) {
  const laneHeight = 36;
  const trackHeight = runners.length * laneHeight + 20;
  const trackBg = getTrackBackground(surface);
  const viewportWidth = distance * 0.6;
  
  const cameraPos = (() => {
    if (followTarget) {
      const target = runners.find(r => r.horseId === followTarget);
      if (target) {
        return Math.max(0, Math.min(distance - viewportWidth, target.position - viewportWidth / 2));
      }
    }
    const leader = runners.reduce((max, r) => r.position > max.position ? r : max, runners[0]);
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
            className="absolute top-0 bottom-0 w-px bg-white/10"
            style={{ left: `${screenPct}%` }}
          >
            <span className="absolute -top-4 left-1 text-[10px] text-white/30 tabular-nums">{markerPos}m</span>
          </div>
        );
      })}
      
      <div 
        className={`absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] ${finishActive ? 'finish-line-active' : ''}`}
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
                {r.draftingHorseId && (
                  <div className="px-1.5 py-0.5 rounded-full bg-blue-500/80 text-[8px] font-bold text-white flex items-center gap-1 animate-pulse">
                    <span className="h-1 w-1 rounded-full bg-white" />
                    Drafting
                  </div>
                )}
                {r.velocity > 18 && (
                  <div className="px-1.5 py-0.5 rounded-full bg-orange-500/80 text-[8px] font-bold text-white flex items-center gap-1 animate-bounce">
                    <span className="h-1 w-1 rounded-full bg-white" />
                    Flying
                  </div>
                )}
              </div>

              <HorseSprite 
                runner={r} 
                isRunning={isRunning} 
                spriteUrl={spriteUrl}
                isAnimated={isAnimated}
              />
              
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className={`text-[10px] whitespace-nowrap drop-shadow-md tabular-nums ${r.owned ? 'font-bold text-broadcast-accent' : 'text-white/80'}`}>
                  {r.name}
                </span>
                {r.owned && (
                  <div className="text-[8px] font-black text-broadcast-accent uppercase tracking-tighter">Owner</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HorseSprite({
  runner,
  isRunning,
  spriteUrl,
  isAnimated,
}: {
  runner: Runner;
  isRunning: boolean;
  spriteUrl?: string;
  isAnimated: boolean;
}) {
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animationDuration = getAnimationDuration(runner.velocity);
  
  if (isAnimated && spriteUrl) {
    return (
      <div
        className={`horse-sprite ${isRunning && !prefersReducedMotion ? 'horse-sprite-animated' : ''}`}
        style={{
          backgroundImage: `url(${spriteUrl})`,
          animationDuration: isRunning ? animationDuration : '0.6s',
        }}
      />
    );
  }
  
  if (spriteUrl) {
    return (
      <div
        className={`horse-sprite horse-sprite-static ${isRunning && !prefersReducedMotion ? 'horse-sprite-bob' : ''}`}
        style={{
          backgroundImage: `url(${spriteUrl})`,
        }}
      />
    );
  }
  
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow"
      style={{
        backgroundColor: runner.silk,
        animation: isRunning && !prefersReducedMotion ? "pulse 0.5s ease-in-out infinite" : undefined,
      }}
    />
  );
}

function BroadcastCommentary({ commentary }: { commentary: CommentaryLine[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commentary]);

  const visibleLines = commentary.slice(-8);

  return (
    <div className="mt-4 bg-broadcast-marquee/80 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-500">
      <div className="px-4 py-2.5 border-b border-white/10 bg-gradient-to-r from-white/10 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1 rounded bg-broadcast-accent/20">
            <Mic2 className="h-4 w-4 text-broadcast-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 leading-tight">Live Commentary</span>
            <span className="text-[8px] text-white/40 uppercase tracking-widest font-medium">Race Broadcast Service</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-black/40 border border-white/5">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
          <span className="text-[8px] font-bold text-white/90 uppercase tracking-tighter">Live</span>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="h-28 overflow-y-auto p-4 space-y-3 scroll-smooth scrollbar-hide bg-gradient-to-b from-transparent to-black/20"
      >
        {visibleLines.map((line, i) => {
          const isLatest = i === visibleLines.length - 1;
          return (
            <div 
              key={line.id} 
              className={`text-xs flex gap-3 transition-all duration-700 ${
                isLatest ? "text-white font-semibold animate-in slide-in-from-right-4 fade-in" : "text-white/40 font-normal"
              }`}
            >
               <span className={`text-[10px] tabular-nums flex-shrink-0 mt-0.5 ${isLatest ? "text-broadcast-accent" : "opacity-30"}`}>
                 {line.timestamp.toFixed(1)}s
               </span>
               <div className="flex-1 leading-relaxed relative">
                 {line.isHighImpact && isLatest && (
                   <span className="absolute -left-4 top-0 animate-ping h-2 w-2 rounded-full bg-broadcast-accent opacity-75" />
                 )}
                 {line.text}
               </div>
            </div>
          );
        })}
        {commentary.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-2 opacity-20">
            <Mic2 className="h-6 w-6" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">System Initializing</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultOverlay({
  race,
  runners,
  onClose,
}: {
  race: { name: string; purse: number };
  runners: Runner[];
  onClose: () => void;
}) {
  const PRIZE = [0.6, 0.25, 0.1, 0.05];
  const ordered = [...runners].sort((a, b) => (a.finishTime ?? 99) - (b.finishTime ?? 99));
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-card text-card-foreground rounded-xl shadow-2xl max-w-md w-full p-6 border border-white/10">
        <h2 className="text-2xl font-bold mb-1">{race.name}</h2>
        <p className="text-sm text-muted-foreground mb-4">Final result</p>
        <div className="space-y-2">
          {ordered.map((r, i) => {
            const prize = i < PRIZE.length ? Math.round(race.purse * PRIZE[i]) : 0;
            return (
              <div key={r.horseId} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                <span className="w-6 font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="h-5 w-5 rounded-full border border-white/20" style={{ backgroundColor: r.silk }} />
                <span className={`flex-1 truncate ${r.owned ? "font-bold text-success" : ""}`}>{r.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{r.finishTime?.toFixed(2)}s</span>
                {prize > 0 && r.owned && (
                  <span className="text-sm font-bold text-success tabular-nums">+${prize.toLocaleString()}</span>
                )}
              </div>
            );
          })}
        </div>
        <Button onClick={onClose} className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">Close results</Button>
      </div>
    </div>
  );
}
