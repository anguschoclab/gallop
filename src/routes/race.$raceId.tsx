import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useGame, useGameWithShallow } from "@/game/store";
import { useJockeys } from "@/game/hooks/useSystemsState";
import { shallow } from "zustand/shallow";
import type { GameState, Horse } from "@/game/types";
import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { stepRunner, computePaceContext, type Runner } from "@/game/raceSim";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateClassBonus } from "@/core/common/classBonus";
import {
  buildRaceField,
  rngForRace,
  type RaceSimulationDependencies,
} from "@/services/raceSimulationService";
import { Pause, Play, Camera } from "lucide-react";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { NarrativeGenerator } from "@/services/narrativeService";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";
import { calculateWinProbability, probabilityToMorningLine, formatOdds } from "@/core/odds";
import {
  getTrackBackground,
  getSkyBackground,
  getWeatherDisplay,
  getSpriteUrl,
  isAnimatedSprite,
  getAnimationDuration,
  projectedBeyer,
} from "@/components/races/raceVisualHelpers";
import { BroadcastCommentary } from "@/components/races/BroadcastCommentary";
import { RaceVisualizer } from "@/components/race/RaceVisualizer";
import { useLiveRaceSimulation } from "@/hooks/useLiveRaceSimulation";
import { ResultOverlay } from "@/components/race/ResultOverlay";
import { SilkDot } from "@/components/SilkDot";
import { SectionalTimingTable } from "@/components/SectionalTimingTable";
import { cn } from "@/lib/utils";
import { parTime } from "@/game/beyer";
import { BEYER_BASE } from "@/game/constants/gameConstants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HorseCard } from "@/components/HorseCard";

const SPLIT_LABELS = ["¼", "½", "¾", "Fin"] as const;

function formatSplitTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toFixed(1).padStart(4, "0")}` : `${s.toFixed(1)}s`;
}

function getTargetSplitTime(
  horse: Horse,
  distance: number,
  markerFraction: number,
  calibratedPars: Record<number, number>,
): number | null {
  const qualifying = (horse.raceHistory ?? []).filter(
    (h) => h.beyer != null && h.distance != null && Math.abs(h.distance - distance) <= 200,
  );
  if (qualifying.length < 2) return null;
  const avgBeyer = qualifying.reduce((sum, h) => sum + h.beyer!, 0) / qualifying.length;
  const par = parTime(distance, calibratedPars);
  // Inverse of beyerFigure: finishTime = par * (1 - (beyer - BEYER_BASE) / 500)
  const expectedFinish = par * (1 - (avgBeyer - BEYER_BASE) / 500);
  return expectedFinish * markerFraction;
}

export const Route = createFileRoute("/race/$raceId")({
  component: LiveRace,
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-cream">Race not found</h1>
      <Link
        to="/races"
        search={{ grade: "all", country: "all", surface: "all", track: "all", owned: "all", q: "" }}
        className="text-gold underline"
      >
        Back
      </Link>
    </div>
  ),
});

function LiveRace() {
  const { raceId } = Route.useParams();
  const navigate = useNavigate();
  const race = (useGame as any)(
    (s: GameState) => s.races.find((r: any) => r.id === raceId),
    shallow,
  );
  const horses = (useGame as any)((s: GameState) => s.horses, shallow);
  const jockeys = useGameWithShallow((s: GameState) => s.jockeys ?? []);
  const stables = (useGame as any)((s: GameState) => s.npcStables, shallow);
  const resolveRaceWithImpacts = useGame((s) => s.resolveRaceWithImpacts);

  const [runners] = useState<Runner[]>(() => {
    if (!race) return [];
    const deps: RaceSimulationDependencies = { race, horses, jockeys };
    const { runners: built } = buildRaceField(deps);
    return built;
  });
  const rngRef = useRef(race ? rngForRace(race) : null);

  const narrativeRef = useRef<NarrativeGenerator | null>(null);
  const messageQueue = useRef<CommentaryLine[]>([]);
  const lastMessageTime = useRef<number>(0);

  if (!narrativeRef.current && race) {
    narrativeRef.current = new NarrativeGenerator(race, horses, stables, rngRef.current!);
  }

  const { tick, speed, setSpeed, finished, paused, setPaused, simTime, liveSplits } =
    useLiveRaceSimulation({
      race,
      runners,
      resolveRaceWithImpacts,
      narrativeRef,
      messageQueue,
      rngRef,
    });

  const [sortBy, setSortBy] = useState<"position" | "beyer" | "velocity">("position");
  const [filter, setFilter] = useState<"all" | "owned" | "top5">("all");
  const [minBeyer, setMinBeyer] = useState(0);

  const ownedRunnersTotal = runners.filter((r: any) => r.owned);
  const defaultFollowTarget = ownedRunnersTotal.length > 0 ? ownedRunnersTotal[0].horseId : null;
  const [followTarget, setFollowTarget] = useState<string | null>(defaultFollowTarget);

  const [announcement, setAnnouncement] = useState<string>("");
  const [commentary, setCommentary] = useState<CommentaryLine[]>([]);
  const [subjectHorseId, setSubjectHorseId] = useState<string | null>(null);
  const [hideUntilAllFinished, setHideUntilAllFinished] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);

  // Paced message delivery effect
  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (messageQueue.current.length > 0 && now - lastMessageTime.current > 1500) {
        const next = messageQueue.current.shift()!;
        setCommentary((prev) => [...prev, next].slice(-50));
        setAnnouncement(next.text);
        setSubjectHorseId(next.horseId || null);
        lastMessageTime.current = now;

        // Clear subject highlight after a few seconds
        setTimeout(() => {
          setSubjectHorseId((current) => (current === next.horseId ? null : current));
        }, 3000);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [finished]);

  const lastAnnouncedPosition = useRef<Map<string, number>>(new Map());
  const lastAnnouncementTime = useRef<number>(0);

  const classBonus = race ? calculateClassBonus(race.graded?.grade, race.raceClass) : 0;

  // Calculate odds for each runner
  const runnerOdds = useMemo(() => {
    const oddsMap = new Map<string, string>();
    for (const runner of runners) {
      const horse = horses.find((h: Horse) => h.id === runner.horseId);
      if (horse) {
        const probability = calculateWinProbability(
          horse.stats.speed,
          horse.stats.stamina,
          horse.stats.acceleration,
          horse.form,
          classBonus,
        );
        const morningLine = probabilityToMorningLine(probability);
        oddsMap.set(runner.horseId, formatOdds(morningLine));
      }
    }
    return oddsMap;
  }, [runners, horses, classBonus]);

  // Keyboard controls effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !finished) {
        e.preventDefault();
        setPaused((p) => !p);
      }
      if (!finished && !paused) {
        if (e.key === "1") setSpeed(1);
        if (e.key === "2") setSpeed(2);
        if (e.key === "4") setSpeed(4);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finished, paused, setPaused, setSpeed]);

  // Early return checks after all hooks
  if (!race) throw notFound();

  // If the race is resolved and has snapshots, we can show the replay
  const hasReplay = race.resolved && race.snapshots && race.snapshots.length > 0;
  const allFinished = runners.every((r) => r.finishTime !== null);
  const anyFinished = runners.some((r) => r.finishTime !== null);

  const calibratedPars = (useGame as any)((s: GameState) => s.calibratedPars, shallow);

  const rows = runners.map((r) => ({
    r,
    beyer: projectedBeyer(r, race.distance, simTime, classBonus, calibratedPars),
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
    <div className="broadcast min-h-screen text-white bg-broadcast-track">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: skyBg
            ? `${skyBg}, linear-gradient(to bottom, var(--broadcast-sky-overlay), transparent)`
            : undefined,
          backgroundSize: "auto 200px, 100% 100%",
          backgroundRepeat: "repeat-x, no-repeat",
          backgroundPosition: "top, top",
          zIndex: 0,
        }}
      />

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="relative z-10 p-4 flex items-center justify-between border-b border-white/10 bg-broadcast-marquee backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold text-cream">{race.name}</h1>
          <p className="text-xs text-muted-foreground tabular-nums">
            {race.distance}m · {race.raceClass} · Purse ${race.purse.toLocaleString()}
            {race.weather && ` · ${getWeatherDisplay(race.weather)}`}
            {race.trackCondition && ` · Track: ${race.trackCondition}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!finished && (
            <Select
              value={followTarget || "leader"}
              onValueChange={(v) => setFollowTarget(v === "leader" ? null : v)}
            >
              <SelectTrigger className="h-8 w-40 text-xs bg-muted border-border text-foreground">
                <Camera className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leader">Follow Leader</SelectItem>
                {runners.map((r, i) => (
                  <SelectItem key={r.horseId} value={r.horseId}>
                    {r.owned ? "⭐ " : ""}
                    {i + 1}. {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAllCards(true)}
            title="Show all horse stat cards"
          >
            Cards
          </Button>

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
              <Button
                size="sm"
                variant={speed === 1 ? "secondary" : "ghost"}
                onClick={() => setSpeed(1)}
                title="Press 1"
              >
                1x
              </Button>
              <Button
                size="sm"
                variant={speed === 2 ? "secondary" : "ghost"}
                onClick={() => setSpeed(2)}
                title="Press 2"
              >
                2x
              </Button>
              <Button
                size="sm"
                variant={speed === 4 ? "secondary" : "ghost"}
                onClick={() => setSpeed(4)}
                title="Press 4"
              >
                4x
              </Button>
            </>
          )}

          {anyFinished && !allFinished && (
            <Button
              size="sm"
              variant={hideUntilAllFinished ? "secondary" : "ghost"}
              onClick={() => setHideUntilAllFinished((v) => !v)}
              title="Hide results until all horses finish"
            >
              {hideUntilAllFinished ? "Revealing…" : "Hide Results"}
            </Button>
          )}

          {finished && (
            <Button
              size="sm"
              onClick={() =>
                navigate({
                  to: "/races",
                  search: {
                    grade: "all",
                    country: "all",
                    surface: "all",
                    track: "all",
                    owned: "all",
                    q: "",
                  },
                })
              }
            >
              Back to races
            </Button>
          )}
        </div>
      </div>

      <div className="relative z-10 p-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div>
          <Tabs defaultValue="visualizer" className="w-full">
            <TabsList className="bg-broadcast-marquee border border-white/10 p-1 mb-4">
              <TabsTrigger
                value="visualizer"
                className="text-[10px] font-black uppercase tracking-widest px-4 h-8 data-[state=active]:bg-broadcast-accent data-[state=active]:text-black"
              >
                Replay
              </TabsTrigger>
              <TabsTrigger
                value="splits"
                className="text-[10px] font-black uppercase tracking-widest px-4 h-8 data-[state=active]:bg-broadcast-accent data-[state=active]:text-black"
              >
                Splits
              </TabsTrigger>
              {race.resolved && race.sectionalSplits && race.sectionalSplits.length > 0 && (
                <TabsTrigger
                  value="sectionals"
                  className="text-[10px] font-black uppercase tracking-widest px-4 h-8 data-[state=active]:bg-broadcast-accent data-[state=active]:text-black"
                >
                  Sectionals
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="visualizer" className="mt-0 focus-visible:outline-none">
              {hasReplay ? (
                <RaceVisualizer
                  snapshots={race.snapshots!}
                  distance={race.distance}
                  runners={runners.map((r) => ({
                    horseId: r.horseId,
                    name: r.name,
                    silk: r.silk,
                    owned: r.owned,
                  }))}
                  trackType={race.surface}
                />
              ) : (
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
              )}
              <BroadcastCommentary commentary={commentary} />
            </TabsContent>

            {race.resolved && race.sectionalSplits && race.sectionalSplits.length > 0 && (
              <TabsContent value="sectionals" className="mt-0 focus-visible:outline-none">
                <div className="border border-white/10 bg-black/20 p-6 rounded-lg">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-3">
                    <span className="h-1 w-12 bg-broadcast-accent" />
                    Sectional Analysis
                  </h3>
                  <SectionalTimingTable
                    splits={race.sectionalSplits}
                    runners={runners.map((r) => ({
                      horseId: r.horseId,
                      name: r.name,
                      silk: r.silk,
                      owned: r.owned,
                    }))}
                    distance={race.distance}
                  />
                </div>
              </TabsContent>
            )}

            <TabsContent value="splits" className="mt-0 focus-visible:outline-none">
              <div className="border border-white/10 bg-black/20 p-4 rounded-lg overflow-x-auto">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-3">
                  <span className="h-1 w-12 bg-broadcast-accent" />
                  Live Splits
                </h3>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-cream/30 uppercase tracking-widest text-[9px]">
                      <th className="text-left pb-2 pr-3">Horse</th>
                      {SPLIT_LABELS.map((label) => (
                        <th key={label} className="text-right pb-2 px-2">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {runners.map((r) => {
                      const horse = horses.find((h: Horse) => h.id === r.horseId);
                      const crossings = liveSplits.get(r.horseId) ?? [];
                      const markerFractions = [0.25, 0.5, 0.75, 1.0];
                      return (
                        <tr key={r.horseId} className="hover:bg-white/[0.02]">
                          <td
                            className={cn(
                              "py-2 pr-3 font-bold truncate max-w-[120px]",
                              r.owned ? "text-success" : "text-cream/80",
                            )}
                          >
                            {r.name}
                          </td>
                          {markerFractions.map((frac, mi) => {
                            const elapsed = crossings[mi];
                            const target = horse
                              ? getTargetSplitTime(horse, race.distance, frac, calibratedPars ?? {})
                              : null;
                            if (elapsed == null) {
                              return (
                                <td key={mi} className="text-right px-2 py-2 text-cream/20">
                                  —
                                </td>
                              );
                            }
                            const delta = target != null ? elapsed - target : null;
                            return (
                              <td key={mi} className="text-right px-2 py-2 tabular-nums">
                                <div className="text-cream/80">{formatSplitTime(elapsed)}</div>
                                {delta != null && (
                                  <div
                                    className={cn(
                                      "text-[9px]",
                                      delta < 0 ? "text-green-400" : "text-red-400",
                                    )}
                                  >
                                    {delta < 0 ? "" : "+"}
                                    {delta.toFixed(2)}s
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="bg-broadcast-marquee rounded-lg p-3 space-y-3 backdrop-blur-md border border-white/5">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Live order</p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="h-8 text-xs bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="position">Position</SelectItem>
                  <SelectItem value="beyer">Proj. Beyer</SelectItem>
                  <SelectItem value="velocity">Velocity</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <SelectTrigger className="h-8 text-xs bg-muted border-border text-foreground">
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
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground flex justify-between items-center mb-1">
                <span>
                  Min <JargonTooltip term="Beyer">Beyer</JargonTooltip>
                </span>
                <span className="tabular-nums font-bold text-broadcast-accent">{minBeyer}</span>
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
              <div
                key={r.horseId}
                className="flex items-center gap-2 text-sm py-1 border-b border-white/5 last:border-0"
              >
                <span className="w-5 text-muted-foreground tabular-nums">
                  {positionRank.get(r.horseId)}
                </span>
                <div
                  className="h-4 w-4 rounded-full border border-white/40 shadow-sm"
                  style={{ backgroundColor: r.silk }}
                />
                <Link
                  to="/stable/$horseId"
                  params={{ horseId: r.horseId }}
                  className={`flex-1 truncate hover:underline ${r.owned ? "font-bold text-broadcast-accent" : ""}`}
                >
                  {r.name}
                </Link>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground tabular-nums font-bold">
                  {runnerOdds.get(r.horseId) ?? "N/A"}
                </span>
                {beyer !== null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-broadcast-accent/20 text-broadcast-accent tabular-nums font-bold">
                    {beyer}
                  </span>
                )}
                {r.finishTime !== null && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {r.finishTime.toFixed(1)}s
                  </span>
                )}
              </div>
            ))}
            {sorted.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">
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
          hideResults={hideUntilAllFinished}
          onClose={() =>
            navigate({
              to: "/races",
              search: {
                grade: "all",
                country: "all",
                surface: "all",
                track: "all",
                owned: "all",
                q: "",
              },
            })
          }
        />
      )}

      <Dialog open={showAllCards} onOpenChange={setShowAllCards}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-cream font-black uppercase tracking-widest text-sm">
              Field — {race.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {runners.map((r) => {
              const horse = horses.find((h: Horse) => h.id === r.horseId);
              if (!horse) return null;
              return <HorseCard key={r.horseId} horse={horse} variant="compact" />;
            })}
          </div>
        </DialogContent>
      </Dialog>
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
  weather?: any;
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
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animationDuration = getAnimationDuration(runner.velocity);

  if (isAnimated && spriteUrl) {
    return (
      <div
        className={`horse-sprite ${isRunning && !prefersReducedMotion ? "horse-sprite-animated" : ""}`}
        style={{
          backgroundImage: `url(${spriteUrl})`,
          animationDuration: isRunning ? animationDuration : "0.6s",
        }}
      />
    );
  }

  if (spriteUrl) {
    return (
      <div
        className={`horse-sprite horse-sprite-static ${isRunning && !prefersReducedMotion ? "horse-sprite-bob" : ""}`}
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
        animation:
          isRunning && !prefersReducedMotion ? "pulse 0.5s ease-in-out infinite" : undefined,
      }}
    />
  );
}
