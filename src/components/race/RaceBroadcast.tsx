import { type MutableRefObject, type RefObject } from "react";
import { cn } from "@/lib/cn";
import { getSkyBackground } from "@/components/race/raceVisualHelpers";
import { BroadcastCommentary } from "@/components/race/BroadcastCommentary";
import { RaceVisualizer } from "@/components/race/RaceVisualizer";
import { ResultOverlay } from "@/components/race/ResultOverlay";
import { RaceControlBar } from "@/components/race/RaceControlBar";
import { Track } from "@/components/race/Track";
import { Leaderboard } from "@/components/race/Leaderboard";
import { RaceFieldDialog } from "@/components/race/RaceFieldDialog";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { PostRaceAnalysis } from "@/components/race/PostRaceAnalysis";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Horse, Race } from "@/game/types";
import type { RacePhase } from "@/hooks/race/useRacePhase";

export interface RaceBroadcastProps {
  race: Race;
  runners: Runner[];
  finished: boolean;
  paused: boolean;
  speed: number;
  tick: number;
  phase: RacePhase;
  raceWeather: { tempC: number; windKph: number; windDirectionDeg?: number } | undefined;
  followTarget: string | null;
  anyFinished: boolean;
  allFinished: boolean;
  hideUntilAllFinished: boolean;
  commentary: CommentaryLine[];
  subjectHorseId: string | null;
  sorted: { r: Runner; beyer: number | null }[];
  positionRank: Map<string, number>;
  runnerOdds: Map<string, string>;
  filter: "all" | "owned" | "top5";
  sortBy: "position" | "beyer" | "velocity";
  minBeyer: number;
  onFilterChange: (v: "all" | "owned" | "top5") => void;
  onSortByChange: (v: "position" | "beyer" | "velocity") => void;
  onMinBeyerChange: (v: number) => void;
  onTogglePause: () => void;
  onSetSpeed: (s: number) => void;
  onSetFollowTarget: (id: string | null) => void;
  onToggleHideResults: () => void;
  onShowAllCards: () => void;
  onNavigateBack: () => void;
  localHorseMap: Map<string, Horse>;
  calibratedPars: any;
  liveSplits: Map<string, number[]>;
  analysisOpen: boolean;
  setAnalysisOpen: (v: boolean) => void;
  analysisRef: RefObject<HTMLDivElement | null>;
  showAllCards: boolean;
  setShowAllCards: (v: boolean) => void;
  announcement: string;
  simTimeRef?: MutableRefObject<number>;
}

export function RaceBroadcast({
  race,
  runners,
  finished,
  paused,
  speed,
  tick,
  phase,
  raceWeather,
  followTarget,
  anyFinished,
  allFinished,
  hideUntilAllFinished,
  commentary,
  subjectHorseId,
  sorted,
  positionRank,
  runnerOdds,
  filter,
  sortBy,
  minBeyer,
  onFilterChange,
  onSortByChange,
  onMinBeyerChange,
  onTogglePause,
  onSetSpeed,
  onSetFollowTarget,
  onToggleHideResults,
  onShowAllCards,
  onNavigateBack,
  localHorseMap,
  calibratedPars,
  liveSplits,
  analysisOpen,
  setAnalysisOpen,
  analysisRef,
  showAllCards,
  setShowAllCards,
  announcement,
  simTimeRef,
}: RaceBroadcastProps) {
  const skyBg = getSkyBackground(race.weather);
  const showReplay = phase === "review" && race.resolved && !!race.snapshots?.length;

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
        onNavigateBack={onNavigateBack}
        onTogglePause={onTogglePause}
        onSetSpeed={onSetSpeed}
        onSetFollowTarget={onSetFollowTarget}
        onToggleHideResults={onToggleHideResults}
        onShowAllCards={onShowAllCards}
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
          {showReplay ? (
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
              simTimeRef={simTimeRef}
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
                    className={cn(
                      "h-4 w-4 text-cream-muted transition-transform",
                      analysisOpen && "rotate-180",
                    )}
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
          onFilterChange={onFilterChange}
          onSortByChange={onSortByChange}
          onMinBeyerChange={onMinBeyerChange}
        />
      </div>

      {finished && (
        <ResultOverlay
          race={race}
          runners={runners}
          hideResults={hideUntilAllFinished}
          onClose={onNavigateBack}
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
