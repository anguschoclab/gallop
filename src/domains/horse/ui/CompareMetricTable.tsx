import type { Horse } from "@/platform/game/types";
import { Progress } from "@/shared/ui/progress";
import { SilkDot } from "@/domains/shell/ui/SilkDot";
import { bestIdx, type RowData } from "@/domains/horse/application/hooks/useHorseCompareRows";
import { cn } from "@/shared/lib/cn";

interface CompareMetricTableProps {
  horses: Horse[];
  rows: RowData[];
}

export function CompareMetricTable({ horses, rows }: CompareMetricTableProps) {
  return (
    <div className="rounded border border-white/5 overflow-x-auto">
      <table data-testid="compare-metric-table" className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th
              scope="col"
              className="px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] uppercase tracking-wide font-mono text-foreground/50 w-28 sm:w-40 text-left"
            >
              Metric
            </th>
            {horses.map((h) => (
              <th scope="col" key={h.id} className="px-2 py-1.5 sm:px-3 sm:py-2 text-left">
                <div className="flex items-center gap-1.5">
                  <SilkDot color={h.silk} size="sm" />
                  <span className="font-bold font-[family-name:var(--font-display)] text-xs text-foreground">
                    {h.name}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => {
            const winner =
              row.numeric && row.higherIsBetter !== undefined
                ? bestIdx(row.numeric, row.higherIsBetter)
                : -1;
            return (
              <tr key={row.label} className="hover:bg-white/[0.02]">
                <td className="px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] uppercase tracking-wide font-mono text-foreground/50 w-28 sm:w-40">
                  {row.label}
                </td>
                {row.values.map((v, i) => (
                  <td
                    key={i}
                    className={cn(
                      "px-2 py-1.5 sm:px-3 sm:py-2 font-mono tabular-nums",
                      winner === i ? "bg-primary/10 text-primary font-bold" : "text-foreground/80",
                    )}
                  >
                    <div className="flex items-center gap-2 hidden sm:flex">
                      <span>{v}</span>
                      {row.barValues && row.barValues[i] !== undefined && (
                        <Progress value={row.barValues[i]} className="h-1 w-16" />
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
