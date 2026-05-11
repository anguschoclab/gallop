import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame, useGameWithShallow } from "@/game/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, DollarSign, Zap, Timer } from "lucide-react";
import { formatCurrency, formatTime } from "@/lib/formatting";

const EMPTY_OBJECT = {};

export const Route = createFileRoute("/records")({
  component: RecordsDashboard,
});

function RecordsDashboard() {
  const horseLeaderboards = useGameWithShallow((s) => s.horseLeaderboards || EMPTY_OBJECT) as any;
  const trackRecords = useGameWithShallow((s) => s.trackRecords || EMPTY_OBJECT) as any;

  const trackRecordsList = Object.values(trackRecords).sort((a, b) => {
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
            valueFormatter={(val) => formatCurrency(val)}
          />
        </TabsContent>

        <TabsContent value="beyer">
          <LeaderboardTable
            leaderboard={horseLeaderboards.beyer}
            icon={<Zap className="text-primary" />}
            valueFormatter={(val) => val.toString()}
          />
        </TabsContent>

        <TabsContent value="tracks">
          <TrackRecordsTable records={trackRecordsList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardTable({ leaderboard, icon, valueFormatter }: any) {
  if (!leaderboard || !leaderboard.rankings || leaderboard.rankings.length === 0) {
    return (
      <Card className="bg-card border-white/5">
        <CardContent className="py-12 text-center text-muted-foreground uppercase font-black text-xs tracking-widest">
          No records found yet. Keep racing to populate the leaderboards.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-white/5 overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-white/5">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          {icon}
          {leaderboard.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-white/5">
              <tr>
                <th className="px-6 py-3 w-16">Rank</th>
                <th className="px-6 py-3">Horse</th>
                <th className="px-6 py-3">Sire</th>
                <th className="px-6 py-3 text-right">Metric</th>
                <th className="px-6 py-3 text-right">Wins/Starts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaderboard.rankings.map((entry: any) => (
                <tr key={entry.horseId} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-6 py-4 font-black italic text-primary group-hover:text-gold transition-colors tabular-nums">
                    #{entry.rank}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to="/stable/$horseId"
                      params={{ horseId: entry.horseId }}
                      className="font-bold uppercase tracking-tight hover:text-gold transition-colors"
                    >
                      {entry.horseName}
                    </Link>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Age {entry.metrics.age}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {entry.sireName || "Unknown"}
                  </td>
                  <td className="px-6 py-4 text-right font-black tabular-nums text-primary group-hover:text-gold transition-colors">
                    {valueFormatter(entry.value)}
                  </td>
                  <td className="px-6 py-4 text-right text-xs tabular-nums text-muted-foreground">
                    {entry.metrics.wins} / {entry.metrics.starts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TrackRecordsTable({ records }: { records: any[] }) {
  if (records.length === 0) {
    return (
      <Card className="bg-card border-white/5">
        <CardContent className="py-12 text-center text-muted-foreground uppercase font-black text-xs tracking-widest">
          No track records set yet. Records are established by winning horses.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-white/5 overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-white/5">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <Timer className="text-primary" />
          All-Time Track Records
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-white/5">
              <tr>
                <th className="px-6 py-3">Track</th>
                <th className="px-6 py-3">Surface</th>
                <th className="px-6 py-3">Distance</th>
                <th className="px-6 py-3 text-right">Time</th>
                <th className="px-6 py-3">Holder</th>
                <th className="px-6 py-3 text-right">Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {records.map((record) => (
                <tr
                  key={`${record.trackId}_${record.surface}_${record.distance}`}
                  className="hover:bg-primary/5 transition-colors group"
                >
                  <td className="px-6 py-4 font-bold uppercase tracking-tight group-hover:text-gold transition-colors">
                    {record.trackName}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${
                        record.surface === "Turf"
                          ? "bg-green-500/20 text-green-500"
                          : record.surface === "Dirt"
                            ? "bg-amber-900/30 text-amber-600"
                            : "bg-blue-500/20 text-blue-500"
                      }`}
                    >
                      {record.surface}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs tabular-nums font-bold">{record.distance}m</td>
                  <td className="px-6 py-4 text-right font-black tabular-nums text-primary group-hover:text-gold transition-colors">
                    {formatTime(record.time)}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold uppercase tracking-tighter">
                    {record.horseName}
                  </td>
                  <td className="px-6 py-4 text-right text-xs tabular-nums text-muted-foreground">
                    Year {record.year}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
