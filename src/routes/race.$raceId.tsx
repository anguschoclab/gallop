import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getSkyBackground } from "@/components/race/raceVisualHelpers";
import { BroadcastCommentary } from "@/components/race/BroadcastCommentary";
import { RaceVisualizer } from "@/components/race/RaceVisualizer";
import { useLiveRaceSimulation } from "@/hooks/race/useLiveRaceSimulation";
import { ResultOverlay } from "@/components/race/ResultOverlay";
import { RaceControlBar } from "@/components/race/RaceControlBar";
import { Track } from "@/components/race/Track";
import { Leaderboard } from "@/components/race/Leaderboard";
import { RaceFieldDialog } from "@/components/race/RaceFieldDialog";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { RacePreShow } from "@/components/race/RacePreShow";
import { PostRaceAnalysis } from "@/components/race/PostRaceAnalysis";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useRacePageData } from "@/hooks/race/useRacePageData";
import { useRaceUIState } from "@/hooks/race/useRaceUIState";
import { useRacePhase } from "@/hooks/race/useRacePhase";
import { getCourseForRace } from "@/data/tracks";

type RaceSearch = { phase?: "preshow" | "live" | "review" };

export const Route = createFileRoute("/race/$raceId")({
  validateSearch: (raw: Record<string, unknown>): RaceSearch => {
    const v = raw?.phase;
    return v === "preshow" || v === "live" || v === "review" ? { phase: v } : {};
  },
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

  const course = race ? getCourseForRace(race) : undefined;

  // Three-act broadcast: preshow → live → review. Persisted in the URL via
  // ?phase=… so refresh / share preserves the exact view.
  const { phase, setPhase } = useRacePhase(!!race?.resolved);

  // Per-race expand/collapse memory for the post-race analysis reveal.
  const analysisStorageKey = `race-analysis-open:${raceId}`;
  const [analysisOpen, setAnalysisOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(analysisStorageKey) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(analysisStorageKey, analysisOpen ? "1" : "0");
    } catch {
      /* ignore quota errors */
    }
  }, [analysisOpen, analysisStorageKey]);

  const analysisRef = useRef<HTMLDivElement | null>(null);

  const { tick, speed, setSpeed, finished, paused, setPaused, liveSplits } =
    useLiveRaceSimulation({
      race,
      runners,
      resolveRaceWithImpacts,
      narrativeRef,
      messageQueue,
      rngRef,
      course,
      windKph: raceWeather?.windKph,
      windDirectionDeg: raceWeather?.windDirectionDeg,
      running: phase === "live",
    });

  // Advance to review when the run finishes.
  useEffect(() => {
    if (finished && phase !== "review") setPhase("review");
  }, [finished, phase, setPhase]);

  // After the finish overlay appears, scroll the analysis section into view
  // and move focus to its toggle so keyboard users land there next.
  useEffect(() => {
    if (phase !== "review") return;
    const el = analysisRef.current;
    if (!el) return;
    const trigger = el.querySelector<HTMLButtonElement>('[data-analysis-trigger="true"]');
    // Defer until after the ResultOverlay paints.
    const id = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      trigger?.focus({ preventScroll: true });
    }, 400);
    return () => window.clearTimeout(id);
  }, [phase]);

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

  // Pre-race build-up: gated until the player presses Start Race.
  if (phase === "preshow") {
    return (
      <RacePreShow
        race={race}
        runners={runners.map((r) => ({
          horseId: r.horseId,
          name: r.name,
          silk: r.silk,
          owned: r.owned,
        }))}
        runnerOdds={runnerOdds}
        onStart={() => setPhase("live")}
      />
    );
  }

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

      <div className="relative z-10 px-4">
        <WeatherForecastStrip trackId={race.trackId} trackCondition={race.trackCondition} />
      </div>

      <div className="relative z-10 p-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-4">
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

          {phase === "review" && (
            <div ref={analysisRef}>
              <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
                <CollapsibleTrigger
                  data-analysis-trigger="true"
                  className="w-full flex items-center justify-between border border-white/10 bg-black/30 hover:bg-black/40 transition-colors px-4 py-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-broadcast-accent"
                >
                  <span className="text-xs font-black uppercase tracking-widest text-cream">
                    Post-race analysis
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-cream-muted transition-transform ${
                      analysisOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <PostRaceAnalysis
                    race={race}
                    runners={runners}
                    liveSplits={liveSplits}
                    localHorseMap={localHorseMap}
                    calibratedPars={calibratedPars}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
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
