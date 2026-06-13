/**
 * MiniBar.tsx - Horizontal bar list for category breakdowns.
 */
import { cn } from "@/lib/cn";
import { chartColors } from "./chartTheme";

interface MiniBarRow {
  label: string;
  value: number;
  hint?: string;
  color?: string;
}

interface MiniBarProps {
  rows: MiniBarRow[];
  format?: (n: number) => string;
  max?: number;
  className?: string;
}

export function MiniBar({ rows, format, max, className }: MiniBarProps) {
  const cap = max ?? Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <ul className={cn("space-y-1.5", className)}>
      {rows.map((r, i) => {
        const pct = Math.min(100, (Math.abs(r.value) / cap) * 100);
        const color = r.color ?? chartColors.primary;
        return (
          <li key={`${r.label}-${i}`} className="text-[11px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-cream/80">{r.label}</span>
              <span className="font-mono tabular-nums text-cream/70 shrink-0">
                {format ? format(r.value) : r.value.toLocaleString()}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            {r.hint ? (
              <div className="mt-0.5 text-[9px] font-mono uppercase tracking-wider text-cream/35">
                {r.hint}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
