import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useGame, useGameWithShallow } from "@/game/store";
import { useJockeys } from "@/hooks/game/useSystemsState";
import { shallow } from "zustand/shallow";
import type { GameState, Horse } from "@/game/types";
import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { stepRunner, computePaceContext } from "@/core/race/engine/simulation";
import type { Runner } from "@/core/race/engine/runnerBuilder";
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
import { Pause, Play, Camera, Thermometer, Wind } from "lucide-react";
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
} from "@/components/race/raceVisualHelpers";
import { BroadcastCommentary } from "@/components/race/BroadcastCommentary";
import { RaceVisualizer } from "@/components/race/RaceVisualizer";
import { useLiveRaceSimulation } from "@/hooks/useLiveRaceSimulation";
import { ResultOverlay } from "@/components/race/ResultOverlay";
import { SectionalTimingTable } from "@/components/race/SectionalTimingTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HorseCard } from "@/components/horse/HorseCard";
import { RaceControlBar } from "@/components/race/RaceControlBar";
import { Track } from "@/components/race/Track";
import { LiveSplitsTable } from "@/components/race/LiveSplitsTable";
import { Leaderboard } from "@/components/race/Leaderboard";

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
  const raceWeather = (useGame as any)((s: any) => {
    if (!race) return undefined;
    const trackId = race.graded?.trackId ?? race.trackId;
    if (!trackId) return undefined;
    const buf = s.weather?.byTrack?.[trackId];
    if (!buf || !buf.length) return undefined;
    return buf.find((w: any) => w.day === race.day) ?? buf[buf.length - 1];
  }, shallow);

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

  // Pre-calculate hash map for O(1) horse lookups instead of running O(N) .find() inside loops.
  const localHorseMap = useMemo(() => new Map<string, Horse>(horses.map((h: Horse) => [h.id, h])), [horses]);

  // Calculate odds for each runner
  const runnerOdds = useMemo(() => {
    const oddsMap = new Map<string, string>();
    for (const runner of runners) {
      const horse = localHorseMap.get(runner.horseId);
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
  }, [runners, localHorseMap, classBonus]);

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

      <RaceControlBar
        race={race}
        runners={runners}
        finished={finished}
        paused={paused}
        speed={speed}
        followTarget={followTarget}
        anyFinished={anyFinished}
        allFinished={allFinished}
        hideUntilAllFinished={hideUntilAllFinished}
        raceWeather={raceWeather}
        onNavigateBack={() =>
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
        onTogglePause={() => setPaused((p) => !p)}
        onSetSpeed={setSpeed}
        onSetFollowTarget={setFollowTarget}
        onToggleHideResults={() => setHideUntilAllFinished((v) => !v)}
        onShowAllCards={() => setShowAllCards(true)}
      />

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
              <LiveSplitsTable
                runners={runners}
                distance={race.distance}
                liveSplits={liveSplits}
                localHorseMap={localHorseMap}
                calibratedPars={calibratedPars}
              />
            </TabsContent>
          </Tabs>
        </div>
        <Leaderboard
          sorted={sorted}
          positionRank={positionRank}
          runnerOdds={runnerOdds}
          filter={filter}
          sortBy={sortBy}
          minBeyer={minBeyer}
          onFilterChange={setFilter}
          onSortByChange={setSortBy}
          onMinBeyerChange={setMinBeyer}
        />
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
              const horse = localHorseMap.get(r.horseId);
              if (!horse) return null;
              return <HorseCard key={r.horseId} horse={horse} variant="compact" />;
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

