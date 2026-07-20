import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useGame } from "@/game/store";
import {
  SOLVENCY_THRESHOLDS,
  deriveSolvencyState,
} from "@/core/financial/solvency";
import { formatCurrency } from "@/core/financial";
import { cn } from "@/lib/cn";

/**
 * Persistent banner that surfaces the player's solvency tier whenever cash
 * is negative. Silent when the stable is healthy.
 */
export function DebtBanner() {
  const cash = useGame((s) => s.cash);
  const days = useGame((s) => s.consecutiveDaysInDebt ?? 0);

  if (cash >= 0) return null;

  const { tier, cashToRecover } = deriveSolvencyState({
    cash,
    consecutiveDaysInDebt: days,
  });
  if (tier === "healthy") return null;

  const daysUntilForcedSale = Math.max(
    0,
    SOLVENCY_THRESHOLDS.forcedSaleDays - days,
  );

  const config = {
    warning: {
      label: "Cash reserves depleted",
      body: `Debt ${formatCurrency(cashToRecover)}. Interest accrues daily.`,
      tone: "border-amber-500/50 bg-amber-500/10 text-amber-100",
      icon: "text-amber-300",
    },
    forced_sale: {
      label: "Creditors are moving in",
      body: `Debt ${formatCurrency(cashToRecover)} for ${days} days. Assets may be seized to cover overdue balances.`,
      tone: "border-red-600/60 bg-red-600/15 text-red-100",
      icon: "text-red-300",
    },
    insolvent: {
      label: "Insolvent",
      body: `Debt ${formatCurrency(cashToRecover)} exceeded the floor. Run over.`,
      tone: "border-red-800/70 bg-red-900/25 text-red-100",
      icon: "text-red-400",
    },
  }[tier];

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 flex items-start gap-3 shadow-lg",
        config.tone,
      )}
      role="alert"
    >
      <AlertTriangle className={cn("h-5 w-5 shrink-0 mt-0.5", config.icon)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-wide">
            {config.label}
          </p>
          {tier === "warning" && (
            <span className="text-[10px] uppercase tracking-widest opacity-75 font-mono">
              {daysUntilForcedSale}d grace remaining
            </span>
          )}
        </div>
        <p className="text-xs opacity-90 mt-0.5">{config.body}</p>
        <div className="flex gap-3 mt-2 text-[11px]">
          <Link
            to="/financial-report"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Open finances
          </Link>
          <Link to="/stable" className="underline underline-offset-2 hover:opacity-80">
            Review roster
          </Link>
        </div>
      </div>
    </div>
  );
}
