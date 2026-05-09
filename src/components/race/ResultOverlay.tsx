import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { Runner } from "@/game/raceSim";

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
  const timeDiff = runner.finishTime && winner.finishTime ? runner.finishTime - winner.finishTime : 0;
  
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
 * Calculates prizes and displays finish times and silk colors.
 * 
 * EXTRACTED FROM: src/routes/race.$raceId.tsx
 */
export function ResultOverlay({ race, runners, onClose }: ResultOverlayProps) {
  const PRIZE = [0.6, 0.25, 0.1, 0.05];
  const ordered = [...runners].sort((a, b) => (a.finishTime ?? 999) - (b.finishTime ?? 999));
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-card text-card-foreground rounded-xl shadow-2xl max-w-md w-full p-6 border border-white/10">
        <h2 className="text-2xl font-bold mb-1 text-cream">{race.name}</h2>
        <p className="text-sm text-cream-muted mb-4">Final result</p>
        <div className="space-y-2">
          {ordered.map((r, i) => {
            const prize = i < PRIZE.length ? Math.round(race.purse * PRIZE[i]) : 0;
            const feedback = r.owned ? generateJockeyFeedback(r, i + 1, ordered) : null;
            return (
              <div
                key={r.horseId}
                className="flex flex-col gap-1 py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 font-bold tabular-nums text-cream-muted">{i + 1}</span>
                  <div
                    className="h-5 w-5 rounded-full border border-white/20"
                    style={{ backgroundColor: r.silk }}
                  />
                  <Link
                    to="/stable/$horseId"
                    params={{ horseId: r.horseId }}
                    className={`flex-1 truncate hover:underline ${r.owned ? "font-bold text-success" : ""}`}
                  >
                    {r.name}
                  </Link>
                  <span className="text-xs text-cream-muted tabular-nums">
                    {r.finishTime?.toFixed(2)}s
                  </span>
                  {prize > 0 && r.owned && (
                    <span className="text-sm font-bold text-success tabular-nums">
                      +${prize.toLocaleString()}
                    </span>
                  )}
                </div>
                {feedback && (
                  <div className="ml-9 text-xs text-cream-muted italic">
                    <span className="text-chart-2">Jockey:</span> {feedback}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Button
          onClick={onClose}
          className="w-full mt-6 bg-t700 hover:bg-t600 text-cream font-bold"
        >
          Close results
        </Button>
      </div>
    </div>
  );
}
