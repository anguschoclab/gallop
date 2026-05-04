import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { stepRunner, computePaceContext, type Runner } from "@/game/raceSim";
import { beyerFigure } from "@/game/beyer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateClassBonus } from "@/core/common/classBonus";
import { buildRaceField, rngForRace, type RaceSimulationDependencies } from "@/services/raceSimulationService";
import type { Weather } from "@/game/types";
import { Pause, Play, Camera } from "lucide-react";

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
// All sprites have 6-frame animation (300x50px sheets)
const ANIMATED_SPRITES = [
  "bay", "black", "chestnut", "dark-bay", "gray",
  "roan", "palomino", "white",
  "seal-brown", "liver-chestnut", "buckskin", "dun", "grulla", "champagne"
];
const STATIC_SPRITES: string[] = []; // All sprites are animated

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

// Get sprite URL for a coat color
function getSpriteUrl(coatColor?: string): string | undefined {
  if (!coatColor) return undefined;
  const sprite = COAT_TO_SPRITE[coatColor];
  return sprite ? `/assets/horse-${sprite}.png` : undefined;
}

// Check if sprite is animated (6-frame sheet) or static
function isAnimatedSprite(coatColor?: string): boolean {
  if (!coatColor) return false;
  return ANIMATED_SPRITES.includes(coatColor);
}

// Calculate animation duration based on velocity (faster = quicker animation)
function getAnimationDuration(velocity: number): string {
  // Base duration 0.6s at ~15 m/s, scales inversely with velocity
  const baseSpeed = 15;
  const duration = Math.max(0.3, Math.min(0.8, 0.6 * (baseSpeed / Math.max(velocity, 5))));
  return `${duration.toFixed(2)}s`;
}

// Project a Beyer figure mid-race from current pace.
// If finished: use real finish time. Otherwise: extrapolate remaining distance
// at current velocity (with a small tail-fade penalty if not yet at finish).
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
      <Link to="/races" search={{ grade: "all", country: "all", surface: "all", track: "all" }} className="text-primary underline">Back</Link>
    </div>
  ),
});

