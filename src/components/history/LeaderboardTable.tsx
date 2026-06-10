import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LeaderboardTable({ leaderboard, icon, valueFormatter }: any) {
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
