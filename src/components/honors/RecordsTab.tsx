import { useGame, useGameWithShallow } from "@/game/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardTable } from "@/components/history/LeaderboardTable";
import { TrackRecordsTable } from "@/components/history/TrackRecordsTable";
import { DollarSign, Zap, Timer } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";
import type { TrackRecord } from "@/core/history/historyTypes";
import type { ProgenyLeaderboard } from "@/core/breeding/leaderboardTypes";

const EMPTY_OBJECT = {} as Record<string, never>;

export function RecordsTab() {
  const horseLeaderboards = useGameWithShallow(
    (s) => s.horseLeaderboards ?? EMPTY_OBJECT,
  ) as Record<string, ProgenyLeaderboard>;
  const trackRecords = useGameWithShallow((s) => s.trackRecords ?? EMPTY_OBJECT) as Record<
    string,
    TrackRecord
  >;

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

      <Tabs defaultValue="earnings" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-muted/50 p-1 mb-8">
          <TabsTrigger
            value="earnings"
            className="uppercase font-black text-[10px] tracking-widest"
          >
            <DollarSign size={14} className="mr-2" />
            Top Earnings
          </TabsTrigger>
          <TabsTrigger value="beyer" className="uppercase font-black text-[10px] tracking-widest">
            <Zap size={14} className="mr-2" />
            Highest Beyers
          </TabsTrigger>
          <TabsTrigger value="tracks" className="uppercase font-black text-[10px] tracking-widest">
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
