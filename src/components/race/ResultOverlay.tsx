import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { Runner } from "@/game/raceSim";
import { formatCurrency } from "@/lib/formatting";
import { Trophy, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the ResultOverlay component.
 */
interface ResultOverlayProps {
  /** The race metadata (name, purse). */
  race: { name: string; purse: number };
  /** List of runners with their finish times and details. */
  runners: Runner[];
  /** Callback to close the overlay. */
  onClose: () => void;
}

/**
 * Generate jockey feedback based on race performance.
 */
function generateJockeyFeedback(runner: Runner, position: number, ordered: Runner[]): string {
  const winner = ordered[0];
  const timeDiff =
    runner.finishTime && winner.finishTime ? runner.finishTime - winner.finishTime : 0;

  if (position === 1) {
    return "Perfect ride! Jockey executed the race plan flawlessly.";
  } else if (position <= 3) {
    if (timeDiff < 0.5) {
      return "Strong finish. Just missed the win but showed great heart.";
    } else {
      return "Good effort. Jockey kept the horse competitive throughout.";
    }
  } else if (timeDiff > 2) {
    return "Difficult race. Horse may have struggled with the pace or traffic.";
  } else {
    return "Mid-pack finish. Jockey managed the race well given the circumstances.";
  }
}

/**
 * Component to display the final race results in a modal overlay.
 * Redesigned for the "Stable Ledger" aesthetic.
 */
export function ResultOverlay({ race, runners, onClose }: ResultOverlayProps) {
  const PRIZE_SPLIT = [0.6, 0.25, 0.1, 0.05];
  const ordered = [...runners].sort((a, b) => (a.finishTime ?? 999) - (b.finishTime ?? 999));

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-slate-900 border-2 border-gold/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-black/40 border-b border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase text-gold/40 tracking-[0.3em]">
              Official_Resolution
            </div>
            <h2 className="text-2xl font-black text-cream uppercase tracking-tight font-[family-name:var(--font-display)]">
              {race.name}
            </h2>
          </div>
          <Trophy className="h-8 w-8 text-gold opacity-20" />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          <div className="grid grid-cols-12 px-4 py-2 border-b border-white/5 font-mono text-[9px] uppercase font-black text-cream/20 tracking-widest">
            <div className="col-span-1">P</div>
            <div className="col-span-6">Horse / Jockey</div>
            <div className="col-span-2 text-right">Time</div>
            <div className="col-span-3 text-right">Earnings</div>
          </div>

          <div className="divide-y divide-white/5">
            {ordered.map((r, i) => {
              const prize = i < PRIZE_SPLIT.length ? Math.round(race.purse * PRIZE_SPLIT[i]) : 0;
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

                    <div className="col-span-6 space-y-1 min-w-0">
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
                      <Link
                        to="/jockey/$jockeyId"
                        params={{ jockeyId: r.jockeyId }}
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
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 bg-black/40 border-t border-white/5">
          <Button
            onClick={onClose}
            className="w-full h-12 bg-gold hover:bg-gold-bright text-slate-950 font-black uppercase tracking-widest text-xs rounded-none shadow-lg"
          >
            DISMISS_RECORDS
          </Button>
        </div>
      </div>
    </div>
  );
}
