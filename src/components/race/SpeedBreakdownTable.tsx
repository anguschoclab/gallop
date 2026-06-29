import { useMemo } from "react";
import { SilkDot } from "@/components/SilkDot";
import { cn } from "@/lib/cn";
import type { SectionalSplit, SectionalEntry } from "@/core/race/types";

interface SpeedBreakdownRunner {
  horseId: string;
  name: string;
  silk: string;
  owned: boolean;
}

interface SpeedBreakdownTableProps {
  splits: SectionalSplit[];
  runners: SpeedBreakdownRunner[];
  className?: string;
}

function fmtPct(v: number | undefined): string | null {
  if (v === undefined || v === 0) return null;
  const sign = v > 0 ? "+" : "−";
  return `${sign}${Math.abs(v * 100).toFixed(1)}%`;
}

export function SpeedBreakdownTable({ splits, runners, className }: SpeedBreakdownTableProps) {
  const runnerMap = useMemo(() => {
    const map = new Map<string, SpeedBreakdownRunner>();
    for (let i = 0; i < runners.length; i++) {
      map.set(runners[i].horseId, runners[i]);
    }
    return map;
  }, [runners]);
  const entryMap = useMemo(() => {
    const map = new Map<string, Map<string, SectionalEntry>>();
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const inner = new Map<string, SectionalEntry>();
      for (let j = 0; j < split.entries.length; j++) {
        inner.set(split.entries[j].horseId, split.entries[j]);
      }
      map.set(split.label, inner);
    }
    return map;
  }, [splits]);

  if (splits.length === 0 || runners.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="border border-white/5 bg-black/20 overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="border-b border-white/5 text-cream/40 uppercase tracking-widest">
              <th className="text-left px-3 py-2 sticky left-0 bg-black/30">Runner</th>
              {splits.map((s) => (
                <th key={s.label} className="text-center px-3 py-2">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {runners.map((r) => (
              <tr key={r.horseId}>
                <td
                  className={cn(
                    "px-3 py-2 text-left sticky left-0 bg-black/30",
                    r.owned ? "font-bold text-success" : "text-cream/80",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <SilkDot color={r.silk} size="sm" />
                    <span className="truncate">{r.name}</span>
                  </div>
                </td>
                {splits.map((split) => {
                  const entry = entryMap.get(split.label)?.get(r.horseId);
                  const seekStr = fmtPct(entry?.avgSeekContribution);
                  const spurtStr = fmtPct(entry?.avgSpurtContribution);
                  return (
                    <td key={split.label} className="px-3 py-2 text-center align-top">
                      <div className="flex flex-col items-center gap-0.5">
                        {seekStr && <span className="text-blue-400 tabular-nums">{seekStr}</span>}
                        {spurtStr && <span className="text-gold tabular-nums">{spurtStr}</span>}
                        {!seekStr && !spurtStr && <span className="text-cream/20">—</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 text-[10px] font-mono text-cream/40">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          Seek (positioning)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-gold" />
          Spurt (buildup)
        </span>
      </div>
    </div>
  );
}
