import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useLiveRaceSimulation } from "@/hooks/race/useLiveRaceSimulation";
import { RacePreShow } from "@/components/race/RacePreShow";
import { RaceBroadcast } from "@/components/race/RaceBroadcast";
import { useRacePageData } from "@/hooks/race/useRacePageData";
import { useRaceUIState } from "@/hooks/race/useRaceUIState";
import { useRacePhase, type RacePhase } from "@/hooks/race/useRacePhase";
import { useRaceProgress } from "@/hooks/race/useRaceProgress";
import { useStewardsInquiry } from "@/hooks/race/useStewardsInquiry";
import { getCourseForRace } from "@/data/tracks";
import { safeParseJson, raceProgressSchema } from "@/services/storage/schemas";

type DisplayPhase = "preshow" | "broadcast";

function toDisplayPhase(phase: RacePhase): DisplayPhase {
  return phase === "preshow" ? "preshow" : "broadcast";
}

function usePhaseTransition(phase: RacePhase) {
  const displayPhase = toDisplayPhase(phase);
  const [displayedGroup, setDisplayedGroup] = useState<DisplayPhase>(displayPhase);
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (displayPhase === displayedGroup) {
      // Phase reversed back to the currently displayed group mid-transition:
      // cancel the pending swap and clear the exit animation.
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsExiting(false);
      return;
    }

    setIsExiting(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDisplayedGroup(displayPhase);
      setIsExiting(false);
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [displayPhase, displayedGroup]);

  return { displayedPhase: displayedGroup, isExiting };
}

function PhasePanel({
  children,
  isActive,
  isExiting,
  isEntering,
}: {
  children: React.ReactNode;
  isActive: boolean;
  isExiting: boolean;
  isEntering: boolean;
}) {
  if (!isActive && !isExiting && !isEntering) return null;
  const base = "absolute inset-0 transition-all duration-300";
  const active =
    isActive && !isExiting
      ? "opacity-100 translate-y-0"
      : isExiting
        ? "opacity-0 -translate-y-4"
        : "opacity-0 translate-y-4 pointer-events-none";
  return <div className={cn(base, active)}>{children}</div>;
}

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

export function LiveRace() {
  const { raceId } = Route.useParams();
  const navigate = useNavigate();

  const {
    race,
    runners,
    raceWeather,
    resolveRaceWithImpacts: resolveRaceBase,
    narrativeRef,
    messageQueue,
    localHorseMap,
    runnerOdds,
    classBonus,
    calibratedPars,
    rngRef,
  } = useRacePageData(raceId);

  const triggerInquiry = useStewardsInquiry();

  // Wrap resolveRaceWithImpacts so the stewards inquiry hook fires after the
  // store resolves the race, giving the player a post-race inquiry notification.
  const resolveRaceWithImpacts = useCallback(
    (raceId: string, result: { horseId: string; position: number; time: number }[]) => {
      resolveRaceBase(raceId, result);
      if (race) triggerInquiry(race, result);
    },
    [resolveRaceBase, triggerInquiry, race],
  );

  const course = race ? getCourseForRace(race) : undefined;

  const { phase, setPhase } = useRacePhase(!!race?.resolved);
  const { displayedPhase, isExiting } = usePhaseTransition(phase);

  // Read saved sim progress after hydration to avoid SSR mismatch.
  // Default values are used during SSR and first client render; the real
  // values from sessionStorage are applied in a useEffect.
  const progressStorageKey = `race-sim-progress:${raceId}`;
  const [savedProgress, setSavedProgress] = useState<{
    simTime: number;
    paused: boolean;
    speed: number;
  }>({ simTime: 0, paused: false, speed: 1 });

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(progressStorageKey);
      if (!raw) return;
      const p = safeParseJson(raw, raceProgressSchema);
      if (!p) return;
      setSavedProgress(p);
    } catch {
      // noop — keep defaults
    }
  }, [progressStorageKey]);

  const { tick, speed, setSpeed, finished, paused, setPaused, simTime, simTimeRef, liveSplits } =
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
      resumeAtSimTime: phase === "live" ? savedProgress.simTime : 0,
      initialPaused: savedProgress.paused,
      initialSpeed: savedProgress.speed,
    });

  const { analysisOpen, setAnalysisOpen, analysisRef } = useRaceProgress({
    raceId,
    phase,
    finished,
    simTime,
    paused,
    speed,
    tick,
  });

  useEffect(() => {
    if (finished && phase !== "review") setPhase("review");
  }, [finished, phase, setPhase]);

  useEffect(() => {
    if (phase !== "review") return;
    const el = analysisRef.current;
    if (!el) return;
    const trigger = el.querySelector<HTMLButtonElement>('[data-analysis-trigger="true"]');
    const id = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      trigger?.focus({ preventScroll: true });
    }, 400);
    return () => window.clearTimeout(id);
  }, [phase, analysisRef]);

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

  const navigateToRaces = () =>
    navigate({
      to: "/races",
      search: { grade: "all", country: "all", surface: "all", track: "all", owned: "all", q: "" },
    });

  return (
    <div className="broadcast min-h-screen text-white bg-broadcast-track relative">
      <PhasePanel
        isActive={displayedPhase === "preshow"}
        isExiting={isExiting && displayedPhase === "preshow"}
        isEntering={isExiting && toDisplayPhase(phase) === "preshow"}
      >
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
      </PhasePanel>

      <PhasePanel
        isActive={displayedPhase === "broadcast"}
        isExiting={isExiting && displayedPhase === "broadcast"}
        isEntering={isExiting && toDisplayPhase(phase) === "broadcast"}
      >
        <RaceBroadcast
          race={race}
          runners={runners}
          finished={finished}
          paused={paused}
          speed={speed}
          tick={tick}
          phase={phase}
          raceWeather={raceWeather}
          followTarget={followTarget}
          anyFinished={anyFinished}
          allFinished={allFinished}
          hideUntilAllFinished={hideUntilAllFinished}
          commentary={commentary}
          subjectHorseId={subjectHorseId}
          sorted={sorted}
          positionRank={positionRank}
          runnerOdds={runnerOdds}
          filter={filter}
          sortBy={sortBy}
          minBeyer={minBeyer}
          onFilterChange={setFilter}
          onSortByChange={setSortBy}
          onMinBeyerChange={setMinBeyer}
          onTogglePause={() => setPaused((p) => !p)}
          onSetSpeed={setSpeed}
          onSetFollowTarget={setFollowTarget}
          onToggleHideResults={() => setHideUntilAllFinished((v: boolean) => !v)}
          onShowAllCards={() => setShowAllCards(true)}
          onNavigateBack={navigateToRaces}
          localHorseMap={localHorseMap}
          calibratedPars={calibratedPars}
          liveSplits={liveSplits}
          analysisOpen={analysisOpen}
          setAnalysisOpen={setAnalysisOpen}
          analysisRef={analysisRef}
          showAllCards={showAllCards}
          setShowAllCards={setShowAllCards}
          announcement={announcement}
          simTimeRef={simTimeRef}
        />
      </PhasePanel>
    </div>
  );
}
