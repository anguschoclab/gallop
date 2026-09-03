import { useGame, useGameWithShallow } from "@/game/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardTable } from "@/components/history/LeaderboardTable";
import { TrackRecordsTable } from "@/components/history/TrackRecordsTable";
import { DollarSign, Zap, Timer, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";
import type { TrackRecord } from "@/core/history/historyTypes";
import type { ProgenyLeaderboard } from "@/core/breeding/leaderboardTypes";
import { Card, CardContent } from "@/components/ui/card";

const EMPTY_OBJECT = {} as Record<string, never>;

export function RecordsTab() {
  const horseLeaderboards = useGameWithShallow(
    (s) => s.horseLeaderboards ?? EMPTY_OBJECT,
  ) as Record<string, ProgenyLeaderboard>;
  const trackRecords = useGameWithShallow((s) => s.trackRecords ?? EMPTY_OBJECT) as Record<
    string,
    TrackRecord
  >;
  const leaderboardsUpdatedDay = useGameWithShallow((s) => s.leaderboardsUpdatedDay);
  const lastTopTenRank = useGameWithShallow((s) => s.lastTopTenRank);
  const industryEarningsUpdatedDay = useGameWithShallow((s) => s.industryEarningsUpdatedDay);
  const lastFounderUpdateDay = useGameWithShallow((s) => s.lastFounderUpdateDay);
  const lastAwardYear = useGameWithShallow((s) => s.lastAwardYear);

  const trackRecordsList = Object.values(trackRecords).sort((a, b) => {
    if (a.trackName !== b.trackName) return a.trackName.localeCompare(b.trackName);
    if (a.surface !== b.surface) return a.surface.localeCompare(b.surface);
    return a.distance - b.distance;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cream font-[family-name:var(--font-display)]">
          Lifetime Records
        </h2>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          The Hall of Champions — All-Time Rankings
        </p>
      </div>

      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="h-4 w-4 text-gold/60" />
            <h3 className="text-xs font-black uppercase tracking-wide text-cream/40">
              Data Freshness
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <span className="text-cream/40 uppercase text-[10px] font-black tracking-wide">
                Leaderboards
              </span>
              <p className="text-cream font-mono">
                {leaderboardsUpdatedDay !== undefined ? `Day ${leaderboardsUpdatedDay}` : "—"}
              </p>
            </div>
            <div>
              <span className="text-cream/40 uppercase text-[10px] font-black tracking-wide">
                Top Ten Rank
              </span>
              <p className="text-cream font-mono">
                {lastTopTenRank !== undefined ? `#${lastTopTenRank}` : "—"}
              </p>
            </div>
            <div>
              <span className="text-cream/40 uppercase text-[10px] font-black tracking-wide">
                Industry Earnings
              </span>
              <p className="text-cream font-mono">
                {industryEarningsUpdatedDay !== undefined
                  ? `Day ${industryEarningsUpdatedDay}`
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-cream/40 uppercase text-[10px] font-black tracking-wide">
                Founder Update
              </span>
              <p className="text-cream font-mono">
                {lastFounderUpdateDay !== undefined ? `Day ${lastFounderUpdateDay}` : "—"}
              </p>
            </div>
            <div>
              <span className="text-cream/40 uppercase text-[10px] font-black tracking-wide">
                Last Awards
              </span>
              <p className="text-cream font-mono">
                {lastAwardYear !== undefined ? `Year ${lastAwardYear}` : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="earnings" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-muted/50 p-1 mb-8">
          <TabsTrigger value="earnings" className="uppercase font-black text-[10px] tracking-wide">
            <DollarSign size={14} className="mr-2" />
            Top Earnings
          </TabsTrigger>
          <TabsTrigger value="beyer" className="uppercase font-black text-[10px] tracking-wide">
            <Zap size={14} className="mr-2" />
            Highest Beyers
          </TabsTrigger>
          <TabsTrigger value="tracks" className="uppercase font-black text-[10px] tracking-wide">
            <Timer size={14} className="mr-2" />
            Track Records
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earnings">
          <LeaderboardTable
            leaderboard={horseLeaderboards.earnings}
            icon={<DollarSign className="text-gold" />}
            valueFormatter={(val: number) => formatCurrency(val)}
          />
        </TabsContent>

        <TabsContent value="beyer">
          <LeaderboardTable
            leaderboard={horseLeaderboards.beyer}
            icon={<Zap className="text-primary" />}
            valueFormatter={(val: number) => val.toString()}
          />
        </TabsContent>

        <TabsContent value="tracks">
          <TrackRecordsTable records={trackRecordsList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
