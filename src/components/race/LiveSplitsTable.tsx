import { cn } from "@/lib/cn";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Horse } from "@/game/types";
import { formatSplitTime, getTargetSplitTime } from "./raceUtils";

interface LiveSplitsTableProps {
  runners: Runner[];
  distance: number;
  liveSplits: Map<string, number[]>;
  localHorseMap: Map<string, Horse>;
  calibratedPars: Record<number, number> | undefined;
}

const SPLIT_LABELS = ["¼", "½", "¾", "Fin"] as const;

export function LiveSplitsTable({
  runners,
  distance,
  liveSplits,
  localHorseMap,
  calibratedPars,
}: LiveSplitsTableProps) {
  return (
    <div className="border border-white/10 bg-black/20 p-4 rounded-lg overflow-x-auto">
      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-3">
        <span className="h-1 w-12 bg-broadcast-accent" />
        Live Splits
      </h3>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-white/10 text-cream/30 uppercase tracking-widest text-[9px]">
            <th className="text-left pb-2 pr-3">Horse</th>
            {SPLIT_LABELS.map((label) => (
              <th key={label} className="text-right pb-2 px-2">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {runners.map((r) => {
            const horse = localHorseMap.get(r.horseId);
            const crossings = liveSplits.get(r.horseId) ?? [];
            const markerFractions = [0.25, 0.5, 0.75, 1.0];
            return (
              <tr key={r.horseId} className="hover:bg-white/[0.02]">
                <td
                  className={cn(
                    "py-2 pr-3 font-bold truncate max-w-[120px]",
                    r.isPlayer ? "text-success" : "text-cream/80",
                  )}
                >
                  {r.name}
                </td>
                {markerFractions.map((frac, mi) => {
                  const elapsed = crossings[mi];
                  const target = horse
                    ? getTargetSplitTime(horse, distance, frac, calibratedPars ?? {})
                    : null;
                  if (elapsed == null) {
                    return (
                      <td key={mi} className="text-right px-2 py-2 text-cream/20">
                        —
                      </td>
                    );
                  }
                  const delta = target != null ? elapsed - target : null;
                  return (
                    <td key={mi} className="text-right px-2 py-2 tabular-nums">
                      <div className="text-cream/80">{formatSplitTime(elapsed)}</div>
                      {delta != null && (
                        <div
                          className={cn(
                            "text-[9px]",
                            delta < 0 ? "text-green-400" : "text-red-400",
                          )}
                        >
                          {delta < 0 ? "" : "+"}
                          {delta.toFixed(2)}s
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
