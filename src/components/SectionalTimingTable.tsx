import type { SectionalSplit } from "@/core/race/types";
import { SilkDot } from "./SilkDot";
import { cn } from "@/lib/utils";

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
            const leader = runners.find((r) => r.horseId === split.leader);
            return (
              <tr key={split.quarter} className="hover:bg-white/[0.02] transition-colors group">
                <td className="py-4 px-4 font-mono font-bold text-cream/80">
                  <span className="text-broadcast-accent mr-1">Q{split.quarter}</span>
                  <span className="text-muted-foreground/40 font-normal">
                    ({Math.round(split.quarter * quarterMile)}m)
                  </span>
                </td>
                <td className="py-4 px-4 font-mono tabular-nums text-cream font-black">
                  {split.time.toFixed(2)}s
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {leader && <SilkDot color={leader.silk} size="sm" />}
                    <span className={cn(
                      "font-bold truncate max-w-[120px]",
                      leader?.owned ? "text-broadcast-accent" : "text-cream/90"
                    )}>
                      {leader?.name || "Unknown"}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-wrap gap-1.5">
                    {split.positions.slice(0, 12).map((pos, idx) => {
                      const runner = runners.find((r) => r.horseId === pos.horseId);
                      return (
                        <div
                          key={pos.horseId}
                          className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-black border transition-all shadow-sm",
                            runner?.owned
                              ? "border-broadcast-accent bg-broadcast-accent/20 text-broadcast-accent scale-110 z-10"
                              : "border-white/10 bg-white/5 text-muted-foreground group-hover:border-white/20"
                          )}
                          title={`${runner?.name || "Unknown"} (Pos: ${pos.position})`}
                        >
                          {pos.position}
                        </div>
                      );
                    })}
                    {split.positions.length > 12 && (
                      <div className="h-5 px-1.5 rounded-full flex items-center justify-center text-[8px] font-black border border-white/5 bg-white/5 text-muted-foreground/40">
                        +{split.positions.length - 12}
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
