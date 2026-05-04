import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { stepRunner, computePaceContext, type Runner } from "@/game/raceSim";
import { beyerFigure } from "@/game/beyer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateClassBonus } from "@/core/common/classBonus";
import {
  buildRaceField,
  rngForRace,
  type RaceSimulationDependencies,
} from "@/services/raceSimulationService";
import type { Weather } from "@/game/types";

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

// Project a Beyer figure mid-race from current pace.
// If finished: use real finish time. Otherwise: extrapolate remaining distance
// at current velocity (with a small tail-fade penalty if not yet at finish).
function projectedBeyer(
  r: Runner,
  distance: number,
  simTime: number,
  classBonus: number,
): number | null {
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
      <Link
        to="/races"
        search={{ grade: "all", country: "all", surface: "all", track: "all" }}
        className="text-primary underline"
      >
        Back
      </Link>
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
        <Link to="/races" search={{ grade: "all", country: "all", surface: "all", track: "all" }}>
          <Button className="mt-4">Back to races</Button>
        </Link>
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
  const [sortBy, setSortBy] = useState<"position" | "beyer" | "velocity">("position");
  const [filter, setFilter] = useState<"all" | "owned" | "top5">("all");
  const [minBeyer, setMinBeyer] = useState(0);
  const simTimeRef = useRef(0);
  const finishOrderRef = useRef<{ horseId: string; position: number; time: number }[]>([]);
  const speedRef = useRef(speed);
  speedRef.current = speed;

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
      accumulator += real * speedRef.current;
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
            stepRunner(
              r,
              FIXED_DT,
              simTimeRef.current,
              race.distance,
              rngRef.current,
              runners,
              pace,
            );
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

  // Build live rows with projected Beyer, then filter + sort.
  void tick;
  const rows = runners.map((r) => ({
    r,
    beyer: projectedBeyer(r, race.distance, simTimeRef.current, classBonus),
  }));

  const positionRank = new Map(
    [...rows].sort((a, b) => b.r.position - a.r.position).map((row, i) => [row.r.horseId, i + 1]),
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
        backgroundImage: skyBg
          ? `${skyBg}, linear-gradient(to bottom, rgb(6 78 59), rgb(6 59 48))`
          : undefined,
        backgroundSize: "auto 200px, 100% 100%",
        backgroundRepeat: "repeat-x, no-repeat",
        backgroundPosition: "top, top",
        backgroundColor: "rgb(6 59 48)", // emerald-950 fallback
      }}
    >
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20">
        <div>
          <h1 className="text-xl font-bold">{race.name}</h1>
          <p className="text-xs text-white/70">
            {race.distance}m · {race.raceClass} · Purse ${race.purse.toLocaleString()}
            {race.weather && ` · ${getWeatherDisplay(race.weather)}`}
            {race.trackCondition && ` · Track: ${race.trackCondition}`}
          </p>
        </div>
        <div className="flex gap-2">
          {!finished && (
            <>
              <Button
                size="sm"
                variant={speed === 1 ? "secondary" : "ghost"}
                onClick={() => setSpeed(1)}
              >
                1x
              </Button>
              <Button
                size="sm"
                variant={speed === 2 ? "secondary" : "ghost"}
                onClick={() => setSpeed(2)}
              >
                2x
              </Button>
              <Button
                size="sm"
                variant={speed === 4 ? "secondary" : "ghost"}
                onClick={() => setSpeed(4)}
              >
                4x
              </Button>
            </>
          )}
          {finished && (
            <Button
              size="sm"
              onClick={() =>
                navigate({
                  to: "/races",
                  search: { grade: "all", country: "all", surface: "all", track: "all" },
                })
              }
            >
              Back to races
            </Button>
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
          />
        </div>
        <div className="bg-black/30 rounded-lg p-3 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60 mb-2">Live order</p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="h-8 text-xs bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="position">Position</SelectItem>
                  <SelectItem value="beyer">Proj. Beyer</SelectItem>
                  <SelectItem value="velocity">Velocity</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <SelectTrigger className="h-8 text-xs bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All runners</SelectItem>
                  <SelectItem value="owned">My horses</SelectItem>
                  <SelectItem value="top5">Top 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-2">
              <label className="text-[10px] uppercase tracking-wide text-white/60 flex justify-between">
                <span>Min Beyer</span>
                <span className="tabular-nums">{minBeyer}</span>
              </label>
              <input
                type="range"
                min={0}
                max={120}
                step={5}
                value={minBeyer}
                onChange={(e) => setMinBeyer(Number(e.target.value))}
                className="w-full accent-yellow-400"
              />
            </div>
          </div>
          <div className="space-y-1">
            {sorted.map(({ r, beyer }) => (
              <div key={r.horseId} className="flex items-center gap-2 text-sm py-1">
                <span className="w-5 text-white/60 tabular-nums">
                  {positionRank.get(r.horseId)}
                </span>
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
                  <span className="text-xs text-white/60 tabular-nums">
                    {r.finishTime.toFixed(1)}s
                  </span>
                )}
              </div>
            ))}
            {sorted.length === 0 && (
              <p className="text-xs text-white/50 italic py-2">
                No runners match the current filters.
              </p>
            )}
          </div>
        </div>
      </div>

      {finished && (
        <ResultOverlay
          race={race}
          runners={runners}
          onClose={() =>
            navigate({
              to: "/races",
              search: { grade: "all", country: "all", surface: "all", track: "all" },
            })
          }
        />
      )}
    </div>
  );
}

