import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { SilkDot } from "@/domains/shell/ui/SilkDot";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { useSeasonStandings } from "@/domains/dashboard/application/hooks/useSeasonStandings";
import { useWealthStandings } from "@/domains/dashboard/application/hooks/useWealthStandings";
import { useStandingsMessages } from "@/domains/dashboard/application/hooks/useStandingsMessages";
import { buildStandingsRows } from "@/domains/standings/application/standingsFacade";
import { StableDetailsPanel } from "@/domains/dashboard/ui/StableDetailsPanel";
import { WealthDetailsPanel } from "@/domains/dashboard/ui/WealthDetailsPanel";
import { formatCurrency } from "@/shared/common/formatting";
import { cn } from "@/shared/lib/cn";
import { Trophy, Bell, Coins, Award } from "lucide-react";
import { useGameWithShallow } from "@/platform/game/store";
import { STANDINGS_RECENT_AWARDS_LIMIT } from "@/domains/awards/model/awardsConstants";
import {
  DASHBOARD_SEASON_STANDINGS_LIMIT,
  DASHBOARD_WEALTH_STANDINGS_LIMIT,
  STANDINGS_RANGE_SHORT_DAYS,
  STANDINGS_RANGE_MEDIUM_DAYS,
  STANDINGS_RANGE_LONG_DAYS,
  STANDINGS_DEFAULT_RANGE_DAYS,
  STANDINGS_SKELETON_ROW_COUNT,
  WEALTH_TAB_VALUE,
  EARNINGS_TAB_VALUE,
} from "@/shared/constants/dashboardConstants";
import {
  SPARKLINE_WIDTH,
  SPARKLINE_HEIGHT,
  SPARKLINE_STROKE_WIDTH,
} from "@/shared/constants/uiConstants";
import {
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_DESCRIPTIONS,
} from "@/domains/awards/application/awardsFacade";

const RANGES = [
  { label: "7D", days: STANDINGS_RANGE_SHORT_DAYS },
  { label: "30D", days: STANDINGS_RANGE_MEDIUM_DAYS },
  { label: "90D", days: STANDINGS_RANGE_LONG_DAYS },
];

function Sparkline({ data, positive = true }: { data: number[]; positive?: boolean }) {
  const w = SPARKLINE_WIDTH;
  const h = SPARKLINE_HEIGHT;
  const max = Math.max(1, ...data);
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const cls = positive ? "stroke-success" : "stroke-foreground/40";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
      <polyline
        fill="none"
        strokeWidth={SPARKLINE_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cls}
        points={points}
      />
    </svg>
  );
}

