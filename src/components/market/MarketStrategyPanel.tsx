/**
 * MarketStrategyPanel.tsx - Market buying-strategy panel
 *
 * Lets the player set which grades they target, how prestigious a horse's home
 * track must be, what they will pay, and how large a syndication stake they
 * want. Runs the strategy engine against every live Exchange ask and
 * auction-house lot, showing scored candidates with reasons and warnings.
 *
 * Also renders the PriceAlertsPanel so players can tune alerts in-context.
 */

import { useMemo } from "react";
import { useGame, useGameWithShallow, type StoreType } from "@/game/store";
import type { Horse } from "@/game/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  GRADE_SEGMENTS,
  createDefaultExchangeState,
  runMarketStrategy,
  type StrategyCandidate,
} from "@/services/market/marketStrategyService";
import { PriceAlertsPanel } from "@/components/market/PriceAlertsPanel";

const money = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

export function MarketStrategyPanel() {
  const day = useGame((s: StoreType) => s.day);
  const horses = useGame((s: StoreType) => s.horses);
  const exchange = useGameWithShallow((s: StoreType) => s.exchange ?? createDefaultExchangeState());
  const reputation = useGame((s: StoreType) => s.reputation);
  const strategy = useGameWithShallow((s: StoreType) => s.marketStrategy);
  const updateStrategy = useGame((s: StoreType) => s.updateMarketStrategy);

  const horseList: Horse[] = useMemo(() => Object.values(horses ?? {}) as Horse[], [horses]);

  const run = useMemo(
    () =>
      runMarketStrategy({
        strategy,
        day,
        horses: horseList,
        exchange,
        playerReputation: reputation?.score,
      }),
    [strategy, day, horseList, exchange, reputation?.score],
  );

  const toggleGrade = (grade: string) => {
    const current = strategy.targetGrades;
    const next = current.includes(grade) ? current.filter((g) => g !== grade) : [...current, grade];
    updateStrategy({ targetGrades: next });
  };

  return (
    <div className="space-y-6">
      {/* Strategy form */}
      <Card className="bg-slate-900/40 border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cream text-lg">
            <Target className="h-4 w-4 text-primary" />
            Buying strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          {/* Target grades */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-cream/50">Target grades</Label>
            <div className="flex flex-wrap gap-1.5">
              {GRADE_SEGMENTS.map((g) => {
                const active = strategy.targetGrades.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGrade(g)}
                    className={`px-2 py-1 text-[10px] font-mono uppercase border transition-colors ${
                      active
                        ? "bg-primary text-slate-950 border-primary"
                        : "bg-slate-950/40 text-cream/50 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
              {strategy.targetGrades.length === 0 && (
                <span className="text-[10px] font-mono text-cream/40 italic">any grade</span>
              )}
            </div>
          </div>

          {/* Min track prestige */}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-cream/50" htmlFor="strat-prestige">
              Min track prestige
            </Label>
            <Input
              id="strat-prestige"
              type="number"
              min={0}
              max={100}
              value={strategy.minTrackPrestige}
              onChange={(e) => updateStrategy({ minTrackPrestige: Number(e.target.value) || 0 })}
            />
          </div>

          {/* Max price */}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-cream/50" htmlFor="strat-price">
              Price ceiling
            </Label>
            <Input
              id="strat-price"
              type="number"
              min={0}
              value={strategy.maxPrice}
              onChange={(e) => updateStrategy({ maxPrice: Number(e.target.value) || 0 })}
            />
          </div>

          {/* Target syndication stake */}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-cream/50" htmlFor="strat-stake">
              Syndication stake %
            </Label>
            <Input
              id="strat-stake"
              type="number"
              min={0}
              max={100}
              value={strategy.targetSyndicationStakePct}
              onChange={(e) =>
                updateStrategy({ targetSyndicationStakePct: Number(e.target.value) || 0 })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/40 border border-white/5 p-3">
          <div className="text-[10px] font-mono uppercase text-cream/40">Scanned</div>
          <div className="text-xl font-bold text-cream font-mono">{run.scanned}</div>
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-3">
          <div className="text-[10px] font-mono uppercase text-cream/40">Qualified</div>
          <div className="text-xl font-bold text-success font-mono">{run.qualified}</div>
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-3">
          <div className="text-[10px] font-mono uppercase text-cream/40">Avg score</div>
          <div className="text-xl font-bold text-cream font-mono">{run.averageScore}</div>
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-3">
          <div className="text-[10px] font-mono uppercase text-cream/40">Total stake cost</div>
          <div className="text-xl font-bold text-cream font-mono">{money(run.totalStakeCost)}</div>
        </div>
      </div>

      {/* Candidate list */}
      {run.candidates.length === 0 ? (
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="py-8 text-center">
            <Target className="h-8 w-8 text-cream/20 mx-auto mb-2" />
            <p className="text-sm text-cream/50">No candidates found right now.</p>
            <p className="text-[10px] font-mono text-cream/30 mt-1">
              Listings appear when horses are on the Exchange or in auction houses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {run.candidates.map((c: StrategyCandidate) => (
            <CandidateCard
              key={`${c.source.kind}:${c.source.kind === "house" ? c.source.houseId : "exchange"}:${c.horseId}`}
              candidate={c}
            />
          ))}
        </div>
      )}

      {/* Price alerts panel — tune alerts in-context */}
      <PriceAlertsPanel />
    </div>
  );
}

function CandidateCard({ candidate: c }: { candidate: StrategyCandidate }) {
  return (
    <Card className="bg-slate-900/40 border-white/5">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-cream">{c.horseName}</span>
            {c.age !== undefined && (
              <span className="text-[10px] font-mono text-cream/40">{c.age}yo</span>
            )}
            <Badge variant="outline" className="text-[10px]">
              {c.grade}
            </Badge>
            {c.trackName && (
              <span className="text-[10px] font-mono text-cream/40">
                {c.trackName} ({Math.round(c.trackPrestige)})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-cream/40">{c.sourceLabel}</span>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-primary" />
              <span className="font-bold text-cream font-mono">{c.score}</span>
            </div>
          </div>
        </div>

        {/* Price row */}
        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-cream/60">
          <span>
            <span className="text-cream/40">Price:</span> {money(c.price)}
          </span>
          <span>
            <span className="text-cream/40">Fair value:</span> {money(c.fairValue)}
          </span>
          <span className={c.valueEdgePct >= 0 ? "text-success" : "text-destructive"}>
            {pct(c.valueEdgePct)}
          </span>
          <span>
            <span className="text-cream/40">Stake cost:</span> {money(c.stakeCost)}
          </span>
        </div>

        {/* Reasons */}
        {c.reasons.length > 0 && (
          <div className="space-y-1">
            {c.reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-success/80">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {c.warnings.length > 0 && (
          <div className="space-y-1">
            {c.warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-400/80">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
