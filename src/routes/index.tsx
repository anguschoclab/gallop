import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { overall } from "@/components/HorseBits";
import { Trophy, BarChart2, Calendar, TrendingUp } from "lucide-react";
import { HorsePortrait } from "@/components/HorsePortrait";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { day, cash, horses, races, log, awards } = useGame();
  const upcoming = races
    .filter((r) => !r.resolved && r.day >= day)
    .sort((a, b) => a.day - b.day)
    .slice(0, 5);
  const myRunning = upcoming.filter((r) => r.entries.some((e) => e.owned));
  const playerAwards = awards?.filter((a) => !a.stableId) ?? [];
  const hotyCount = playerAwards.filter((a) => a.category === "horse_of_the_year").length;

  const grades = ["G1", "G2", "G3"] as const;
  const gradeData = grades.map((grade) => {
    const gradeRaces = upcoming.filter((r) => r.graded?.grade === grade);
    const owned = gradeRaces.filter((r) => r.entries.some((e) => e.owned)).length;
    return { grade, owned };
  });

  const gradeLabelColor: Record<"G1" | "G2" | "G3", string> = {
    G1: "text-fame border-fame/40 bg-fame/10",
    G2: "text-muted-foreground border-muted-foreground/40 bg-muted-foreground/10",
    G3: "text-info border-info/40 bg-info/10",
  };

  // Recent graded winners (from Recap)
  const weekAgo = day - 7;
  const recentGradedWinners = races
    .filter((r) => r.resolved && r.graded && r.result && r.result.length > 0 && r.day >= weekAgo)
    .sort((a, b) => b.day - a.day)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground tabular-nums">{gameCalendarDate(day)}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/recap">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart2 className="h-4 w-4" />
              Weekly Recap
            </Button>
          </Link>
          <Link to="/awards">
            <Button variant="outline" size="sm" className="gap-2">
              <Trophy className="h-4 w-4" />
              Trophy Case
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cash on hand</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">${cash.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Horses owned</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{horses.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">My next races</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{myRunning.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awards</CardTitle>
            <Trophy className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tabular-nums">{playerAwards.length}</p>
              {hotyCount > 0 && <span className="text-xs text-fame font-medium tabular-nums">{hotyCount} HOTY</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Grade Targets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {gradeData.map(({ grade, owned }) => (
                <div key={grade} className="text-center">
                  <div className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold mb-1 ${gradeLabelColor[grade]}`}>
                    {grade}
                  </div>
                  <div className="text-lg font-bold tabular-nums">{owned}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Graded Winners</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {recentGradedWinners.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">No graded results this week.</p>
            ) : (
              <div className="space-y-2">
                {recentGradedWinners.map((r) => {
                  const winnerId = r.result?.[0]?.horseId;
                  const winner = horses.find(h => h.id === winnerId);
                  return (
                    <div key={r.id} className="flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`h-4 px-1 text-[9px] ${gradeLabelColor[r.graded!.grade]}`}>{r.graded!.grade}</Badge>
                        <span className="font-medium truncate max-w-[120px]">{r.name}</span>
                      </div>
                      <span className="text-muted-foreground truncate max-w-[100px]">{winner?.name ?? "Unknown"}</span>
                      <span className="tabular-nums text-muted-foreground">D{r.day}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Top Stable Stars</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {horses.slice().sort((a, b) => overall(b) - overall(a)).slice(0, 5).map((h) => (
              <Link key={h.id} to="/stable/$horseId" params={{ horseId: h.id }} className="flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors">
                <HorsePortrait coatColor={h.coatColor} size="sm" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{h.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">Age {h.age} · OVR {overall(h)}</p>
                </div>
                <Badge variant="secondary" className="tabular-nums text-[10px]">E {h.energy}</Badge>
              </Link>
            ))}
            {horses.length === 0 && <p className="text-sm text-muted-foreground">No horses in training.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Entries</CardTitle>
            <Link to="/races" search={{ grade: "all", country: "all", surface: "all", track: "all", owned: "all", q: "" }}><Button size="sm" variant="ghost">View Calendar</Button></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                <div>
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">Day {r.day} · {r.distance}m · {r.raceClass}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">${r.purse.toLocaleString()}</p>
                  {r.entries.some((e) => e.owned) && <Badge variant="default" className="text-[9px] bg-success">Entered</Badge>}
                </div>
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground italic">No upcoming races scheduled.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Stable Log</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {log.slice(0, 8).map((l, i) => (
            <div key={i} className="text-sm flex gap-3 border-b border-border/30 last:border-0 py-1">
              <span className="text-muted-foreground tabular-nums w-10 shrink-0">D{l.day}</span>
              <span className="text-foreground/80">{l.text}</span>
            </div>
          ))}
          {log.length === 0 && <p className="text-sm text-muted-foreground italic">No recent activity.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
