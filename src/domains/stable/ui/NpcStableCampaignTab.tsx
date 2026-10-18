/**
 * NpcStableCampaignTab.tsx - Campaign comparison tab for a rival stable.
 *
 * Lines up the rival's derived campaign metrics (net worth, cash, class wins,
 * earnings since the player's campaign startDay) against the player's live
 * goal progress so the player can see who is actually ahead.
 *
 * Dependencies: @/core/stable/npcCampaignDerived, @/core/stable/stableGoals,
 *   @/game/store (useGame)
 * Related files: src/components/routes/NpcStableDetailPage.tsx (host),
 *   src/routes/stableCampaign.tsx (player campaign)
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useGame } from "@/platform/game/store";
import { formatCurrency } from "@/shared/common/formatting";
import {
  DEFAULT_STABLE_GOALS,
  goalProgress,
  compareWithPlayer,
  deriveNpcCampaignProgress,
} from "@/domains/stable/application/stableFacade";
import type { useNpcStableDetail } from "@/domains/stable/application/hooks/useNpcStableDetail";

interface NpcStableCampaignTabProps {
  stableId: string;
  pageData: ReturnType<typeof useNpcStableDetail>;
}

const MONEY_ROWS = new Set(["Net worth", "Cash on hand", "Prize earnings"]);

export function NpcStableCampaignTab({ stableId, pageData }: NpcStableCampaignTabProps) {
  const { stable, stableHorses, horses, cash } = pageData;
  const goals = useGame((s) => s.stableGoals);

  const playerProgress = useMemo(
    () => goalProgress(goals ?? DEFAULT_STABLE_GOALS, Object.values(horses), cash),
    [goals, horses, cash],
  );
  const rival = useMemo(
    () => (stable ? deriveNpcCampaignProgress(stable, stableHorses, goals?.startDay ?? 0) : null),
    [stable, stableHorses, goals],
  );
  const rows = useMemo(
    () => (rival ? compareWithPlayer(rival, playerProgress) : []),
    [rival, playerProgress],
  );

  if (!stable || !rival) return null;

  const fmt = (label: string, v: number) => (MONEY_ROWS.has(label) ? formatCurrency(v) : `${v}`);
  const startDay = goals?.startDay ?? 0;

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
        <CardHeader className="bg-black/20 border-b border-white/5">
          <CardTitle className="text-[10px] font-black uppercase tracking-wide text-cream/40">
            Campaign head-to-head{startDay > 0 ? ` — since day ${startDay}` : " — career"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-[9px] font-black uppercase tracking-wide text-cream/40">
                <th className="px-4 py-2">Metric</th>
                <th className="px-4 py-2 text-right">{stable.name}</th>
                <th className="px-4 py-2 text-right">Your stable</th>
                <th className="px-4 py-2 text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2 text-xs text-cream/60">{r.label}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-cream">
                    {fmt(r.label, r.rival)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-cream">
                    {fmt(r.label, r.player)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-mono tabular-nums ${
                      r.delta > 0
                        ? "text-emerald-400"
                        : r.delta < 0
                          ? "text-rose-400"
                          : "text-cream/40"
                    }`}
                  >
                    {r.delta > 0 ? "+" : r.delta < 0 ? "−" : "—"}
                    {r.delta !== 0 && fmt(r.label, Math.abs(r.delta))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-[10px] font-mono uppercase tracking-wide text-cream/30">
        Δ is your stable minus {stable.name}: green means you are ahead. Rival class wins are
        counted over the same window as your campaign
        {goals ? "" : " — set campaign goals to compare over a fixed window"}.
      </p>
      {!goals && (
        <p className="text-xs text-cream/40">
          No saved campaign — showing whole-career totals.{" "}
          <Link to="/stableCampaign" className="text-gold hover:underline">
            Set campaign goals
          </Link>{" "}
          to compare over a fixed window.
        </p>
      )}
    </div>
  );
}
