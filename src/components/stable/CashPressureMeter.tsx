/**
 * CashPressureMeter.tsx - Reusable cash-pressure meter bar
 *
 * Extracted from CashPressureBadge so the comparison drawer and badge share the
 * same meter styling.
 *
 * Dependencies: @/lib/cn (cn), @/core/stable/cashPressure (CashPressure)
 * Related files: ./CashPressureBadge.tsx (consumer), ./StableCompareTable.tsx (consumer)
 */

import { cn } from "@/lib/cn";
import type { CashPressure } from "@/core/stable/cashPressure";

const METER_STYLES: Record<CashPressure["label"], string> = {
  comfortable: "bg-cream-muted",
  tight: "bg-amber-400",
  strained: "bg-orange-400",
  desperate: "bg-red-400",
};

interface CashPressureMeterProps {
  meter: number;
  label: CashPressure["label"];
  className?: string;
}

/**
 * Render a 0-100 pressure meter bar with a numeric readout.
 */
export function CashPressureMeter({ meter, label, className }: CashPressureMeterProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} aria-hidden>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-border/60">
        <span
          className={cn("block h-full rounded-full", METER_STYLES[label])}
          style={{ width: `${meter}%` }}
        />
      </span>
      <span className="text-xs tabular-nums text-cream-muted">{meter}</span>
    </span>
  );
}
