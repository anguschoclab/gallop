import type { Horse } from "@/game/types";

interface PaceProfileSummaryProps {
  horse: Horse;
}

export function PaceProfileSummary({ horse }: PaceProfileSummaryProps) {
  const racesWithPace = horse.raceHistory.filter(h => h.pacePositions && h.pacePositions.length > 0);

  if (racesWithPace.length === 0) {
    return (
      <div className="text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
        No pace data available
      </div>
    );
  }

  // Calculate average position at each quarter
  const maxQuarters = Math.max(...racesWithPace.map(r => r.pacePositions?.length || 0));
  const avgPositions: number[] = [];

  for (let q = 0; q < maxQuarters; q++) {
    const positions = racesWithPace
      .map(r => r.pacePositions?.[q])
      .filter(p => p !== undefined) as number[];
    if (positions.length > 0) {
      avgPositions.push(positions.reduce((a, b) => a + b, 0) / positions.length);
    }
  }

  // Determine running style label
  let runningStyle = "Stalker";
  if (avgPositions.length >= 2) {
    const early = avgPositions.slice(0, Math.floor(avgPositions.length / 3));
    const late = avgPositions.slice(-Math.floor(avgPositions.length / 3));
    const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
    const lateAvg = late.reduce((a, b) => a + b, 0) / late.length;

    if (earlyAvg <= 2) runningStyle = "Front-runner";
    else if (lateAvg < earlyAvg - 2) runningStyle = "Closer";
    else runningStyle = "Stalker";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
          Running Style
        </div>
        <div className="text-sm font-bold text-gold uppercase">{runningStyle}</div>
      </div>

      <div className="h-24 flex items-end gap-1">
        {avgPositions.map((pos, i) => {
          const height = Math.max(10, 100 - (pos * 10)); // Lower position = higher bar
          return (
            <div
              key={i}
              className="flex-1 bg-primary/30 hover:bg-primary/50 transition-colors rounded-t"
              style={{ height: `${height}%` }}
              title={`Q${i + 1}: Avg position ${pos.toFixed(1)}`}
            />
          );
        })}
      </div>

      <div className="flex justify-between text-[8px] font-mono text-cream/40">
        <span>Early</span>
        <span>Middle</span>
        <span>Late</span>
      </div>

      <div className="text-[8px] font-mono text-cream/20">
        Based on {racesWithPace.length} races with pace data
      </div>
    </div>
  );
}
