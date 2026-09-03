/**
 * CashPressureTrend.tsx - Cash-pressure / runway trend sparklines
 *
 * Detail variant: dual recharts sparklines (pressure meter + runway days) with
 * labels and latest values — for the NPC stable detail page.
 * Card variant: a pure-SVG MiniSparkline of meter values — for the stable
 * directory cards (avoids spawning dozens of recharts instances).
 *
 * Dependencies: @/hooks/stable/useCashPressureHistory (useCashPressureHistory), ./MiniSparkline (MiniSparkline), @/components/charts/Sparkline (Sparkline), @/lib/cn (cn)
 * Related files: ./StableCard.tsx (card consumer), ./NpcStableOverviewTab.tsx (detail consumer)
 */

import { useCashPressureHistory } from "@/hooks/stable/useCashPressureHistory";
import { MiniSparkline } from "./MiniSparkline";
import { Sparkline } from "@/components/charts/Sparkline";
import { cn } from "@/lib/cn";
import type { CashPressure } from "@/core/stable/cashPressure";

const LABEL_COLORS: Record<CashPressure["label"], string> = {
  comfortable: "var(--status-comfortable)",
  tight: "var(--warning)",
  strained: "var(--status-strained)",
  desperate: "var(--destructive)",
};

interface CashPressureTrendProps {
  stableId: string;
  variant: "card" | "detail";
  className?: string;
}

/**
 * Render a cash-pressure trend visualization. The card variant uses a lightweight
 * pure-SVG sparkline; the detail variant uses dual recharts sparklines.
 */
export function CashPressureTrend({ stableId, variant, className }: CashPressureTrendProps) {
  const history = useCashPressureHistory(stableId);

  if (history.length < 2) {
    if (variant === "card") return null;
    return (
      <div className={cn("text-xs text-cream-muted", className)}>
        Not enough history yet — check back after a few more days.
      </div>
    );
  }

  const meterData = history.map((s) => s.meter);
  const runwayData = history.map((s) => s.runwayDays);
  const latest = history[history.length - 1];
  const color = LABEL_COLORS[latest.label];

  if (variant === "card") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <MiniSparkline data={meterData} color={color} height={20} width={50} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <div className="flex items-center justify-between text-xs text-cream-muted mb-1">
          <span>Pressure</span>
          <span className="tabular-nums text-cream">
            {latest.meter}/100 ({latest.label})
          </span>
        </div>
        <Sparkline data={meterData} color={color} height={48} variant="area" />
      </div>
      <div>
        <div className="flex items-center justify-between text-xs text-cream-muted mb-1">
          <span>Runway</span>
          <span className="tabular-nums text-cream">{Math.round(latest.runwayDays)} days</span>
        </div>
        <Sparkline data={runwayData} color="var(--info)" height={48} variant="area" />
      </div>
    </div>
  );
}
