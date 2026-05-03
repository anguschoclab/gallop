import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildRunner, stepRunner, type Runner } from "@/game/raceSim";
import { generateHorse } from "@/game/horseGen";
import type { Horse } from "@/game/types";
import { SilkBadge } from "@/components/HorseBits";
import { beyerFigure } from "@/game/beyer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      <Link to="/races" className="text-primary underline">Back</Link>
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
        <Link to="/races"><Button className="mt-4">Back to races</Button></Link>
      </div>
    );
  }

  // Build full field: owner entries + AI fillers
  const [runners] = useState<Runner[]>(() => {
    const built: Runner[] = [];
    for (const e of race.entries) {
      const h = horses.find((hh) => hh.id === e.horseId);
      if (h) built.push(buildRunner(h, true));
    }
    while (built.length < race.fieldSize) {
      // generate AI horse scaled to class
      const tier =
        race.raceClass === "Group" ? "elite" :
        race.raceClass === "Stakes" ? "mid" :
        race.raceClass === "Allowance" ? "mid" : "budget";
      const ai: Horse = generateHorse({ tier: tier as never });
      built.push(buildRunner(ai, false));
    }
    return built;
  });

  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);
  const startRef = useRef<number | null>(null);
  const finishOrderRef = useRef<{ horseId: string; position: number; time: number }[]>([]);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let simTime = 0;

    const loop = (now: number) => {
      const real = (now - last) / 1000;
      last = now;
      const dt = Math.min(0.1, real * speedRef.current);
      simTime += dt;
      let stillRunning = false;
      for (const r of runners) {
        if (r.finishTime === null) {
          stepRunner(r, dt, simTime, race.distance);
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
      setTick((t) => t + 1);
      if (stillRunning) {
        raf = requestAnimationFrame(loop);
      } else {
        setFinished(true);
        // commit results to store (only owned horses needed for store update,
        // but include all for completeness)
        const ownedResults = finishOrderRef.current.filter((r) =>
          horses.some((h) => h.id === r.horseId)
        );
        resolveRace(race.id, ownedResults);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = [...runners]
    .map((r, i) => ({ r, lane: i }))
    .sort((a, b) => b.r.position - a.r.position);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-950 text-white">
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold">{race.name}</h1>
          <p className="text-xs text-white/70">{race.distance}m · {race.raceClass} · Purse ${race.purse.toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          {!finished && (
            <>
              <Button size="sm" variant={speed === 1 ? "secondary" : "ghost"} onClick={() => setSpeed(1)}>1x</Button>
              <Button size="sm" variant={speed === 2 ? "secondary" : "ghost"} onClick={() => setSpeed(2)}>2x</Button>
              <Button size="sm" variant={speed === 4 ? "secondary" : "ghost"} onClick={() => setSpeed(4)}>4x</Button>
            </>
          )}
          {finished && (
            <Button size="sm" onClick={() => navigate({ to: "/races" })}>Back to races</Button>
          )}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
        <div>
          <Track runners={runners} distance={race.distance} tick={tick} />
        </div>
        <div className="bg-black/30 rounded-lg p-3">
          <p className="text-xs uppercase tracking-wide text-white/60 mb-2">Live order</p>
          <div className="space-y-1">
            {sorted.map(({ r }, i) => (
              <div key={r.horseId} className="flex items-center gap-2 text-sm py-1">
                <span className="w-5 text-white/60 tabular-nums">{i + 1}</span>
                <div
                  className="h-5 w-5 rounded-full border border-white/40"
                  style={{ backgroundColor: r.silk }}
                />
                <span className={r.owned ? "font-bold" : ""}>{r.name}</span>
                {r.finishTime !== null && (
                  <span className="ml-auto text-xs text-white/60 tabular-nums">{r.finishTime.toFixed(1)}s</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {finished && <ResultOverlay race={race} runners={runners} onClose={() => navigate({ to: "/races" })} />}
    </div>
  );
}

function Track({ runners, distance, tick }: { runners: Runner[]; distance: number; tick: number }) {
  void tick;
  const laneHeight = 36;
  const trackHeight = runners.length * laneHeight + 20;
  return (
    <div
      className="relative bg-emerald-700 rounded-lg overflow-hidden border border-emerald-600 shadow-inner"
      style={{ height: trackHeight }}
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
              <SilkBadge color={r.silk} num={i + 1} />
              {r.owned && <span className="text-xs font-bold bg-yellow-400 text-black px-1 rounded">YOU</span>}
            </div>
          </div>
        );
      })}
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
