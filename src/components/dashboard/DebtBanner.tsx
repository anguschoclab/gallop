import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useId } from "react";
import { useGame } from "@/game/store";
import {
  SOLVENCY_THRESHOLDS,
  computeDebtBannerDisplay,
  previewSeizure,
} from "@/core/financial/solvency";
import { formatCurrency } from "@/core/financial";
import { cn } from "@/lib/cn";

const EMPTY_AUDIT: never[] = [];

/**
 * Persistent banner that surfaces the player's solvency tier whenever cash
 * is negative. Silent when the stable is healthy. Expandable to reveal
 * a detail panel with debt figures, interest, seizure preview, and
 * pay-down controls.
 */
export function DebtBanner() {
  const cash = useGame((s) => s.cash);
  const days = useGame((s) => s.consecutiveDaysInDebt ?? 0);
  const audit = useGame((s) => s.solvencyAuditLog ?? EMPTY_AUDIT);
  const horses = useGame((s) => s.horses);
  const userSettings = useGame((s) => s.userSettings);
  const payDownDebt = useGame((s) => s.payDownDebt);
  const quickSellHorse = useGame((s) => s.quickSellHorse);
  const [open, setOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const payDownId = useId();

  const imminentWarningDays = userSettings?.gameplay?.imminentForcedSaleWarningDays ?? 2;

  const display = computeDebtBannerDisplay({
    cash,
    consecutiveDaysInDebt: days,
    imminentWarningDays,
  });

  if (!display) return null;

  const horseList = Object.values(horses);
  const seizure = previewSeizure(horseList, cash);

  const recentAudit = audit.slice(-5).reverse();

  const handlePayDown = () => {
    const amount = parseInt(payAmount, 10);
    if (isNaN(amount) || amount <= 0) return;
    const result = payDownDebt(amount);
    if (result.ok) setPayAmount("");
  };

  const handleQuickSell = () => {
    if (!seizure) return;
    quickSellHorse(seizure.horseId);
  };

  return (
    <div className={cn("rounded-lg border px-4 py-3 shadow-lg", display.tone)} role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn("h-5 w-5 shrink-0 mt-0.5", display.icon)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-wide">
              {display.label}
            </p>
            {display.showGraceBadge && (
              <span className="text-[10px] uppercase tracking-widest opacity-75 font-mono">
                {display.daysUntilForcedSale}d grace remaining
              </span>
            )}
          </div>
          <p className="text-xs opacity-90 mt-0.5">{display.body}</p>
          <div className="flex gap-3 mt-2 text-[11px] items-center">
            <Link to="/financial-report" className="underline underline-offset-2 hover:opacity-80">
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
          <DetailCell label="Current debt" value={formatCurrency(display.cashToRecover)} />
          <DetailCell
            label="Daily interest"
            value={`${formatCurrency(display.interestToday)} (${(SOLVENCY_THRESHOLDS.dailyInterestRate * 100).toFixed(2)}%)`}
          />
          <DetailCell
            label="Days in phase"
            value={`${days}${display.tier === "warning" ? ` / ${SOLVENCY_THRESHOLDS.forcedSaleDays}` : ""}`}
          />
          <DetailCell label="Next action" value={display.nextAction} wide />

          {/* Seizure Preview */}
          {seizure && (
            <div className="col-span-2 md:col-span-4 mt-1 p-2 rounded border border-red-500/30 bg-red-950/20">
              <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1 font-mono">
                Seizure preview
              </p>
              <div className="flex flex-wrap gap-4 font-mono">
                <span>
                  <span className="opacity-60">Horse: </span>
                  {seizure.horseName}
                </span>
                <span>
                  <span className="opacity-60">Assessed: </span>
                  {formatCurrency(seizure.assessedValue)}
                </span>
                <span className="text-red-300">
                  <span className="opacity-60">Forced-sale: </span>
                  {formatCurrency(seizure.salePrice)}
                </span>
                <span>
                  <span className="opacity-60">Deficit after: </span>
                  {formatCurrency(seizure.deficitAfter)}
                </span>
              </div>
            </div>
          )}

          {/* Pay-down Debt Controls */}
          <div className="col-span-2 md:col-span-4 mt-1 flex flex-wrap gap-2 items-end">
            <div>
              <label
                htmlFor={payDownId}
                className="text-[10px] uppercase tracking-widest opacity-60 font-mono block mb-0.5"
              >
                Pay down debt
              </label>
              <input
                id={payDownId}
                type="number"
                min={0}
                max={display.cashToRecover}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Amount"
                className="w-28 px-2 py-1 text-xs bg-black/30 border border-white/20 rounded font-mono tabular-nums"
              />
            </div>
            <button
              type="button"
              onClick={handlePayDown}
              className="px-3 py-1 text-xs rounded bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold"
            >
              Inject cash
            </button>
            {seizure && (
              <button
                type="button"
                onClick={handleQuickSell}
                className="px-3 py-1 text-xs rounded bg-red-600/80 hover:bg-red-600 text-white font-bold"
              >
                Quick sell {seizure.horseName} ({formatCurrency(seizure.salePrice)})
              </button>
            )}
          </div>

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

function DetailCell({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn(wide && "col-span-2 md:col-span-4")}>
      <div className="text-[9px] uppercase tracking-widest opacity-60 font-mono mb-0.5">
        {label}
      </div>
      <div className="font-mono tabular-nums">{value}</div>
    </div>
  );
}