function LiveRace() {
  const { raceId } = Route.useParams();
  const navigate = useNavigate();
  const race = useGame((s) => s.races.find((r) => r.id === raceId));
  const horses = useGame((s) => s.horses);
  const resolveRace = useGame((s) => s.resolveRace);

  if (!race) throw notFound();
  if (race.resolved) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">This race has already been run.</p>
        <Link to="/races" search={{ grade: "all", country: "all", surface: "all", track: "all" }}><Button className="mt-4">Back to races</Button></Link>
      </div>
    );
  }

  // Build full field: owner entries + AI fillers. Seeded RNG keyed by race id
  // means a re-loaded race produces the same finish order and times.
  const [runners] = useState<Runner[]>(() => {
    const deps: RaceSimulationDependencies = { race, horses };
    return buildRaceField(deps);
  });
  const rngRef = useRef(rngForRace(race));

  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sortBy, setSortBy] = useState<"position" | "beyer" | "velocity">("position");
  const [filter, setFilter] = useState<"all" | "owned" | "top5">("all");
  const [minBeyer, setMinBeyer] = useState(0);
  
  // Camera follow: null = auto-follow leader, string = specific horseId
  // Default to first owned horse, or leader if no owned horses
  const ownedHorses = runners.filter(r => r.owned);
  const defaultFollowTarget = ownedHorses.length > 0 ? ownedHorses[0].horseId : null;
  const [followTarget, setFollowTarget] = useState<string | null>(defaultFollowTarget);
  
  // Accessibility announcements
  const [announcement, setAnnouncement] = useState<string>("");
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
    // Fixed timestep keeps the seeded RNG-driven outcome identical across
    // reloads regardless of browser frame timing. Variable real-time dt is
    // accumulated and drained in fixed slices.
    const FIXED_DT = 0.05;
    let accumulator = 0;
    const MAX_STEPS_PER_FRAME = 64;

    const loop = (now: number) => {
      const real = (now - last) / 1000;
      last = now;
      
      // Skip accumulator update when paused
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
        // Pass the full field so the store can both pay owners and collect
        // pace samples for Beyer par calibration.
        resolveRace(race.id, finishOrderRef.current);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard handler: Spacebar toggles pause
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

  // Accessibility: Announce position changes for owned horses (throttled)
  useEffect(() => {
    if (finished) return;
    
    const now = performance.now();
    if (now - lastAnnouncementTime.current < 3000) return; // Throttle to 3s
    
    const ownedRunners = runners.filter(r => r.owned && r.finishTime === null);
    if (ownedRunners.length === 0) return;
    
    // Calculate positions
    const sorted = [...runners].sort((a, b) => b.position - a.position);
    const positions = new Map(sorted.map((r, i) => [r.horseId, i + 1]));
    
    // Check for position changes
    for (const r of ownedRunners) {
      const currentPos = positions.get(r.horseId) || 0;
      const lastPos = lastAnnouncedPosition.current.get(r.horseId);
      
      if (lastPos !== undefined && currentPos !== lastPos) {
        const direction = currentPos < lastPos ? "moved up to" : "dropped to";
        const suffix = currentPos === 1 ? " (leading!)" : "";
        setAnnouncement(`${r.name} ${direction} ${currentPos}${suffix}`);
        lastAnnouncementTime.current = now;
        break; // Only announce one change per tick
      }
      
      lastAnnouncedPosition.current.set(r.horseId, currentPos);
    }
  }, [tick, runners, finished]);

  // Build live rows with projected Beyer, then filter + sort.
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
    <div
      className="min-h-screen text-white"
      style={{
        backgroundImage: skyBg ? `${skyBg}, linear-gradient(to bottom, rgb(6 78 59), rgb(6 59 48))` : undefined,
        backgroundSize: "auto 200px, 100% 100%",
        backgroundRepeat: "repeat-x, no-repeat",
        backgroundPosition: "top, top",
        backgroundColor: "rgb(6 59 48)", // emerald-950 fallback
      }}
    >
      {/* Accessibility: Live region for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20">
        <div>
          <h1 className="text-xl font-bold">{race.name}</h1>
          <p className="text-xs text-white/70">
            {race.distance}m · {race.raceClass} · Purse ${race.purse.toLocaleString()}
            {race.weather && ` · ${getWeatherDisplay(race.weather)}`}
            {race.trackCondition && ` · Track: ${race.trackCondition}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Camera follow selector */}
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
          
          {/* Pause/Play button */}
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
          
          {/* Speed controls */}
          {!finished && !paused && (
            <>
              <Button size="sm" variant={speed === 1 ? "secondary" : "ghost"} onClick={() => setSpeed(1)}>1x</Button>
              <Button size="sm" variant={speed === 2 ? "secondary" : "ghost"} onClick={() => setSpeed(2)}>2x</Button>
              <Button size="sm" variant={speed === 4 ? "secondary" : "ghost"} onClick={() => setSpeed(4)}>4x</Button>
            </>
          )}
          
          {finished && (
            <Button size="sm" onClick={() => navigate({ to: "/races", search: { grade: "all", country: "all", surface: "all", track: "all" } })}>Back to races</Button>
          )}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div>
          <Track
            runners={runners}
            distance={race.distance}
            tick={tick}
            surface={race.graded?.surface}
            weather={race.weather}
            followTarget={followTarget}
            paused={paused}
          />
        </div>
        <div className="bg-black/30 rounded-lg p-3 space-y-3">
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
              <label className="text-[10px] uppercase tracking-wide text-white/60 flex justify-between">
                <span>Min Beyer</span><span className="tabular-nums">{minBeyer}</span>
              </label>
              <input
                type="range" min={0} max={120} step={5}
                value={minBeyer}
                onChange={(e) => setMinBeyer(Number(e.target.value))}
                className="w-full accent-yellow-400"
              />
            </div>
          </div>
          <div className="space-y-1">
            {sorted.map(({ r, beyer }) => (
              <div key={r.horseId} className="flex items-center gap-2 text-sm py-1">
                <span className="w-5 text-white/60 tabular-nums">{positionRank.get(r.horseId)}</span>
                <div
                  className="h-5 w-5 rounded-full border border-white/40"
                  style={{ backgroundColor: r.silk }}
                />
                <span className={`flex-1 truncate ${r.owned ? "font-bold" : ""}`}>{r.name}</span>
                {beyer !== null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 tabular-nums">
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

      {finished && <ResultOverlay race={race} runners={runners} onClose={() => navigate({ to: "/races", search: { grade: "all", country: "all", surface: "all", track: "all" } })} />}
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
}: {
  runners: Runner[];
  distance: number;
  tick: number;
  surface?: string;
  weather?: Weather;
  followTarget?: string | null;
  paused?: boolean;
}) {
  const laneHeight = 36;
  const trackHeight = runners.length * laneHeight + 20;
  const trackBg = getTrackBackground(surface);
  
  // Viewport shows 60% of the race distance
  const viewportWidth = distance * 0.6;
  
  // Calculate camera position based on follow target
  const cameraPos = (() => {
    if (followTarget) {
      // Follow specific horse
      const target = runners.find(r => r.horseId === followTarget);
      if (target) {
        // Center the target in viewport
        return Math.max(0, Math.min(distance - viewportWidth, target.position - viewportWidth / 2));
      }
    }
    // Follow leader
    const leader = runners.reduce((max, r) => r.position > max.position ? r : max, runners[0]);
    return Math.max(0, Math.min(distance - viewportWidth, leader.position - viewportWidth / 2));
  })();
  
  // Leader approaching finish (within 100m)
  const leaderPos = runners.reduce((max, r) => Math.max(max, r.position), 0);
  const finishActive = leaderPos > distance - 100 && leaderPos < distance;
  
  // Parallax track offset
  const trackOffset = -(cameraPos % 512);
  
  return (
    <div
      className="relative rounded-lg overflow-hidden border border-emerald-600 shadow-inner"
      style={{
        height: trackHeight,
        backgroundColor: trackBg ? undefined : "rgb(4 120 87)",
      }}
    >
      {/* Parallax track background */}
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
      
      {/* lane lines */}
      {runners.map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-b border-emerald-800/40"
          style={{ top: 10 + i * laneHeight + laneHeight }}
        />
      ))}
      
      {/* Distance markers every 200m */}
      {Array.from({ length: Math.ceil(distance / 200) }, (_, i) => {
        const markerPos = i * 200;
        const relativePos = markerPos - cameraPos;
        const screenPct = (relativePos / viewportWidth) * 100;
        if (screenPct < -10 || screenPct > 110) return null;
        return (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-white/20"
            style={{ left: `${screenPct}%` }}
          >
            <span className="absolute -top-4 left-1 text-[10px] text-white/50">{markerPos}m</span>
          </div>
        );
      })}
      
      {/* finish line */}
      <div 
        className={`absolute top-0 bottom-0 w-1 bg-white ${finishActive ? 'finish-line-active' : ''}`}
        style={{ 
          left: `${((distance - cameraPos) / viewportWidth) * 100}%`,
        }}
      />
      <div 
        className="absolute top-0 text-xs text-white/70 px-1"
        style={{ 
          left: `${((distance - cameraPos) / viewportWidth) * 100}%`,
          transform: 'translateX(-100%)',
        }}
      >
        FIN
      </div>

      {/* Runners */}
      {runners.map((r, i) => {
        const relativePos = r.position - cameraPos;
        const screenPct = (relativePos / viewportWidth) * 100;
        const isVisible = screenPct >= -10 && screenPct <= 110;
        
        if (!isVisible) return null;
        
        const spriteUrl = getSpriteUrl(r.coatColor);
        const isAnimated = isAnimatedSprite(r.coatColor);
        const isRunning = tick > 0 && !paused && r.finishTime === null;
        
        return (
          <div
            key={r.horseId}
            className="absolute transition-none"
            style={{
              top: 10 + i * laneHeight + 4,
              left: `${screenPct}%`,
              transform: "translateX(-50%)",
              zIndex: Math.round(r.position),
            }}
          >
            <div className="flex items-center gap-2">
              {/* Silk dot */}
              <div
                className="h-4 w-4 rounded-full border border-white/60 flex-shrink-0"
                style={{ backgroundColor: r.silk }}
              />
              
              {/* Horse sprite */}
              <HorseSprite 
                runner={r} 
                isRunning={isRunning} 
                spriteUrl={spriteUrl}
                isAnimated={isAnimated}
              />
              
              {/* Name label */}
              <span className={`text-xs whitespace-nowrap ${r.owned ? 'font-bold text-yellow-300' : 'text-white/80'}`}>
                {r.name}
              </span>
              
              {/* YOU badge */}
              {r.owned && (
                <span className="text-[10px] font-bold bg-yellow-400 text-black px-1 rounded">
                  YOU
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Horse sprite component with CSS animation
// Animated sprites use 6-frame sprite sheets with background-position animation
// Static sprites (roan/palomino/white) use bobbing animation when running
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
  
  // Calculate animation duration based on velocity
  const animationDuration = getAnimationDuration(runner.velocity);
  
  // For animated sprites (6-frame sheets)
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
  
  // For static sprites (single frame) - use bobbing animation
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
  
  // Fallback to silk circle if no sprite
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-card text-foreground rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-1">{race.name}</h2>
        <p className="text-sm text-muted-foreground mb-4">Final result</p>
        <div className="space-y-2">
          {ordered.map((r, i) => {
            const prize = i < PRIZE.length ? Math.round(race.purse * PRIZE[i]) : 0;
            return (
              <div key={r.horseId} className="flex items-center gap-3 py-1 border-b last:border-0">
                <span className="w-6 font-bold tabular-nums">{i + 1}</span>
                <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: r.silk }} />
                <span className={`flex-1 ${r.owned ? "font-bold" : ""}`}>{r.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{r.finishTime?.toFixed(2)}s</span>
                {prize > 0 && r.owned && (
                  <span className="text-sm font-medium text-emerald-600 tabular-nums">+${prize.toLocaleString()}</span>
                )}
              </div>
            );
          })}
        </div>
        <Button onClick={onClose} className="w-full mt-5">Continue</Button>
      </div>
    </div>
  );
}
