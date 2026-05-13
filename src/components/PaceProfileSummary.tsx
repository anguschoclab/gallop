import type { Horse } from "@/game/types";
import { derivePaceStyleLabel } from "@/core/race/sectionalAnalysis";

interface PaceProfileSummaryProps {
  horse: Horse;
}

export function PaceProfileSummary({ horse }: PaceProfileSummaryProps) {
  const racesWithPace = horse.raceHistory.filter((h) => h.pacePositions && h.pacePositions.length > 0);

  if (racesWithPace.length === 0) {
    return (
      <div className="text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
        No pace data available
      </div>
    );
  }

  // Calculate average position at each quarter
  const maxQuarters = Math.max(...racesWithPace.map((r) => r.pacePositions?.length || 0));
  const avgPositions: number[] = [];

  for (let q = 0; q < maxQuarters; q++) {
    const positions = racesWithPace
      .map((r) => r.pacePositions?.[q])
      .filter((p) => p !== undefined) as number[];
    if (positions.length > 0) {
      avgPositions.push(positions.reduce((a, b) => a + b, 0) / positions.length);
    }
  }

  // Use core logic for running style
  const runningStyle = derivePaceStyleLabel(avgPositions);

  // Top 3 Tracks logic
  const trackVisits = horse.courseVisits || {};
  const sortedTracks = Object.entries(trackVisits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase text-cream/20 tracking-widest">
              Analytical Running Style
            </div>
            <div className="text-xs font-black text-gold uppercase tracking-tight">
              {runningStyle}
            </div>
          </div>

          <div className="h-32 flex items-end gap-1.5 bg-black/20 p-2 rounded border border-white/5">
            {avgPositions.map((pos, i) => {
              const height = Math.max(10, 100 - pos * 10); // Lower position = higher bar
              return (
                <div
                  key={i}
                  className="flex-1 bg-gold/20 hover:bg-gold/40 transition-colors rounded-t relative group"
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    Q{i + 1}: {pos.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[8px] font-mono text-cream/40 px-1 uppercase tracking-tighter">
            <span>Early</span>
            <span>Middle</span>
            <span>Late Phase</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase text-cream/20 tracking-widest">
            Familiarity Analytics
          </div>
          <div className="space-y-2">
            {sortedTracks.length > 0 ? (
              sortedTracks.map(([trackId, visits]) => (
                <div
                  key={trackId}
                  className="flex items-center justify-between p-2 bg-black/20 border border-white/5 rounded"
                >
                  <span className="text-[10px] font-bold text-cream/60 truncate mr-2">
                    {trackId}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gold-bright">{visits} runs</span>
                    <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold-bright"
                        style={{ width: `${Math.min(100, (visits / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[9px] font-mono text-cream/20 uppercase">
                No track familiarity recorded
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 flex justify-between items-center">
        <div className="text-[9px] font-mono text-cream/20 uppercase">
          Dataset: {racesWithPace.length} analyzed events
        </div>
        <div className="text-[9px] font-mono text-gold/40 uppercase">
          Precision: Linear Interpolation (0.1s)
        </div>
      </div>
    </div>
  );
}
