/**
 * InsightsCompareDialog.tsx - Group comparison for horses selected in Scouting Insights
 *
 * Takes any number of selected InsightRows and lays every insight metric out as a
 * row, one column per horse, highlighting the leader and the group average.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  INSIGHT_METRICS,
  type InsightMetricKey,
  type InsightRow,
} from "@/core/horse/insightMetrics";

/** Metrics where a lower value is the better outcome. */
const LOWER_IS_BETTER: ReadonlySet<InsightMetricKey> = new Set<InsightMetricKey>(["age"]);

interface InsightsCompareDialogProps {
  rows: InsightRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove?: (id: string) => void;
}

function leaderIndex(values: number[], higherIsBetter: boolean): number {
  if (values.length === 0) return -1;
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (higherIsBetter ? values[i] > values[best] : values[i] < values[best]) best = i;
  }
  for (let i = 0; i < values.length; i++) {
    if (i !== best && values[i] === values[best]) return -1;
  }
  return best;
}

export function InsightsCompareDialog({
  rows,
  open,
  onOpenChange,
  onRemove,
}: InsightsCompareDialogProps) {
  const navigate = useNavigate();
  const [diffOnly, setDiffOnly] = useState(false);

  const metricRows = useMemo(
    () =>
      INSIGHT_METRICS.map((metric) => {
        const values = rows.map((r) => r.metrics[metric.key]);
        const higherIsBetter = !LOWER_IS_BETTER.has(metric.key);
        const avg = values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
        const spread = values.length === 0 ? 0 : Math.max(...values) - Math.min(...values);
        return {
          metric,
          values,
          avg,
          spread,
          leader: leaderIndex(values, higherIsBetter),
        };
      }),
    [rows],
  );

  const visibleMetricRows = diffOnly ? metricRows.filter((m) => m.spread > 0) : metricRows;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] uppercase tracking-widest text-sm text-gold">
            Compare Horses · {rows.length}
          </DialogTitle>
        </DialogHeader>

        {rows.length < 2 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Select at least two horses on the plot or in the selection table to compare them.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] font-mono uppercase tracking-wide text-cream/40">
                Leader in each metric is highlighted · group average in the last column
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setDiffOnly((v) => !v)}
              >
                {diffOnly ? "Show all metrics" : "Only differences"}
              </Button>
            </div>

            <div className="overflow-x-auto border border-white/5">
              <table className="w-full text-xs">
                <thead className="bg-slate-950/60 sticky top-0 z-10">
                  <tr className="text-left font-mono text-[9px] uppercase tracking-wide text-cream/40">
                    <th className="p-2 min-w-28">Metric</th>
                    {rows.map((r) => (
                      <th key={r.id} className="p-2 min-w-32">
                        <div className="space-y-1">
                          <button
                            type="button"
                            className="text-cream text-[11px] font-bold normal-case tracking-normal hover:text-gold text-left"
                            onClick={() =>
                              navigate({ to: "/stable/$horseId", params: { horseId: r.id } })
                            }
                          >
                            {r.name}
                          </button>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-[9px]">
                              {r.gender}
                            </Badge>
                            {!r.scouted && (
                              <Badge variant="outline" className="text-[9px] text-cream/40">
                                Unscouted
                              </Badge>
                            )}
                            {onRemove && (
                              <button
                                type="button"
                                aria-label={`Remove ${r.name} from comparison`}
                                className="text-cream/30 hover:text-destructive text-[10px]"
                                onClick={() => onRemove(r.id)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <div className="text-[9px] text-cream/40 normal-case">{r.ownerLabel}</div>
                        </div>
                      </th>
                    ))}
                    <th className="p-2 text-right min-w-24">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMetricRows.map(({ metric, values, avg, leader }) => (
                    <tr key={metric.key} className="border-t border-white/5 hover:bg-white/[0.03]">
                      <td className="p-2 font-mono text-[10px] uppercase tracking-wide text-cream/50">
                        {metric.label}
                      </td>
                      {values.map((v, i) => (
                        <td
                          key={rows[i]?.id ?? i}
                          className={cn(
                            "p-2 font-mono tabular-nums",
                            leader === i ? "bg-gold/10 text-gold font-bold" : "text-cream/80",
                          )}
                        >
                          {metric.format(v)}
                        </td>
                      ))}
                      <td className="p-2 text-right font-mono tabular-nums text-cream/40">
                        {metric.format(avg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