function Track({
  runners,
  distance,
  tick,
  surface,
  weather,
}: {
  runners: Runner[];
  distance: number;
  tick: number;
  surface?: string;
  weather?: Weather;
}) {
  void tick;
  const laneHeight = 36;
  const trackHeight = runners.length * laneHeight + 20;
  const trackBg = getTrackBackground(surface);
  void weather; // Weather background handled at page level

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-emerald-600 shadow-inner"
      style={{
        height: trackHeight,
        backgroundImage: trackBg,
        backgroundSize: "auto 100%",
        backgroundRepeat: "repeat-x",
        backgroundColor: trackBg ? undefined : "rgb(4 120 87)", // emerald-700 fallback
      }}
    >
      {/* lane lines */}
      {runners.map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-b border-emerald-800/40"
          style={{ top: 10 + i * laneHeight + laneHeight }}
        />
      ))}
      {/* finish line */}
      <div className="absolute top-0 bottom-0 right-2 w-1 bg-white" />
      <div className="absolute top-0 right-2 -translate-x-full text-xs text-white/70 px-1">FIN</div>

      {runners.map((r, i) => {
        const pct = Math.min(1, r.position / distance);
        // Map coat color to sprite file
        const coatToSprite: Record<string, string> = {
          bay: "b",
          black: "bl",
          chestnut: "ch",
          "dark-bay": "dkb",
          gray: "gr",
          roan: "roan",
          palomino: "palomino",
          white: "white",
        };
        const horseSpriteUrl = r.coatColor
          ? `/assets/horse-${coatToSprite[r.coatColor] || "b"}.png`
          : undefined;
        return (
          <div
            key={r.horseId}
            className="absolute transition-none"
            style={{
              top: 10 + i * laneHeight + 4,
              left: `calc(${pct * 96}% + 4px)`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="flex items-center gap-1">
              <HorseSprite
                color={r.silk}
                num={i + 1}
                isRunning={tick > 0}
                spriteUrl={horseSpriteUrl}
              />
              {r.owned && (
                <span className="text-xs font-bold bg-yellow-400 text-black px-1 rounded">YOU</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Horse sprite component with CSS animation
// Note: The sprite sheets (horse-*.png) contain 6-frame running animations
// When spriteUrl is provided, shows the actual horse sprite; otherwise uses silk color
function HorseSprite({
  color,
  num,
  isRunning,
  spriteUrl,
}: {
  color: string;
  num: number;
  isRunning: boolean;
  spriteUrl?: string;
}) {
  // For now, use colored circle; future: use CSS sprite animation with spriteUrl
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow"
      style={{
        backgroundColor: color,
        animation:
          isRunning && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "pulse 0.5s ease-in-out infinite"
            : undefined,
      }}
    >
      {num}
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
                <span className="text-xs text-muted-foreground tabular-nums">
                  {r.finishTime?.toFixed(2)}s
                </span>
                {prize > 0 && r.owned && (
                  <span className="text-sm font-medium text-emerald-600 tabular-nums">
                    +${prize.toLocaleString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <Button onClick={onClose} className="w-full mt-5">
          Continue
        </Button>
      </div>
    </div>
  );
}
