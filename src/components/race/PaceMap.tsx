import type { PaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import { cn } from "@/lib/cn";

interface PaceMapRunner {
  horseId: string;
  name: string;
  silk: string;
  owned: boolean;
}

interface PaceMapProps {
  snapshots: PaceSnapshot[];
  runners: PaceMapRunner[];
}

function getPaceLabel(rating: number): { label: string; color: string } {
  if (rating > 1.05) return { label: "Fast", color: "text-red-400" };
  if (rating < 0.9) return { label: "Slow", color: "text-blue-400" };
  return { label: "Even", color: "text-cream/60" };
}

function getProgressLabel(progress: number): string {
  if (progress === 0.25) return "25%";
  if (progress === 0.5) return "50%";
  if (progress === 0.75) return "75%";
  return `${Math.round(progress * 100)}%`;
}

export function PaceMap({ snapshots, runners }: PaceMapProps) {
  if (snapshots.length === 0) {
    return (
      <div className="py-4 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
        No pace data available for this race.
      </div>
    );
  }

  const runnerMap = new Map(runners.map((r) => [r.horseId, r]));

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-black uppercase text-cyan-400/60 tracking-[0.2em]">
        Pace Map
      </div>
      <div className="grid grid-cols-3 gap-2">
        {snapshots.map((snap) => {
          const { label, color } = getPaceLabel(snap.paceRating);
          const leader = snap.leaderHorseId ? runnerMap.get(snap.leaderHorseId) : null;

          return (
            <div key={snap.progress} className="bg-black/30 border border-white/5 p-2 space-y-1">
              <div className="text-[9px] font-black uppercase tracking-widest text-cream/40">
                {getProgressLabel(snap.progress)}
              </div>
              <div className={cn("text-sm font-black tabular-nums", color)}>{label}</div>
              <div className="text-[8px] font-mono text-cream/30 space-y-0.5">
                <div>
                  <span className="text-cream/20">Pace:</span>{" "}
                  <span className="tabular-nums">{snap.paceRating.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-cream/20">Lead:</span>{" "}
                  <span className="tabular-nums">{snap.leadGroupCount}</span>
                </div>
                {leader && <div className="truncate text-cream/40">{leader.name}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
