import { createFileRoute } from "@tanstack/react-router";
import { useGame, useGameWithShallow } from "@/game/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardTable } from "@/components/history/LeaderboardTable";
import { TrackRecordsTable } from "@/components/history/TrackRecordsTable";
import { DollarSign, Zap, Timer } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";

const EMPTY_OBJECT = {};

export const Route = createFileRoute("/records")({
  component: RecordsDashboard,
});

function RecordsDashboard() {
  const horseLeaderboards = useGameWithShallow((s) => s.horseLeaderboards || EMPTY_OBJECT) as any;
  const trackRecords = useGameWithShallow((s) => s.trackRecords || EMPTY_OBJECT) as any;

  const trackRecordsList = Object.values(trackRecords).sort((a: any, b: any) => {
    if (a.trackName !== b.trackName) return a.trackName.localeCompare(b.trackName);
    if (a.surface !== b.surface) return a.surface.localeCompare(b.surface);
    return a.distance - b.distance;
  });

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-primary">
          Lifetime Records
        </h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
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
            valueFormatter={(val: any) => formatCurrency(val)}
          />
        </TabsContent>

        <TabsContent value="beyer">
          <LeaderboardTable
            leaderboard={horseLeaderboards.beyer}
            icon={<Zap className="text-primary" />}
            valueFormatter={(val: any) => val.toString()}
          />
        </TabsContent>

        <TabsContent value="tracks">
          <TrackRecordsTable records={trackRecordsList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
