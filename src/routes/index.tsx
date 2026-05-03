import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { overall, SilkBadge } from "@/components/HorseBits";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { day, cash, horses, races, log } = useGame();
  const upcoming = races
    .filter((r) => !r.resolved && r.day >= day)
    .sort((a, b) => a.day - b.day)
    .slice(0, 5);
  const myRunning = upcoming.filter((r) => r.entries.some((e) => e.owned));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">{gameCalendarDate(day)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cash on hand</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">${cash.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Horses owned</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{horses.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">My next races</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{myRunning.length}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Top horses</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {horses.slice().sort((a, b) => overall(b) - overall(a)).slice(0, 5).map((h) => (
              <Link key={h.id} to="/stable/$horseId" params={{ horseId: h.id }} className="flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors">
                <SilkBadge color={h.silk} />
                <div className="flex-1">
                  <p className="font-medium">{h.name}</p>
                  <p className="text-xs text-muted-foreground">Age {h.age} · OVR {overall(h)}</p>
                </div>
                <Badge variant="secondary">⚡ {h.energy}</Badge>
              </Link>
            ))}
            {horses.length === 0 && <p className="text-sm text-muted-foreground">No horses yet — visit the market.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming races</CardTitle>
            <Link to="/races" search={{ grade: "all", country: "all", surface: "all", track: "all" }}><Button size="sm" variant="ghost">View all</Button></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                <div>
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground">Day {r.day} · {r.distance}m · {r.raceClass}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">${r.purse.toLocaleString()}</p>
                  {r.entries.some((e) => e.owned) && <Badge variant="default" className="text-xs">Entered</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {log.slice(0, 10).map((l, i) => (
            <div key={i} className="text-sm flex gap-3">
              <span className="text-muted-foreground tabular-nums w-12">D{l.day}</span>
              <span>{l.text}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
