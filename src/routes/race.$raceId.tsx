import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSkyBackground } from "@/components/race/raceVisualHelpers";
import { BroadcastCommentary } from "@/components/race/BroadcastCommentary";
import { RaceVisualizer } from "@/components/race/RaceVisualizer";
import { useLiveRaceSimulation } from "@/hooks/race/useLiveRaceSimulation";
import { ResultOverlay } from "@/components/race/ResultOverlay";
import { SectionalTimingTable } from "@/components/race/SectionalTimingTable";
import { PaceGraph } from "@/components/race/PaceGraph";
import { JockeyReportPanel } from "@/components/race/JockeyReportPanel";
import { RaceControlBar } from "@/components/race/RaceControlBar";
import { Track } from "@/components/race/Track";
import { LiveSplitsTable } from "@/components/race/LiveSplitsTable";
import { Leaderboard } from "@/components/race/Leaderboard";
import { RaceFieldDialog } from "@/components/race/RaceFieldDialog";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { useRacePageData } from "@/hooks/race/useRacePageData";
import { useRaceUIState } from "@/hooks/race/useRaceUIState";

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

  const {
    race,
    runners,
    raceWeather,
    resolveRaceWithImpacts,
    narrativeRef,
    messageQueue,
    localHorseMap,
    runnerOdds,
    classBonus,
    calibratedPars,
    rngRef,
  } = useRacePageData(raceId);

  const { tick, speed, setSpeed, finished, paused, setPaused, simTime, liveSplits } =
    useLiveRaceSimulation({
      race,
      runners,
      resolveRaceWithImpacts,
      narrativeRef,
      messageQueue,
      rngRef,
    });

  const {
    announcement,
    commentary,
    subjectHorseId,
    followTarget,
    setFollowTarget,
    hideUntilAllFinished,
    setHideUntilAllFinished,
    showAllCards,
    setShowAllCards,
    sorted,
    positionRank,
    filter,
    sortBy,
    minBeyer,
    setFilter,
    setSortBy,
    setMinBeyer,
  } = useRaceUIState(runners, race, messageQueue, finished, classBonus, calibratedPars);

  const allFinished = runners.every((r) => r.finishTime !== null);
  const anyFinished = runners.some((r) => r.finishTime !== null);

  // Keyboard controls effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !finished) {
        e.preventDefault();
        setPaused((p: boolean) => !p);
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

  if (!race) throw notFound();

  const hasReplay = race.resolved && race.snapshots && race.snapshots.length > 0;

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
        onToggleHideResults={() => setHideUntilAllFinished((v: boolean) => !v)}
        onShowAllCards={() => setShowAllCards(true)}
      />

      <div className="absolute top-2 right-2 z-30">
        <BookmarkButton
          type="race"
          id={race.id}
          label={race.name}
          subtitle={`${race.graded ? "Graded" : "Race"} · ${race.surface ?? ""}`.trim()}
        />
      </div>

      {/* Weather Forecast Strip */}
      <div className="relative z-10 px-4">
        <WeatherForecastStrip trackId={race.trackId} trackCondition={race.trackCondition} />
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
                <div className="border border-white/10 bg-black/20 p-6 rounded-lg space-y-8">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-3">
                      <span className="h-1 w-12 bg-broadcast-accent" />
                      Pace / Position Graph
                    </h3>
                    <PaceGraph
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
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-3">
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

      <RaceFieldDialog
        open={showAllCards}
        onOpenChange={setShowAllCards}
        raceName={race.name}
        runners={runners}
        localHorseMap={localHorseMap}
      />
    </div>
  );
}
