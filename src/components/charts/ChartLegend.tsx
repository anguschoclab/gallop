/**
 * ChartLegend.tsx - Consistent swatch legend for any chart in the kit.
 */
import { cn } from "@/lib/cn";

export interface LegendItem {
  label: string;
  color: string;
  /** Optional value/hint shown after the label. */
  hint?: string;
  /** Renders a dashed line swatch instead of a filled square. */
  variant?: "swatch" | "line" | "dashed";
}

interface ChartLegendProps {
  items: LegendItem[];
  className?: string;
}

export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <ul className={cn("flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono", className)}>
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-cream/65">
          {it.variant === "line" || it.variant === "dashed" ? (
            <span
              className="h-0 w-3.5 border-t-2"
              style={{
                borderColor: it.color,
                borderTopStyle: it.variant === "dashed" ? "dashed" : "solid",
              }}
            />
          ) : (
            <span className="h-2 w-2 rounded-sm" style={{ background: it.color }} />
          )}
          <span className="uppercase tracking-wider">{it.label}</span>
          {it.hint ? <span className="tabular-nums text-cream/40">{it.hint}</span> : null}
        </li>
      ))}
    </ul>
  );
}
