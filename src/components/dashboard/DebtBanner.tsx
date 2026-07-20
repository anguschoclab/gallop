import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useGame } from "@/game/store";
import {
  SOLVENCY_THRESHOLDS,
  computeDailyInterest,
  deriveSolvencyState,
} from "@/core/financial/solvency";
import { formatCurrency } from "@/core/financial";
import { cn } from "@/lib/cn";

/**
 * Persistent banner that surfaces the player's solvency tier whenever cash
 * is negative. Silent when the stable is healthy. Expandable to reveal
 * a detail panel with debt figures, interest, and the next scheduled action.
 */
export function DebtBanner() {
  const cash = useGame((s) => s.cash);
  const days = useGame((s) => s.consecutiveDaysInDebt ?? 0);
  const audit = useGame((s) => s.solvencyAuditLog ?? []);
  const [open, setOpen] = useState(false);

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
  const interestToday = computeDailyInterest(cash);
  const belowForcedThreshold = cash <= SOLVENCY_THRESHOLDS.forcedSaleCash;
  const approachingSale =
    tier === "warning" && belowForcedThreshold && daysUntilForcedSale <= 2;

  const nextAction =
    tier === "insolvent"
      ? "Run ends — legacy epilogue"
      : tier === "forced_sale"
        ? "Creditors seize your top horse (70% of value)"
        : belowForcedThreshold
          ? `Forced sale in ${daysUntilForcedSale} day${daysUntilForcedSale === 1 ? "" : "s"} unless balance recovers above ${formatCurrency(SOLVENCY_THRESHOLDS.forcedSaleCash)}`
          : `Interest continues; forced sale triggers if balance stays below ${formatCurrency(SOLVENCY_THRESHOLDS.forcedSaleCash)} for ${SOLVENCY_THRESHOLDS.forcedSaleDays} days`;

  const config = {
    warning: {
      label: approachingSale ? "Forced sale imminent" : "Cash reserves depleted",
      body: `Debt ${formatCurrency(cashToRecover)}. Interest accrues daily.`,
      tone: approachingSale
        ? "border-red-500/60 bg-red-500/15 text-red-100"
        : "border-amber-500/50 bg-amber-500/10 text-amber-100",
      icon: approachingSale ? "text-red-300" : "text-amber-300",
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

  const recentAudit = audit.slice(-5).reverse();

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 shadow-lg",
        config.tone,
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn("h-5 w-5 shrink-0 mt-0.5", config.icon)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-wide">
              {config.label}
            </p>
            {tier === "warning" && belowForcedThreshold && (
              <span className="text-[10px] uppercase tracking-widest opacity-75 font-mono">
                {daysUntilForcedSale}d grace remaining
              </span>
            )}
          </div>
          <p className="text-xs opacity-90 mt-0.5">{config.body}</p>
          <div className="flex gap-3 mt-2 text-[11px] items-center">
            <Link
              to="/financial-report"
              className="underline underline-offset-2 hover:opacity-80"
            >
              Open finances
            </Link>
            <Link to="/stable" className="underline underline-offset-2 hover:opacity-80">
              Review roster
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="ml-auto inline-flex items-center gap-1 uppercase tracking-widest opacity-80 hover:opacity-100"
              aria-expanded={open}
            >
              {open ? "Hide details" : "Show details"}
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
          <DetailCell label="Current debt" value={formatCurrency(cashToRecover)} />
          <DetailCell
            label="Daily interest"
            value={`${formatCurrency(interestToday)} (${(SOLVENCY_THRESHOLDS.dailyInterestRate * 100).toFixed(2)}%)`}
          />
          <DetailCell
            label="Days in phase"
            value={`${days}${tier === "warning" ? ` / ${SOLVENCY_THRESHOLDS.forcedSaleDays}` : ""}`}
          />
          <DetailCell label="Next action" value={nextAction} wide />

          {recentAudit.length > 0 && (
            <div className="col-span-2 md:col-span-4 mt-1">
              <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1 font-mono">
                Recent solvency events
              </p>
              <ul className="space-y-0.5 font-mono">
                {recentAudit.map((e, i) => (
                  <li key={i} className="flex justify-between gap-3 opacity-90">
                    <span className="truncate">
                      D{e.day} · {e.detail}
                    </span>
                    <span
                      className={cn(
                        "tabular-nums shrink-0",
                        e.delta < 0 && "text-red-300",
                        e.delta > 0 && "text-emerald-300",
                      )}
                    >
                      {e.delta === 0 ? "—" : formatCurrency(e.delta)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailCell({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={cn(wide && "col-span-2 md:col-span-4")}>
      <div className="text-[9px] uppercase tracking-widest opacity-60 font-mono mb-0.5">
        {label}
      </div>
      <div className="font-mono tabular-nums">{value}</div>
    </div>
  );
}
