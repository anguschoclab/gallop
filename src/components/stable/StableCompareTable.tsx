/**
 * StableCompareTable.tsx - Side-by-side comparison grid for NPC stables
 *
 * Renders one column per stable with rows for cash-pressure meter, runway days,
 * accept threshold %, counter multiplier (×ask), pressure label, and a 90-day
 * trend sparkline (detail variant).
 *
 * Dependencies: @/core/stable/recommendedMaxOffer (recommendedMaxOffer), @/core/stable/cashPressure (evaluateCashPressure), ./CashPressureMeter (CashPressureMeter), ./CashPressureTrend (CashPressureTrend)
 * Related files: ./StableCompareDrawer.tsx (consumer), src/routes/npc-stables.compare.tsx (consumer)
 */

import { recommendedMaxOffer } from "@/core/stable/recommendedMaxOffer";
import { evaluateCashPressure } from "@/core/stable/cashPressure";
import { CashPressureMeter } from "./CashPressureMeter";
import { CashPressureTrend } from "./CashPressureTrend";
import { formatCurrency } from "@/core/common/formatting";
import type { Stable } from "@/game/types";

interface StableCompareTableProps {
  stables: Stable[];
}

const ROW_LABEL_CLASS = "text-xs text-cream-muted font-medium py-2 pr-3 text-right";
const CELL_CLASS = "text-xs text-cream py-2 px-3 text-center min-w-[120px]";

/**
 * Render a side-by-side comparison table of NPC stable financial metrics.
 */
export function StableCompareTable({ stables }: StableCompareTableProps) {
  if (stables.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-cream-muted">
        No stables selected for comparison. Use the compare toggle on stable cards or the checkboxes
        on this page to add stables.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className={`${ROW_LABEL_CLASS} text-left`}>Stable</th>
            {stables.map((s) => (
              <th
                key={s.id}
                className={`${CELL_CLASS} font-[family-name:var(--font-display)] text-sm text-cream`}
              >
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/50">
            <td className={ROW_LABEL_CLASS}>Cash pressure</td>
            {stables.map((s) => {
              const cp = evaluateCashPressure(s, s.horses.length);
              return (
                <td key={s.id} className={CELL_CLASS}>
                  <CashPressureMeter meter={cp.meter} label={cp.label} className="justify-center" />
                </td>
              );
            })}
          </tr>
          <tr className="border-b border-border/50">
            <td className={ROW_LABEL_CLASS}>Pressure label</td>
            {stables.map((s) => {
              const cp = evaluateCashPressure(s, s.horses.length);
              return (
                <td key={s.id} className={CELL_CLASS}>
                  {cp.label}
                </td>
              );
            })}
          </tr>
          <tr className="border-b border-border/50">
            <td className={ROW_LABEL_CLASS}>Runway (days)</td>
            {stables.map((s) => {
              const cp = evaluateCashPressure(s, s.horses.length);
              return (
                <td key={s.id} className={`${CELL_CLASS} tabular-nums`}>
                  {Math.round(cp.runwayDays)}
                </td>
              );
            })}
          </tr>
          <tr className="border-b border-border/50">
            <td className={ROW_LABEL_CLASS}>Accept threshold</td>
            {stables.map((s) => {
              const r = recommendedMaxOffer(s);
              return (
                <td key={s.id} className={`${CELL_CLASS} tabular-nums`}>
                  {Math.round(r.acceptThreshold * 100)}%
                </td>
              );
            })}
          </tr>
          <tr className="border-b border-border/50">
            <td className={ROW_LABEL_CLASS}>Counter multiplier</td>
            {stables.map((s) => {
              const r = recommendedMaxOffer(s);
              return (
                <td key={s.id} className={`${CELL_CLASS} tabular-nums`}>
                  ×{r.counterMultiplier.toFixed(2)}
                </td>
              );
            })}
          </tr>
          <tr className="border-b border-border/50">
            <td className={ROW_LABEL_CLASS}>Cash on hand</td>
            {stables.map((s) => (
              <td key={s.id} className={`${CELL_CLASS} tabular-nums`}>
                {formatCurrency(s.cash)}
              </td>
            ))}
          </tr>
          <tr>
            <td className={ROW_LABEL_CLASS}>90-day trend</td>
            {stables.map((s) => (
              <td key={s.id} className={CELL_CLASS}>
                <CashPressureTrend stableId={s.id} variant="detail" className="text-left" />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
