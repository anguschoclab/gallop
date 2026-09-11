/**
 * RunnerLegend.tsx - Shared runner legend for race charts.
 *
 * Extracted from PaceGraph.tsx and SpeedBreakdownChart.tsx to eliminate a
 * 62-line duplicate (310 tokens) found by jscpd.
 *
 * Per PR 8 of the megaplan.
 */

import { cn } from "@/lib/cn";
import { SilkDot } from "@/components/SilkDot";

export interface RunnerLegendEntry {
  silk: string;
  name: string;
  owned: boolean;
}

interface RunnerLegendProps<T extends RunnerLegendEntry> {
  finishOrder: string[];
  runnerMap: Map<string, T>;
  pinned: Set<string>;
  hovered: string | null;
  onTogglePin: (id: string) => void;
  onHover: (id: string | null) => void;
}

export function RunnerLegend<T extends RunnerLegendEntry>({
  finishOrder,
  runnerMap,
  pinned,
  onTogglePin,
  onHover,
}: RunnerLegendProps<T>) {
  return (
    <div className="border border-white/5 bg-black/20 overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-white/5 font-mono text-[9px] uppercase tracking-wide text-cream/40">
        Runners ({finishOrder.length})
      </div>
      <ul className="overflow-y-auto custom-scrollbar max-h-64 divide-y divide-white/5">
        {finishOrder.map((id, i) => {
          const r = runnerMap.get(id);
          if (!r) return null;
          const active = pinned.has(id);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onTogglePin(id)}
                onMouseEnter={() => onHover(id)}
                onMouseLeave={() => onHover(null)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-white/[0.03] transition-colors",
                  active && "bg-white/[0.04]",
                )}
              >
                <span className="font-mono tabular-nums text-cream/30 text-[10px] w-5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <SilkDot color={r.silk} size="sm" />
                <span
                  className={cn(
                    "flex-1 truncate font-mono uppercase tracking-tight",
                    r.owned ? "text-success font-bold" : "text-cream/80",
                    active && "text-gold",
                  )}
                >
                  {r.name}
                </span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full border",
                    active ? "bg-gold border-gold" : "border-white/20 bg-transparent",
                  )}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="px-3 py-2 border-t border-white/5 font-mono text-[9px] uppercase tracking-wide text-cream/30">
        Tap a runner to pin
      </div>
    </div>
  );
}
