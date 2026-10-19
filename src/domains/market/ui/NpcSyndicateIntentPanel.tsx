import { useMemo } from "react";
import type { Syndicate } from "@/domains/breeding/application/breedingFacade";
import type { Horse, Stable } from "@/platform/game/types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { TOOLTIP_DELAY_MS } from "@/shared/constants/uiConstants";
import { Users } from "lucide-react";
import {
  evaluateSharePurchase,
  evaluateCounteroffer,
  type CounterofferGuidance,
} from "@/domains/agents/application/aiFacade";
import { getSyndicateIntent, SYNDICATE_INTENT_META } from "@/domains/agents/application/aiFacade";
import { formatSyndicatePurchaseTrace } from "@/domains/agents/application/aiFacade";

interface NpcSyndicateIntentPanelProps {
  syndicate: Syndicate;
  stallion?: Horse;
  npcStables?: Stable[];
  /** Compact inline mode for market cards. */
  compact?: boolean;
  /** Max rows shown. */
  limit?: number;
  /** Player's offered share count — when set, rows show counteroffer guidance. */
  offeredShares?: number;
}

function outcomeNote(outcome: string, minG1: number, minG2: number, minG3: number): string | null {
  switch (outcome) {
    case "skip_quality_gate": {
      const gates = [
        minG1 > 0 ? `${minG1}+ G1` : null,
        minG2 > 0 ? `${minG2}+ G2` : null,
        minG3 > 0 ? `${minG3}+ G3` : null,
      ]
        .filter(Boolean)
        .join(" or ");
      return `Waiting on proof — wants ${gates} wins`;
    }
    case "skip_stake_cap":
      return "Stake cap reached — won't buy more";
    case "skip_unaffordable":
      return "Priced out at current share price";
    case "skip_price":
      return "No valuation available";
    case "buy_control":
      return "Chasing a controlling stake";
    default:
      return null;
  }
}

function counterofferTone(acceptable: boolean, maxAcceptable: number): string {
  if (maxAcceptable <= 0) return "text-red-300";
  return acceptable ? "text-emerald-300" : "text-amber-300";
}

export function NpcSyndicateIntentPanel({
  syndicate,
  stallion,
  npcStables,
  compact = false,
  limit = 4,
  offeredShares,
}: NpcSyndicateIntentPanelProps) {
  const rows = useMemo(() => {
    if (!stallion || !npcStables?.length) return [];
    return npcStables
      .map((stable) => {
        const trace = evaluateSharePurchase(stable, syndicate, stallion);
        const intent = getSyndicateIntent(stable.personality);
        const counteroffer: CounterofferGuidance | null =
          offeredShares != null
            ? evaluateCounteroffer(stable, syndicate, stallion, offeredShares)
            : null;
        return {
          stableId: String(stable.id),
          name: stable.name,
          intent,
          meta: SYNDICATE_INTENT_META[intent],
          trace,
          counteroffer,
          heldShares: syndicate.shareHolders[stable.id] ?? 0,
          expectedShares: trace.shares,
          targetPct: Math.round(trace.appetite.stakeCapPct * 100),
          note: outcomeNote(trace.outcome, trace.minG1Wins, trace.minG2Wins, trace.minG3Wins),
        };
      })
      .sort(
        (a, b) =>
          b.expectedShares - a.expectedShares ||
          b.heldShares - a.heldShares ||
          b.targetPct - a.targetPct,
      )
      .slice(0, limit);
  }, [syndicate, stallion, npcStables, limit, offeredShares]);

  if (rows.length === 0) return null;

  const body = (
    <div className="space-y-2">
      {rows.map((r) => (
        <TooltipProvider key={r.stableId} delayDuration={TOOLTIP_DELAY_MS}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full text-left rounded-md border border-foreground/10 bg-broadcast-panel px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-foreground truncate">{r.name}</span>
                  <Badge variant="outline" className={`text-xs ${r.meta.tone}`}>
                    {r.meta.label}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Target stake up to {r.targetPct}% (
                    {Math.floor((syndicate.totalShares * r.targetPct) / 100)} shares)
                  </span>
                  <span className={r.expectedShares > 0 ? "text-primary" : ""}>
                    {r.expectedShares > 0 ? `Wants ${r.expectedShares} now` : "Holding off"}
                  </span>
                </div>
                {r.counteroffer && (
                  <div
                    className={`mt-1 text-[11px] ${counterofferTone(r.counteroffer.acceptable, r.counteroffer.maxAcceptable)}`}
                  >
                    Offer {offeredShares} → accepts 1–{r.counteroffer.maxAcceptable} · stake after:{" "}
                    {r.counteroffer.expectedStakeAfter} (
                    {Math.round(r.counteroffer.expectedStakePctAfter * 100)}%) ·{" "}
                    {r.counteroffer.note}
                  </div>
                )}
                {!r.counteroffer && r.note && (
                  <div className="mt-1 text-[11px] text-muted-foreground/80">{r.note}</div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <div className="space-y-1 text-xs">
                <div className="font-medium">{r.meta.blurb}</div>
                <div>
                  Holds {r.heldShares}/{syndicate.totalShares} shares · commits up to{" "}
                  {Math.round(r.trace.appetite.cashFraction * 100)}% of cash per buy · buys{" "}
                  {Math.round(r.trace.appetite.buyFraction * 100)}% of what it can afford
                </div>
                <div className="text-muted-foreground">{formatSyndicatePurchaseTrace(r.trace)}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Rival interest</div>
        {body}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Rival Syndicate Intent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          How rival stables approach this syndicate — their intent style sets the stake they chase
          and the terms you&apos;ll be offered.
        </p>
        {body}
      </CardContent>
    </Card>
  );
}
