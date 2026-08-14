import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SilkDot } from "@/components/SilkDot";
import { useGame } from "@/game/store";
import { useSeasonStandings } from "@/hooks/dashboard/useSeasonStandings";
import { StableDetailsPanel } from "@/components/dashboard/StableDetailsPanel";
import { formatCurrency } from "@/core/common/formatting";
import { cn } from "@/lib/cn";
import { Trophy, Bell } from "lucide-react";
import { DASHBOARD_SEASON_STANDINGS_LIMIT } from "@/constants";

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

function Sparkline({ data, positive = true }: { data: number[]; positive?: boolean }) {
  const w = 80;
  const h = 20;
  const max = Math.max(1, ...data);
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const cls = positive ? "stroke-success" : "stroke-cream/40";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
      <polyline
        fill="none"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cls}
        points={points}
      />
    </svg>
  );
}

export function SeasonStandingsWidget() {
  const [rangeDays, setRangeDays] = useState(30);
  const [selectedStableId, setSelectedStableId] = useState<string | null>(null);

  const { standings, playerRank } = useSeasonStandings(rangeDays);

  const inbox = useGame((s) => s.inbox);
  const standingsMessages = useMemo(
    () => inbox.filter((m) => m.category === "standings" && !m.readAt),
    [inbox],
  );

  const top10 = standings.slice(0, DASHBOARD_SEASON_STANDINGS_LIMIT);
  const playerInTop = top10.some((s) => s.isPlayer);
  const rows = playerInTop ? top10 : [...top10, standings[playerRank - 1]].filter(Boolean);

  const selectedStable = standings.find((s) => s.stableId === selectedStableId) ?? null;

  return (
    <Card className="border-gold-muted bg-slate-900/20 group hover:border-gold/40 transition-all duration-300 lg:col-span-6">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-gold/10 flex items-center justify-center border border-gold/20 group-hover:bg-gold/20 transition-colors">
            <Trophy className="h-4 w-4 text-gold" />
          </div>
          <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] text-cream tracking-tight">
            Season Standings
          </CardTitle>
          {standingsMessages.length > 0 && (
            <div data-testid="standings-badge" className="relative">
              <Bell className="h-4 w-4 text-gold" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-gold text-[8px] flex items-center justify-center text-slate-950 font-bold">
                {standingsMessages.length}
              </span>
            </div>
          )}
        </div>
        <Badge
          variant="outline"
          className="border-gold/30 text-gold-muted bg-gold/5 font-mono tracking-widest text-[10px] uppercase h-5"
        >
          You: #{playerRank || "—"}
        </Badge>
      </CardHeader>
      <CardContent className="pt-3">
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
                  ? "bg-gold/20 text-gold border border-gold/30"
                  : "text-cream/40 border border-white/5",
              )}
              onClick={() => setRangeDays(r.days)}
            >
              {r.label}
            </Button>
          ))}
        </div>

        {standings.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <Skeleton className="w-6 h-6" />
                <Skeleton className="h-4 flex-1 max-w-[180px]" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : standings.length === 1 && standings[0].rangePrizeMoney === 0 ? (
          <p className="text-xs text-cream/30 italic text-center py-6">
            No prize money earned yet this season.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-cream/40 border-b border-white/5">
                    <th className="py-2 px-2 w-8 text-right">#</th>
                    <th className="py-2 px-2 text-left">Stable</th>
                    <th className="py-2 px-2 text-right">
                      {RANGES.find((r) => r.days === rangeDays)?.label} Earnings
                    </th>
                    <th className="py-2 px-2 text-right hidden sm:table-cell">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((s, i) => {
                    if (!s) return null;
                    const rank = s.isPlayer && !playerInTop ? playerRank : i + 1;
                    const showDivider = s.isPlayer && !playerInTop && i === top10.length;
                    return (
                      <tr
                        key={s.stableId}
                        className={cn(
                          "transition-colors cursor-pointer min-h-[44px]",
                          s.isPlayer ? "bg-gold/10 hover:bg-gold/15" : "hover:bg-white/[0.02]",
                          showDivider && "border-t-2 border-dashed border-white/10",
                          selectedStableId === s.stableId && "ring-1 ring-gold/30",
                        )}
                        onClick={() => setSelectedStableId(s.stableId)}
                      >
                        <td
                          className={cn(
                            "py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs",
                            rank === 1 ? "text-fame font-black" : "text-cream/50",
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
                                s.isPlayer ? "font-black text-gold" : "font-medium text-cream/80",
                              )}
                            >
                              {s.isPlayer ? (
                                s.name
                              ) : (
                                <Link to="/npc-stables/$stableId" params={{ stableId: s.stableId }}>
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
                        <td className="py-2.5 sm:py-2 px-2 text-right font-mono tabular-nums text-xs text-cream/80">
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
      </CardContent>
    </Card>
  );
}