export function SeasonStandingsWidget() {
  const [rangeDays, setRangeDays] = useState(STANDINGS_DEFAULT_RANGE_DAYS);
  const [selectedStableId, setSelectedStableId] = useState<string | null>(null);
  const [selectedWealthStableId, setSelectedWealthStableId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(EARNINGS_TAB_VALUE);

  const { standings, playerRank } = useSeasonStandings(rangeDays);
  const wealthStandings = useWealthStandings();
  const standingsMessages = useStandingsMessages();
  const { horses, awards } = useGameWithShallow((s) => ({ horses: s.horses, awards: s.awards }));
  const allHorses = Object.values(horses);
  const { rows, playerInTop, topNLength } = buildStandingsRows(
    standings,
    playerRank,
    DASHBOARD_SEASON_STANDINGS_LIMIT,
  );

  const selectedStable = standings.find((s) => s.stableId === selectedStableId) ?? null;
  const selectedWealthStable =
    wealthStandings.standings.find((s) => s.stableId === selectedWealthStableId) ?? null;

  const displayRank = activeTab === WEALTH_TAB_VALUE ? wealthStandings.playerRank : playerRank;

  const wealthRows = wealthStandings.standings.slice(0, DASHBOARD_WEALTH_STANDINGS_LIMIT);
  const wealthPlayerInTop = wealthRows.some((s) => s.isPlayer);
  const wealthPlayerEntry = wealthStandings.standings.find((s) => s.isPlayer) ?? null;

  return (
    <Card className="border-border bg-slate-900/20 group hover:border-primary/40 transition-all duration-300 lg:col-span-6">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] text-foreground tracking-tight">
            Season Standings
          </CardTitle>
          {standingsMessages.length > 0 && (
            <div data-testid="standings-badge" className="relative">
              <Bell className="h-4 w-4 text-primary" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary text-[8px] flex items-center justify-center text-slate-950 font-bold">
                {standingsMessages.length}
              </span>
            </div>
          )}
        </div>
        <Badge
          variant="outline"
          className="border-primary/30 text-primary/30 bg-primary/5 font-mono tracking-wide text-[10px] uppercase h-5"
        >
          You: #{displayRank || "—"}
        </Badge>
      </CardHeader>
      <CardContent className="pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={EARNINGS_TAB_VALUE}>
          <TabsList className="mb-3">
            <TabsTrigger value={EARNINGS_TAB_VALUE} className="text-xs gap-1">
              <Trophy className="h-3 w-3" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value={WEALTH_TAB_VALUE} className="text-xs gap-1">
              <Coins className="h-3 w-3" />
              Wealth
            </TabsTrigger>
          </TabsList>

          <TabsContent value={EARNINGS_TAB_VALUE}>
            {/* Time-range selector */}
            <div className="flex items-center gap-1 mb-3">
              {RANGES.map((r) => (
                <Button
                  key={r.label}
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-6 px-2 text-[10px] font-mono uppercase tracking-wider",
                    rangeDays === r.days
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-foreground/40 border border-white/5",
                  )}
                  onClick={() => setRangeDays(r.days)}
                >
                  {r.label}
                </Button>
              ))}
            </div>

            {standings.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: STANDINGS_SKELETON_ROW_COUNT }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 py-2">
                    <Skeleton className="w-6 h-6" />
                    <Skeleton className="h-4 flex-1 max-w-[180px]" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : standings.length === 1 && standings[0].rangePrizeMoney === 0 ? (
              <p className="text-xs text-foreground/30 italic text-center py-6">
                No prize money earned yet this season.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="font-mono text-[9px] uppercase tracking-wide text-foreground/40 border-b border-white/5">
                        <th scope="col" className="py-2 px-2 w-8 text-right">
                          #
                        </th>
                        <th scope="col" className="py-2 px-2 text-left">
                          Stable
                        </th>
                        <th scope="col" className="py-2 px-2 text-right">
                          {RANGES.find((r) => r.days === rangeDays)?.label} Earnings
                        </th>
                        <th scope="col" className="py-2 px-2 text-right hidden sm:table-cell">
                          Trend
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rows.map((s, i) => {
                        if (!s) return null;
                        const rank = s.isPlayer && !playerInTop ? playerRank : i + 1;
                        const showDivider = s.isPlayer && !playerInTop && i === topNLength;
                        return (
                          <tr
                            key={s.stableId}
                            className={cn(
                              "transition-colors cursor-pointer min-h-[44px]",
                              s.isPlayer
                                ? "bg-primary/10 hover:bg-primary/15"
                                : "hover:bg-white/[0.02]",
                              showDivider && "border-t-2 border-dashed border-white/10",
                              selectedStableId === s.stableId && "ring-1 ring-primary/30",
                            )}
                            onClick={() => setSelectedStableId(s.stableId)}
                          >
                            <td
                              className={cn(
                                "py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs",
                                rank === 1 ? "text-fame font-black" : "text-foreground/50",
                              )}
                            >
                              {rank}
                            </td>
                            <td className="py-2.5 sm:py-2 px-2">
                              <div className="flex items-center gap-2">
                                {s.silkColor && <SilkDot color={s.silkColor} size="sm" />}
                                <span
                                  className={cn(
                                    "text-xs truncate max-w-[120px] sm:max-w-[180px]",
                                    s.isPlayer
                                      ? "font-black text-primary"
                                      : "font-medium text-foreground/80",
                                  )}
                                >
                                  {s.isPlayer ? (
                                    s.name
                                  ) : (
                                    <Link
                                      to="/npc-stables/$stableId"
                                      params={{ stableId: s.stableId }}
                                    >
                                      {s.name}
                                    </Link>
                                  )}
                                </span>
                                {!s.isPlayer && s.winsVsPlayer > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-[8px] h-3.5 px-1 border-destructive/40 text-destructive"
                                    title="Recent wins against you"
                                  >
                                    ×{s.winsVsPlayer}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs text-foreground/80">
                              {formatCurrency(s.rangePrizeMoney)}
                            </td>
                            <td className="py-2.5 sm:py-2 px-2 hidden sm:table-cell">
                              <div className="flex justify-end">
                                <Sparkline data={s.sparkline} positive={s.isPlayer} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedStable && <StableDetailsPanel stable={selectedStable} />}
              </div>
            )}
          </TabsContent>

          <TabsContent value={WEALTH_TAB_VALUE}>
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="font-mono text-[9px] uppercase tracking-wide text-foreground/40 border-b border-white/5">
                      <th scope="col" className="py-2 px-2 w-8 text-right">
                        #
                      </th>
                      <th scope="col" className="py-2 px-2 text-left">
                        Stable
                      </th>
                      <th scope="col" className="py-2 px-2 text-right">
                        Cash
                      </th>
                      <th scope="col" className="py-2 px-2 text-right">
                        Horse Assets
                      </th>
                      <th scope="col" className="py-2 px-2 text-right">
                        Total Wealth
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {wealthRows.map((s, i) => {
                      const rank = i + 1;
                      const showDivider =
                        !wealthPlayerInTop && wealthPlayerEntry && i === wealthRows.length - 1;
                      return (
                        <tr
                          key={s.stableId}
                          className={cn(
                            "transition-colors cursor-pointer min-h-[44px]",
                            s.isPlayer
                              ? "bg-primary/10 hover:bg-primary/15"
                              : "hover:bg-white/[0.02]",
                            showDivider && "border-t-2 border-dashed border-white/10",
                            selectedWealthStableId === s.stableId && "ring-1 ring-primary/30",
                          )}
                          onClick={() => setSelectedWealthStableId(s.stableId)}
                        >
                          <td
                            className={cn(
                              "py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs",
                              rank === 1 ? "text-fame font-black" : "text-foreground/50",
                            )}
                          >
                            {rank}
                          </td>
                          <td className="py-2.5 sm:py-2 px-2">
                            <div className="flex items-center gap-2">
                              {s.silkColor && <SilkDot color={s.silkColor} size="sm" />}
                              <span
                                className={cn(
                                  "text-xs truncate max-w-[120px] sm:max-w-[180px]",
                                  s.isPlayer
                                    ? "font-black text-primary"
                                    : "font-medium text-foreground/80",
                                )}
                              >
                                {s.isPlayer ? (
                                  s.name
                                ) : (
                                  <Link
                                    to="/npc-stables/$stableId"
                                    params={{ stableId: s.stableId }}
                                  >
                                    {s.name}
                                  </Link>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs text-foreground/80">
                            {formatCurrency(s.cash)}
                          </td>
                          <td className="py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs text-foreground/80">
                            {formatCurrency(s.horseAssets)}
                          </td>
                          <td className="py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs text-foreground font-bold">
                            {formatCurrency(s.totalWealth)}
                          </td>
                        </tr>
                      );
                    })}
                    {!wealthPlayerInTop && wealthPlayerEntry && (
                      <tr
                        key={wealthPlayerEntry.stableId}
                        className={cn(
                          "transition-colors cursor-pointer min-h-[44px] bg-primary/10 hover:bg-primary/15 border-t-2 border-dashed border-white/10",
                          selectedWealthStableId === wealthPlayerEntry.stableId &&
                            "ring-1 ring-primary/30",
                        )}
                        onClick={() => setSelectedWealthStableId(wealthPlayerEntry.stableId)}
                      >
                        <td className="py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs text-foreground/50">
                          {wealthStandings.playerRank}
                        </td>
                        <td className="py-2.5 sm:py-2 px-2">
                          <div className="flex items-center gap-2">
                            {wealthPlayerEntry.silkColor && (
                              <SilkDot color={wealthPlayerEntry.silkColor} size="sm" />
                            )}
                            <span className="text-xs truncate max-w-[120px] sm:max-w-[180px] font-black text-primary">
                              {wealthPlayerEntry.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs text-foreground/80">
                          {formatCurrency(wealthPlayerEntry.cash)}
                        </td>
                        <td className="py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs text-foreground/80">
                          {formatCurrency(wealthPlayerEntry.horseAssets)}
                        </td>
                        <td className="py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs text-foreground font-bold">
                          {formatCurrency(wealthPlayerEntry.totalWealth)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedWealthStable && (
                <WealthDetailsPanel stable={selectedWealthStable} horses={allHorses} />
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Recent awards summary */}
        {(() => {
          const playerAwards = awards
            .filter((a) => !a.stableId)
            .sort((a, b) => b.year - a.year)
            .slice(0, STANDINGS_RECENT_AWARDS_LIMIT);
          if (playerAwards.length === 0) return null;
          return (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-3 w-3 text-primary" />
                <span className="text-[9px] font-mono uppercase tracking-wide text-foreground/40">
                  Recent Awards
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {playerAwards.map((a) => (
                  <Link
                    key={a.id}
                    to="/awards/$category"
                    params={{ category: a.category }}
                    title={CATEGORY_DESCRIPTIONS[a.category]}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all text-xs text-foreground"
                  >
                    <Trophy className="h-3 w-3 text-primary" />
                    <span className="font-medium">{CATEGORY_DISPLAY_NAMES[a.category]}</span>
                    <span className="text-[10px] text-muted-foreground">Y{a.year}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
