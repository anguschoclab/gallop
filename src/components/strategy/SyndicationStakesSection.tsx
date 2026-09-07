import {
  calculateSyndicationBreakdown,
  evaluateSyndicationEligibility,
  evaluateInvestorAppetite,
} from "@/core/breeding/strategySyndicationHelpers";
import { formatCurrency } from "@/core/common/formatting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Coins,
  Trophy,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import type { Horse } from "@/game/types";

interface SyndicationStakesSectionProps {
  horse: Horse;
  horses?: Record<string, Horse>;
  onOpenSyndicateDialog?: () => void;
}

export function SyndicationStakesSection({
  horse,
  horses = {},
  onOpenSyndicateDialog,
}: SyndicationStakesSectionProps) {
  const allHorsesList = Object.values(horses);
  const breakdown = calculateSyndicationBreakdown(horse, allHorsesList);
  const eligibility = evaluateSyndicationEligibility(horse);
  const appetiteReport = evaluateInvestorAppetite(horse);
  const appetiteList = Object.values(appetiteReport);

  const getInterestBadge = (interest: string) => {
    switch (interest) {
      case "High":
        return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
      case "Moderate":
        return "text-blue-400 border-blue-500/30 bg-blue-500/10";
      case "Cautious":
        return "text-amber-400 border-amber-500/30 bg-amber-500/10";
      default:
        return "text-muted-foreground border-border bg-muted/20";
    }
  };

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <div>
              <CardTitle className="text-base font-semibold">
                Syndication Stakes & Commercial Horizon
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Commercial Stud Valuation & Bloodstock Enterprise Planning
              </p>
            </div>
          </div>
          <div>
            {eligibility.isEligible ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Eligible for Syndication
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-400 border-amber-500/30 gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> G1 Victory Required
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/30 border border-border/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              Total Enterprise Value
            </div>
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(breakdown.totalValuation)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              40 shares @ {formatCurrency(breakdown.sharePrice)}
            </div>
          </div>

          <div className="bg-muted/30 border border-border/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              Upfront Liquid Proceeds
            </div>
            <div className="text-lg font-bold text-blue-400">
              {formatCurrency(breakdown.liquidCapitalProceeds)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              20 shares syndicated (50%)
            </div>
          </div>

          <div className="bg-muted/30 border border-border/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Player Retained Equity
            </div>
            <div className="text-lg font-bold text-emerald-400">
              {breakdown.recommendedPlayerShares} Shares (50%)
            </div>
            <div className="text-[11px] text-muted-foreground">
              Value: {formatCurrency(breakdown.playerEquityValue)}
            </div>
          </div>

          <div className="bg-muted/30 border border-border/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              Annual Dividends
            </div>
            <div className="text-lg font-bold text-purple-400">
              {formatCurrency(breakdown.estimatedAnnualDividend)}/yr
            </div>
            <div className="text-[11px] text-muted-foreground">
              Standing fee: {formatCurrency(breakdown.standingFee)}
            </div>
          </div>
        </div>

        {/* 40-Share Model Structure Breakdown */}
        <div className="bg-muted/20 border border-border/40 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              40-Share Syndication Model Ownership Distribution
            </h4>
            <span className="text-xs text-muted-foreground">
              Total 40 Shares (Standard Bloodstock Charter)
            </span>
          </div>

          {/* Visual bar */}
          <div className="h-5 w-full bg-muted/60 rounded-full overflow-hidden flex border border-border/50">
            <div
              className="bg-emerald-500/80 h-full flex items-center justify-center text-[10px] font-bold text-white tracking-wide"
              style={{ width: "50%" }}
            >
              Player Retained (20 Shares)
            </div>
            <div
              className="bg-blue-500/80 h-full flex items-center justify-center text-[10px] font-bold text-white tracking-wide"
              style={{ width: "50%" }}
            >
              Public / Investor Shares (20 Shares)
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="flex items-start gap-2 bg-emerald-500/5 p-2.5 rounded border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Retained Breeding Rights:</span>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Provides 20 annual complimentary covers for your home broodmare band or
                  re-sale on secondary market.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-blue-500/5 p-2.5 rounded border border-blue-500/20">
              <Coins className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Cash Liquidity Realization:</span>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Unlocks {formatCurrency(breakdown.liquidCapitalProceeds)} immediately to finance
                  racing operations, facilities, or yearling purchases.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Commercial Gate & Eligibility Status */}
        <div className="border border-border/40 rounded-lg p-3 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-foreground">
                Commercial Stallion Gate
              </span>
              {eligibility.g1Wins >= 1 ? (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> G1 Winner Unlocked
                </span>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" /> Must win a Grade 1 race to syndicate
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {eligibility.reason ||
                "Grade 1 winners qualify for premier commercial bloodstock syndication charters."}
            </p>
          </div>

          <Button
            size="sm"
            onClick={onOpenSyndicateDialog}
            disabled={!eligibility.isEligible}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0"
          >
            <Building2 className="w-4 h-4 mr-1.5" />
            Syndicate Stallion
          </Button>
        </div>

        {/* Investor Appetite Matrix */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              Commercial Syndicate Investor Appetite Matrix
            </h4>
            <span className="text-xs text-muted-foreground">
              Projected demand across bloodstock buyer syndicates
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {appetiteList.map((investor) => {
              const badgeColor = getInterestBadge(investor.interest);

              return (
                <div
                  key={investor.personality}
                  className="bg-muted/30 border border-border/40 rounded-lg p-2.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {investor.personality} Stable
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badgeColor}`}>
                        {investor.interest}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {investor.criteria}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
