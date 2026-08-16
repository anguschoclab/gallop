import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PaceGraph } from "@/components/race/PaceGraph";
import { SpeedBreakdownChart } from "@/components/race/SpeedBreakdownChart";
import { JockeyReportPanel } from "@/components/race/JockeyReportPanel";
import { RunnerMoodFace } from "@/components/race/RunnerMoodFace";
import {
  TacticalAnalysisPanel,
  type JockeyInsightEntry,
} from "@/components/race/TacticalAnalysisPanel";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { RaceRunner, SectionalSplit } from "@/core/race/types";
import { generateJockeyFeedback } from "@/core/race/jockeyFeedback";
import { formatCurrency } from "@/core/common/formatting";
import {
  PRIZE_SPLIT,
  GRADED_PRIZE_SPLIT,
  MOOD_FACE_RESULT_OVERLAY_SIZE,
  MOOD_TOOLTIP_OVERLAY_CLASS,
} from "@/constants";
import { Trophy, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { compareFinishOrder } from "@/core/race/engine/compareFinishOrder";
import { useGame } from "@/game/store";
import { getStrategyInsights } from "@/core/ai/jockeyStrategyAI";

/**
 * Props for the ResultOverlay component.
 */
interface ResultOverlayProps {
  /** The race metadata (name, purse, optional sectionals/distance). */
  race: {
    name: string;
    purse: number;
    graded?: unknown;
    sectionalSplits?: SectionalSplit[];
    distance?: number;
    snapshots?: RaceSnapshot[];
  };
  /** List of runners with their finish times and details. */
  runners: Runner[];
  /** Callback to close the overlay. */
  onClose: () => void;
  /** When true, hides finish order until all runners have crossed the line. */
  hideResults?: boolean;
}

/**
 * Component to display the final race results in a modal overlay.
 * Redesigned for the "Stable Ledger" aesthetic.
 */
export function ResultOverlay({ race, runners, onClose, hideResults }: ResultOverlayProps) {
  const prizeSplit = race.graded ? GRADED_PRIZE_SPLIT : PRIZE_SPLIT;
  const ordered = [...runners].sort(compareFinishOrder);
  const finishedCount = runners.filter((r) => r.finishTime !== null).length;
  const allFinished = finishedCount === runners.length;
  const showWaiting = hideResults && !allFinished;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-slate-900 border-2 border-gold/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-black/40 border-b border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase text-gold/40 tracking-[0.3em]">
              Official Resolution
            </div>
            <h2 className="text-2xl font-black text-cream uppercase tracking-tight font-[family-name:var(--font-display)]">
              {race.name}
            </h2>
          </div>
          <Trophy className="h-8 w-8 text-gold opacity-20" />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {showWaiting ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold/40">
                Awaiting Runners
              </div>
              <div className="text-4xl font-black text-cream tabular-nums">
                {finishedCount} / {runners.length}
              </div>
              <div className="text-xs text-cream/40 font-mono uppercase tracking-widest">
                horses finished
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 px-4 py-2 border-b border-white/5 font-mono text-[9px] uppercase font-black text-cream/20 tracking-widest">
                <div className="col-span-1">P</div>
                <div className="col-span-1">Gate</div>
                <div className="col-span-5">Horse / Jockey</div>
                <div className="col-span-2 text-right">Time</div>
                <div className="col-span-3 text-right">Earnings</div>
              </div>

              <div className="divide-y divide-white/5">
                {ordered.map((r, i) => {
                  const prize = i < prizeSplit.length ? Math.round(race.purse * prizeSplit[i]) : 0;
                  const feedback = r.owned ? generateJockeyFeedback(r, i + 1, ordered) : null;

                  return (
                    <div
                      key={r.horseId}
                      className="group py-4 px-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="grid grid-cols-12 items-center gap-4">
                        <div className="col-span-1">
                          <span
                            className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center font-mono font-black text-[10px] tabular-nums",
                              i === 0
                                ? "bg-fame text-slate-950 shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                                : "bg-black/40 text-cream/40",
                            )}
                          >
                            {i + 1}
                          </span>
                        </div>

                        <div className="col-span-1">
                          <span className="font-mono text-[10px] text-cream/30 tabular-nums">
                            {typeof r.gate === "number" ? `G${r.gate}` : "—"}
                          </span>
                        </div>

                        <div className="col-span-5 space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {r.finalMood && (
                              <RunnerMoodFace
                                mood={r.finalMood}
                                horseName={r.name}
                                size={MOOD_FACE_RESULT_OVERLAY_SIZE}
                                tooltipClassName={MOOD_TOOLTIP_OVERLAY_CLASS}
                              />
                            )}
                            <Link
                              to="/stable/$horseId"
                              params={{ horseId: r.horseId }}
                              className={cn(
                                "block font-bold uppercase tracking-tight truncate hover:text-gold transition-colors",
                                r.owned ? "text-success" : "text-cream/80",
                              )}
                            >
                              {r.name}
                            </Link>
                          </div>
                          <Link
                            to="/jockey/$jockeyId"
                            params={{ jockeyId: r.jockey?.id || "" }}
                            className="text-[9px] font-mono text-cream/40 uppercase tracking-tighter hover:text-blue-400 transition-colors flex items-center gap-1"
                          >
                            Rider: {r.jockeyName} <ChevronRight className="h-2 w-2" />
                          </Link>
                        </div>

                        <div className="col-span-2 text-right">
                          <span className="font-mono text-xs text-cream/20 tabular-nums">
                            {r.finishTime?.toFixed(2)}s
                          </span>
                        </div>

                        <div className="col-span-3 text-right">
                          {prize > 0 && (
                            <span
                              className={cn(
                                "font-mono font-black text-sm tabular-nums tracking-tighter",
                                r.owned
                                  ? "text-success shadow-[0_0_8px_rgba(34,197,94,0.2)]"
                                  : "text-cream/20",
                              )}
                            >
                              {formatCurrency(prize)}
                            </span>
                          )}
                        </div>
                      </div>

                      {feedback && (
                        <div className="mt-3 ml-10 p-2 bg-blue-500/5 border border-blue-500/10 text-[10px] text-blue-400/80 font-mono italic leading-relaxed uppercase tracking-tight">
                          <span className="font-black not-italic text-blue-400 mr-2">LOG:</span>{" "}
                          {feedback}
                        </div>
                      )}

                      {r.distanceMod !== undefined && r.distanceStaminaMul !== undefined && (
                        <Collapsible className="mt-2 ml-10">
                          <CollapsibleTrigger className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-gold/40 hover:text-gold transition-colors">
                            <ChevronDown className="h-2.5 w-2.5" />
                            Distance Scaling
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 p-3 bg-black/30 border border-white/5 grid grid-cols-3 gap-x-4 gap-y-2 text-[9px] font-mono">
                              <div>
                                <span className="text-cream/20 uppercase">Pref:</span>{" "}
                                <span className="text-cream/60 tabular-nums">
                                  {r.preferredDistance}m
                                </span>
                              </div>
                              <div>
                                <span className="text-cream/20 uppercase">Race:</span>{" "}
                                <span className="text-cream/60 tabular-nums">{race.distance}m</span>
                              </div>
                              <div>
                                <span className="text-cream/20 uppercase">Ratio:</span>{" "}
                                <span className="text-cream/60 tabular-nums">
                                  {r.distanceRatio?.toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-cream/20 uppercase">Dev:</span>{" "}
                                <span className="text-cream/60 tabular-nums">
                                  {r.distanceDeviation?.toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-cream/20 uppercase">Spd Mod:</span>{" "}
                                <span
                                  className={cn(
                                    "tabular-nums font-bold",
                                    r.distanceMod < 1 ? "text-red-400/70" : "text-cream/60",
                                  )}
                                >
                                  ×{r.distanceMod.toFixed(3)}
                                </span>
                              </div>
                              <div>
                                <span className="text-cream/20 uppercase">Sta Mul:</span>{" "}
                                <span
                                  className={cn(
                                    "tabular-nums font-bold",
                                    r.distanceStaminaMul > 1
                                      ? "text-amber-400/70"
                                      : "text-cream/60",
                                  )}
                                >
                                  ×{r.distanceStaminaMul.toFixed(3)}
                                </span>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {r.finalMood && (
                        <Collapsible className="mt-2 ml-10">
                          <CollapsibleTrigger className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-gold/40 hover:text-gold transition-colors">
                            <ChevronDown className="h-2.5 w-2.5" />
                            Mood Breakdown
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 p-3 bg-black/30 border border-white/5 space-y-2">
                              <div className="text-[10px] font-black uppercase tracking-wide text-cream/60">
                                {r.finalMood.label} · {r.finalMood.score}/100
                              </div>
                              <ul className="space-y-1">
                                {r.finalMood.signals.map((s) => (
                                  <li
                                    key={s.label}
                                    className="text-[10px] text-cream/50 leading-relaxed"
                                  >
                                    {s.label}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  );
                })}
              </div>

              {race.sectionalSplits && race.sectionalSplits.length > 0 && (
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="text-[10px] font-black uppercase text-gold/40 tracking-[0.3em]">
                    Pace / Position Graph
                  </div>
                  <PaceGraph
                    splits={race.sectionalSplits}
                    runners={ordered.map((r) => ({
                      horseId: r.horseId,
                      name: r.name,
                      silk: r.silk,
                      owned: r.owned,
                    }))}
                    distance={race.distance}
                  />
                  {race.snapshots && race.snapshots.length > 0 && (
                    <SpeedBreakdownChart
                      snapshots={race.snapshots}
                      runners={ordered.map((r) => ({
                        horseId: r.horseId,
                        name: r.name,
                        silk: r.silk,
                        owned: r.owned,
                      }))}
                      distance={race.distance ?? 0}
                    />
                  )}
                </div>
              )}

              {ordered.some((r) => r.owned && r.finishTime !== null) && (
                <div className="pt-4 border-t border-white/5">
                  <JockeyReportPanel
                    runners={ordered}
                    ordered={ordered}
                    sectionalSplits={race.sectionalSplits}
                  />
                </div>
              )}

              {hasTacticalData && (
                <div className="pt-4 border-t border-white/5">
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger className="flex items-center gap-1 text-[10px] font-black uppercase text-cyan-400/60 tracking-[0.2em] hover:text-cyan-400 transition-colors">
                      <ChevronDown className="h-3 w-3" />
                      Tactical Analysis
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3">
                        <TacticalAnalysisPanel
                          runners={tacticalRunners}
                          insights={jockeyInsights.length > 0 ? jockeyInsights : undefined}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 bg-black/40 border-t border-white/5">
          <Button
            onClick={onClose}
            className="w-full h-12 bg-gold hover:bg-gold-bright text-slate-950 font-black uppercase tracking-widest text-xs rounded-none shadow-lg"
          >
            Dismiss Records
          </Button>
        </div>
      </div>
    </div>
  );
}
