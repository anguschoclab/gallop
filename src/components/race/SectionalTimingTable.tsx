import type { SectionalSplit } from "@/core/race/types";
import { SilkDot } from "@/components/SilkDot";
import { cn } from "@/lib/cn";
import { useMemo } from "react";

interface SectionalTimingTableProps {
  splits: SectionalSplit[];
  runners: Array<{ horseId: string; name: string; silk: string; owned: boolean }>;
  distance: number;
}

/**
 * Displays a tabular breakdown of sectional splits for a completed race.
 * Visualizes the running order and leader times at each quarter-mile marker.
 *
 * @param {SectionalTimingTableProps} props - The component properties.
 * @returns {JSX.Element} The rendered timing table.
 */
export function SectionalTimingTable({ splits, runners, distance }: SectionalTimingTableProps) {
  const quarterMile = 402.336;

  // Pre-calculate hash map for O(1) runner lookups instead of running O(N) .find() inside the map loops.
  const runnerMap = useMemo(() => new Map(runners.map((r) => [r.horseId, r])), [runners]);

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="text-left py-3 px-4 font-black uppercase tracking-tighter text-muted-foreground/60">
              Marker
            </th>
            <th className="text-left py-3 px-4 font-black uppercase tracking-tighter text-muted-foreground/60">
              Leader Time
            </th>
            <th className="text-left py-3 px-4 font-black uppercase tracking-tighter text-muted-foreground/60">
              Pace Setter
            </th>
            <th className="text-left py-3 px-4 font-black uppercase tracking-tighter text-muted-foreground/60">
              Running Order
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {splits.map((split) => {
            const sortedEntries = [...split.entries].sort((a, b) => a.rank - b.rank);
            const leaderEntry = sortedEntries[0];
            const leader = leaderEntry ? runnerMap.get(leaderEntry.horseId) : undefined;

            return (
              <tr key={split.label} className="hover:bg-white/[0.02] transition-colors group">
                <td className="py-4 px-4 font-mono font-bold text-cream/80">
                  <span className="text-broadcast-accent mr-1">{split.label}</span>
                  <span className="text-muted-foreground/40 font-normal">
                    ({Math.round(split.distanceMeters)}m)
                  </span>
                </td>
                <td className="py-4 px-4 font-mono tabular-nums text-cream font-black">
                  {leaderEntry ? `${leaderEntry.cumulativeTime.toFixed(2)}s` : "-"}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {leader && <SilkDot color={leader.silk} size="sm" />}
                    <span
                      className={cn(
                        "font-bold truncate max-w-[120px]",
                        leader?.owned ? "text-broadcast-accent" : "text-cream/90",
                      )}
                    >
                      {leader?.name || "Unknown"}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-wrap gap-1.5">
                    {sortedEntries.slice(0, 12).map((entry) => {
                      const runner = runnerMap.get(entry.horseId);
                      return (
                        <div
                          key={entry.horseId}
                          className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-black border transition-all shadow-sm",
                            runner?.owned
                              ? "border-broadcast-accent bg-broadcast-accent/20 text-broadcast-accent scale-110 z-10"
                              : "border-white/10 bg-white/5 text-muted-foreground group-hover:border-white/20",
                          )}
                          title={`${runner?.name || "Unknown"} (Pos: ${entry.rank})`}
                        >
                          {entry.rank}
                        </div>
                      );
                    })}
                    {sortedEntries.length > 12 && (
                      <div className="h-5 px-1.5 rounded-full flex items-center justify-center text-[8px] font-black border border-white/5 bg-white/5 text-muted-foreground/40">
                        +{sortedEntries.length - 12}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
