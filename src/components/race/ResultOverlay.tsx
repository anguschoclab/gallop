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
            return (
              <div
                key={r.horseId}
                className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0"
              >
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
