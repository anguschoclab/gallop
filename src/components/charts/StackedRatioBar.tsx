/**
 * StackedRatioBar.tsx - Horizontal stacked bar to show ratios (e.g. W/P/S splits).
 * Design-bible compliant alternative to a pie chart.
 */
import { cn } from "@/lib/cn";

interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface StackedRatioBarProps {
  segments: Segment[];
  className?: string;
}

export function StackedRatioBar({ segments, className }: StackedRatioBarProps) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
        {segments.map((s) => {
          const pct = (Math.max(0, s.value) / total) * 100;
          if (pct <= 0) return null;
          return <div key={s.key} style={{ width: `${pct}%`, background: s.color }} />;
        })}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-cream/70">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            <span className="uppercase tracking-wider">{s.label}</span>
            <span className="tabular-nums text-cream/50">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
