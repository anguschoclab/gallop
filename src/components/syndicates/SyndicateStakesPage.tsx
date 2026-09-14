/**
 * SyndicateStakesPage.tsx - Syndicate stakes holdings and reputation impact
 *
 * Displays all active stallion syndicates in which the player holds shares,
 * detailing equity stakes, valuation, dividend earnings, progeny achievements,
 * shareholder sentiment, and the precise impact on bloodstock reputation.
 */

import { Fragment, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Search,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Award,
  ArrowUpDown,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/common/StatCard";
import { PillToggleGroup } from "@/components/common/PillToggleGroup";
import { formatCurrency } from "@/lib/formatting";
import {
  derivePlayerSyndicateStakes,
  calculateSyndicateStakesSummary,
  type PlayerSyndicateStake,
} from "@/services/breeding/breedingFacade";

const STATUS_FILTERS = ["all", "positive", "neutral", "negative", "major"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type SortKey = "value" | "equity" | "satisfaction" | "reputation" | "g1s" | "name";
type SortDir = "asc" | "desc";

interface SyndicateStakesPageProps {
  stakes?: PlayerSyndicateStake[];
}

export function SyndicateStakesPage({ stakes: propsStakes }: SyndicateStakesPageProps) {
  const storeSyndicates = useGameWithShallow((s: GameState) => s.syndicates ?? {});
  const storeHorses = useGameWithShallow((s: GameState) => s.horses);
  const storeReputation = useGame((s: GameState) => s.reputation);
  const storeInvestors = useGameWithShallow((s: GameState) => s.syndicateInvestors ?? {});

  const allStakes = useMemo(() => {
    if (propsStakes) return propsStakes;
    return derivePlayerSyndicateStakes({
      syndicates: storeSyndicates,
      horses: storeHorses,
      reputation: storeReputation,
      syndicateInvestors: storeInvestors,
    });
  }, [propsStakes, storeSyndicates, storeHorses, storeReputation, storeInvestors]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showGuide, setShowGuide] = useState(true);
  const [expandedStakeId, setExpandedStakeId] = useState<string | null>(null);

  const summary = useMemo(() => calculateSyndicateStakesSummary(allStakes), [allStakes]);

  const filteredStakes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allStakes.filter((stake) => {
      if (needle && !stake.stallionName.toLowerCase().includes(needle)) {
        return false;
      }
      if (statusFilter === "positive" && stake.reputationImpactStatus !== "positive") return false;
      if (statusFilter === "neutral" && stake.reputationImpactStatus !== "neutral") return false;
      if (statusFilter === "negative" && stake.reputationImpactStatus !== "negative") return false;
      if (statusFilter === "major" && stake.equityPct < 20) return false;
      return true;
    });
  }, [allStakes, query, statusFilter]);

  const sortedStakes = useMemo(() => {
    return [...filteredStakes].sort((a, b) => {
      let comp = 0;
      switch (sortKey) {
        case "value":
          comp = a.stakeValue - b.stakeValue;
          break;
        case "equity":
          comp = a.equityPct - b.equityPct;
          break;
        case "satisfaction":
          comp = a.averageSatisfaction - b.averageSatisfaction;
          break;
        case "reputation":
          comp = a.reputationPointsTotal - b.reputationPointsTotal;
          break;
        case "g1s":
          comp = a.lifetimeG1Foals - b.lifetimeG1Foals;
          break;
        case "name":
          comp = a.stallionName.localeCompare(b.stallionName);
          break;
      }
      return sortDir === "desc" ? -comp : comp;
    });
  }, [filteredStakes, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black uppercase tracking-wider text-cream flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-400" /> Syndicate Stakes
            </h1>
            <Badge variant="outline" className="text-cream border-white/20 font-mono text-xs">
              {allStakes.length} Active {allStakes.length === 1 ? "Stake" : "Stakes"}
            </Badge>
          </div>
          <p className="text-xs text-cream-muted mt-1">
            Monitor your stallion shareholdings, dividend cash flow, partner sentiment, and
            reputation impact.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGuide((prev) => !prev)}
            className="text-xs border-white/10 text-cream/70 hover:text-cream"
          >
            <Info className="h-3.5 w-3.5 mr-1 text-purple-400" />
            {showGuide ? "Hide Guide" : "Reputation Guide"}
          </Button>
          <Link to="/portfolio">
            <Button size="sm" variant="outline" className="border-white/10 text-cream">
              Portfolio
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Stakes Owned"
          value={`${summary.totalStakesCount} ${summary.totalStakesCount === 1 ? "Syndicate" : "Syndicates"}`}
          sub={`${summary.totalSharesOwned} total shares`}
        />
        <StatCard
          label="Total Stake Value"
          value={formatCurrency(summary.totalStakeValue)}
          sub="Current holdings value"
        />
        <StatCard
          label="Lifetime Dividends"
          value={formatCurrency(summary.totalDividendsEarned)}
          sub="Player earnings share"
        />
        <StatCard
          label="Partner Sentiment"
          value={`${summary.averagePartnerSatisfaction}%`}
          sub={
            summary.averagePartnerSatisfaction >= 70
              ? "Esteemed Standing"
              : summary.averagePartnerSatisfaction >= 40
                ? "Stable Standing"
                : "At Risk"
          }
        />
        <StatCard
          label="Net Reputation"
          value={`${summary.netReputationPoints >= 0 ? "+" : ""}${summary.netReputationPoints} pts`}
          sub={`${summary.positiveCount} boosting · ${summary.dragCount} drag`}
        />
      </div>

      {/* Guide Banner */}
      {showGuide && (
        <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-purple-400">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-cream flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-400" />
              How Syndicate Performance Shapes Your Bloodstock Reputation
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0 text-xs text-cream/70 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-black/30 p-2.5 border border-white/5 space-y-1">
                <span className="font-bold text-cream flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                  <DollarSign className="h-3.5 w-3.5 text-gold" /> Underwriting & Capital
                </span>
                <p className="text-[11px] leading-relaxed text-cream-muted">
                  Purchasing significant equity stakes (&ge; 20%) demonstrates financial conviction
                  and rewards instant commercial reputation events.
                </p>
              </div>
              <div className="bg-black/30 p-2.5 border border-white/5 space-y-1">
                <span className="font-bold text-cream flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Progeny Race Success
                </span>
                <p className="text-[11px] leading-relaxed text-cream-muted">
                  When foals win Stakes and G1 races, stallion stud fees climb, partner satisfaction
                  surges (+15 for G1s), conferring active bloodstock prestige.
                </p>
              </div>
              <div className="bg-black/30 p-2.5 border border-white/5 space-y-1">
                <span className="font-bold text-cream flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> Partner Sentiment & Exit
                </span>
                <p className="text-[11px] leading-relaxed text-cream-muted">
                  High shareholder satisfaction (&ge; 75%) solidifies industry standing. Partner
                  dissatisfaction (&lt; 40%) or sudden share sell-offs creates reputation drag.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Area */}
      {allStakes.length === 0 ? (
        <Card className="bg-slate-900/40 border-white/5 rounded-none p-12 text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-purple-500/10 text-purple-400 mb-2">
            <Sparkles className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-cream">
            No Syndicate Stakes
          </h2>
          <p className="text-xs text-cream-muted max-w-md mx-auto leading-relaxed">
            You currently hold no stallion syndicate shares. Underwriting syndicate stakes or
            syndicating your retired champions earns lucrative stud dividends and elevates your
            reputation in the bloodstock industry.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link to="/market">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white">
                Explore Market
              </Button>
            </Link>
            <Link to="/breeding">
              <Button variant="outline" size="sm" className="border-white/10 text-cream">
                Breeding Hub
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Controls: Search, Filters, Sorting */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-black/20 p-3 border border-white/5">
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <Search className="h-4 w-4 text-cream/40" />
              <Input
                placeholder="Filter by stallion..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 text-xs bg-black/40 border-white/10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PillToggleGroup
                options={[
                  { value: "all", label: "All Stakes" },
                  { value: "positive", label: "Prestige Boost" },
                  { value: "neutral", label: "Stable" },
                  { value: "negative", label: "At Risk" },
                  { value: "major", label: "Major (≥20%)" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>

          {/* Stakes Table */}
          <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-black/30">
                  <TableRow className="border-b border-white/5 hover:bg-transparent">
                    <TableHead
                      className="cursor-pointer text-[10px] font-black uppercase text-cream/50 tracking-wider"
                      onClick={() => toggleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Stallion <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-[10px] font-black uppercase text-cream/50 tracking-wider"
                      onClick={() => toggleSort("equity")}
                    >
                      <div className="flex items-center gap-1">
                        Holding <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-[10px] font-black uppercase text-cream/50 tracking-wider"
                      onClick={() => toggleSort("value")}
                    >
                      <div className="flex items-center gap-1">
                        Valuation <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-[10px] font-black uppercase text-cream/50 tracking-wider"
                      onClick={() => toggleSort("g1s")}
                    >
                      <div className="flex items-center gap-1">
                        Progeny <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-[10px] font-black uppercase text-cream/50 tracking-wider"
                      onClick={() => toggleSort("satisfaction")}
                    >
                      <div className="flex items-center gap-1">
                        Partner Sentiment <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-[10px] font-black uppercase text-cream/50 tracking-wider"
                      onClick={() => toggleSort("reputation")}
                    >
                      <div className="flex items-center gap-1">
                        Reputation Impact <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-cream/50 tracking-wider">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStakes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-xs text-cream/40">
                        No syndicate stakes match the selected criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedStakes.map((stake) => {
                      const impactColor =
                        stake.reputationImpactStatus === "positive"
                          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                          : stake.reputationImpactStatus === "negative"
                            ? "text-rose-400 border-rose-500/30 bg-rose-500/10"
                            : "text-sky-300 border-sky-500/30 bg-sky-500/10";

                      const satBadgeColor =
                        stake.averageSatisfaction >= 70
                          ? "text-emerald-300 border-emerald-400/30 bg-emerald-950/20"
                          : stake.averageSatisfaction >= 40
                            ? "text-amber-300 border-amber-400/30 bg-amber-950/20"
                            : "text-rose-300 border-rose-400/30 bg-rose-950/20";

                      return (
                        <TableRow
                          key={stake.id}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Stallion Identity */}
                          <TableCell className="py-3">
                            <div className="space-y-0.5">
                              <Link
                                to="/syndicate/$syndicateId"
                                params={{ syndicateId: stake.id }}
                                className="font-bold text-cream hover:text-purple-300 transition-colors flex items-center gap-1.5"
                              >
                                {stake.stallionName}
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </Link>
                              <div className="flex items-center gap-2 text-[10px] text-cream-muted">
                                <span>Age {stake.stallionAge}</span>
                                <span>·</span>
                                <span>Fee {formatCurrency(stake.studFee)}</span>
                                {stake.feeGrowth !== 0 && (
                                  <span
                                    className={`font-mono text-[9px] ${
                                      stake.feeGrowth > 0 ? "text-emerald-400" : "text-rose-400"
                                    }`}
                                  >
                                    ({stake.feeGrowth > 0 ? "+" : ""}
                                    {formatCurrency(stake.feeGrowth)})
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Holding / Shares */}
                          <TableCell className="py-3">
                            <div className="space-y-1">
                              <div className="font-mono text-xs font-semibold text-cream">
                                {stake.shares}/{stake.totalShares} ({stake.equityPct}%)
                              </div>
                              <div className="w-24 bg-white/10 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-purple-500 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(100, stake.equityPct)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>

                          {/* Valuation & Dividends */}
                          <TableCell className="py-3 font-mono">
                            <div className="text-xs font-bold text-cream">
                              {formatCurrency(stake.stakeValue)}
                            </div>
                            <div className="text-[10px] text-cream-muted">
                              Yield: {formatCurrency(stake.playerEarningsShare)}
                            </div>
                          </TableCell>

                          {/* Progeny Performance */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Badge
                                variant="outline"
                                className="text-[10px] border-amber-400/30 text-amber-300"
                              >
                                {stake.lifetimeG1Foals} G1
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-[10px] border-white/10 text-cream/60"
                              >
                                {stake.lifetimeStakesFoals} Stakes
                              </Badge>
                            </div>
                          </TableCell>

                          {/* Partner Sentiment */}
                          <TableCell className="py-3">
                            <div className="space-y-1">
                              <Badge variant="outline" className={`text-[10px] ${satBadgeColor}`}>
                                {stake.averageSatisfaction}% Avg Sat
                              </Badge>
                              {stake.investorCount > 0 && (
                                <div className="text-[9px] text-cream-muted flex items-center gap-1">
                                  <Users className="h-2.5 w-2.5" />
                                  {stake.investorCount} investor
                                  {stake.investorCount === 1 ? "" : "s"}
                                  {stake.investorAverageSatisfaction != null &&
                                    ` (${stake.investorAverageSatisfaction}%)`}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Reputation Impact */}
                          <TableCell className="py-3 max-w-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className={`text-[10px] ${impactColor}`}>
                                  {stake.reputationImpactStatus === "positive" ? (
                                    <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                                  ) : stake.reputationImpactStatus === "negative" ? (
                                    <ShieldAlert className="h-2.5 w-2.5 mr-1" />
                                  ) : null}
                                  {stake.reputationImpactLabel}
                                </Badge>
                                <span className="font-mono text-[10px] text-cream/70 font-semibold">
                                  {stake.reputationPointsTotal >= 0 ? "+" : ""}
                                  {stake.reputationPointsTotal} pts
                                </span>
                              </div>
                              <p className="text-[10px] text-cream-muted leading-tight line-clamp-2">
                                {stake.reputationImpactDescription}
                              </p>
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 text-right">
                            <Link to="/syndicate/$syndicateId" params={{ syndicateId: stake.id }}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-cream hover:text-purple-300"
                              >
                                Manage
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
