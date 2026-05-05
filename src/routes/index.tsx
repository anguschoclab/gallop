import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { overall, NumericValue } from "@/components/HorseBits";
import { SilkDot } from "@/components/SilkDot";
import { Trophy, BarChart2, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { getGradeColorClass } from "@/core/race/grading";
import { cn } from "@/lib/utils";
import { ReputationBadge } from "@/components/ReputationBadge";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { day, cash, horses, races, log, awards, reputation } = useGame();
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

  // Recent reputation events
  const recentReputationEvents = reputation?.events?.slice(-5).reverse() ?? [];

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
          {/* Design Bible: Page titles use Cormorant Garamond display font */}
          <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">Dashboard</h1>
          <p className="text-cream-muted font-[family-name:var(--font-mono)] tabular-nums">{gameCalendarDate(day)}</p>
        </div>
        <div className="flex items-center gap-4">
          <ReputationBadge />
          <div className="flex gap-2">
            <Link to="/financial-report">
              <Button variant="outline" size="sm" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Financial Report
              </Button>
            </Link>
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
      </div>

      {/* Stat Tiles - Design Bible: Numbers are the protagonist */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gold-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cream-muted font-[family-name:var(--font-body)]">Cash on hand</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-[family-name:var(--font-mono)] tabular-nums text-cream">${cash.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-gold-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cream-muted font-[family-name:var(--font-body)]">Horses owned</CardTitle>
          </CardHeader>
          <CardContent>
            <NumericValue value={horses.length} className="text-3xl font-bold text-cream" />
          </CardContent>
        </Card>
        <Card className="border-gold-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cream-muted font-[family-name:var(--font-body)]">My next races</CardTitle>
          </CardHeader>
          <CardContent>
            <NumericValue value={myRunning.length} className="text-3xl font-bold text-cream" />
          </CardContent>
        </Card>
        <Card className="border-gold-muted">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-cream-muted font-[family-name:var(--font-body)]">Awards</CardTitle>
            <Trophy className="w-4 h-4 text-cream-muted" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <NumericValue value={playerAwards.length} className="text-3xl font-bold text-cream" />
              {hotyCount > 0 && <span className="text-xs text-fame font-medium font-[family-name:var(--font-mono)] tabular-nums">{hotyCount} HOTY</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 border-gold-muted">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-cream-muted font-[family-name:var(--font-body)]">Grade Targets</CardTitle>
            <TrendingUp className="h-4 w-4 text-cream-muted" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {gradeData.map(({ grade, owned }) => (
                <div key={grade} className="text-center">
                  <div className={cn("inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold mb-1", getGradeColorClass(grade))}>
                    {grade}
                  </div>
                  <NumericValue value={owned} className="text-lg font-bold text-cream" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-gold-muted">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-cream-muted">Recent Graded Winners</CardTitle>
            <Calendar className="h-4 w-4 text-cream-muted" />
          </CardHeader>
          <CardContent>
            {recentGradedWinners.length === 0 ? (
              <p className="text-xs text-cream-muted italic py-2">No graded results this week.</p>
            ) : (
              <div className="space-y-2">
                {recentGradedWinners.map((r) => {
                  const winnerId = r.result?.[0]?.horseId;
                  const winner = horses.find(h => h.id === winnerId);
                  return (
                    <div key={r.id} className="flex items-center justify-between text-xs border-b border-gold-muted/50 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`h-4 px-1 text-[9px] ${getGradeColorClass(r.graded!.grade)}`}>{r.graded!.grade}</Badge>
                        <span className="font-medium truncate max-w-[120px]">{r.name}</span>
                      </div>
                      <span className="text-cream-muted truncate max-w-[100px]">{winner?.name ?? "Unknown"}</span>
                      <span className="tabular-nums text-cream-muted font-[family-name:var(--font-mono)]">D{r.day}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gold-muted">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-cream-muted">Reputation History</CardTitle>
          <Trophy className="h-4 w-4 text-cream-muted" />
        </CardHeader>
        <CardContent>
          {recentReputationEvents.length === 0 ? (
            <p className="text-xs text-cream-muted italic py-2">No reputation events yet.</p>
          ) : (
            <div className="space-y-1">
              {recentReputationEvents.map((event, i) => (
                <div key={i} className="text-sm flex gap-3 border-b border-gold-muted/30 last:border-0 py-1 font-[family-name:var(--font-body)]">
                  <span className="text-cream-muted font-[family-name:var(--font-mono)] tabular-nums w-10 shrink-0">D{event.day}</span>
                  <span className="text-cream">{event.description}</span>
                  <span className={cn("text-xs font-medium ml-auto", event.amount > 0 ? "text-emerald-400" : "text-red-400")}>
                    {event.amount > 0 ? "+" : ""}{event.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gold-muted">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-cream-muted">Recent Graded Winners</CardTitle>
            <Calendar className="h-4 w-4 text-cream-muted" />
          </CardHeader>
          <CardContent>
            {recentGradedWinners.length === 0 ? (
              <p className="text-xs text-cream-muted italic py-2">No graded results this week.</p>
            ) : (
              <div className="space-y-2">
                {recentGradedWinners.map((r) => {
                  const winnerId = r.result?.[0]?.horseId;
                  const winner = horses.find(h => h.id === winnerId);
                  return (
                    <div key={r.id} className="flex items-center justify-between text-xs border-b border-gold-muted/50 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`h-4 px-1 text-[9px] ${getGradeColorClass(r.graded!.grade)}`}>{r.graded!.grade}</Badge>
                        <span className="font-medium truncate max-w-[120px]">{r.name}</span>
                      </div>
                      <span className="text-cream-muted truncate max-w-[100px]">{winner?.name ?? "Unknown"}</span>
                      <span className="tabular-nums text-cream-muted font-[family-name:var(--font-mono)]">D{r.day}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gold-muted">
          <CardHeader>
            <CardTitle className="text-cream font-[family-name:var(--font-display)]">Top Stable Stars</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {horses.slice().sort((a, b) => overall(b) - overall(a)).slice(0, 5).map((h) => (
              <Link key={h.id} to="/stable/$horseId" params={{ horseId: h.id }} className="flex items-center gap-3 p-2 rounded hover:bg-t700 transition-colors">
                {/* Design Bible: Silk dot beside every horse name */}
                <SilkDot color={h.silk} size="md" />
                <div className="flex-1">
                  <p className="font-medium text-sm text-cream font-[family-name:var(--font-display)]">{h.name}</p>
                  <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                    Age <NumericValue value={h.age} /> · OVR <NumericValue value={overall(h)} />
                  </p>
                </div>
                <Badge className="font-[family-name:var(--font-mono)] tabular-nums text-[10px] bg-t700 text-cream">
                  E <NumericValue value={h.energy} />
                </Badge>
              </Link>
            ))}
            {horses.length === 0 && <p className="text-sm text-cream-muted italic">No horses in training. Visit the auction to acquire stock.</p>}
          </CardContent>
        </Card>

        <Card className="border-gold-muted">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-cream font-[family-name:var(--font-display)]">Upcoming Entries</CardTitle>
            <Link to="/races" search={{ grade: "all", country: "all", surface: "all", track: "all", owned: "all", q: "" }}>
              <Button className="h-8">View Calendar</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded hover:bg-t700">
                <div>
                  <p className="font-medium text-sm text-cream font-[family-name:var(--font-display)]">{r.name}</p>
                  <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                    Day <NumericValue value={r.day} /> · <NumericValue value={r.distance} suffix="m" /> · {r.raceClass}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-cream font-[family-name:var(--font-mono)] tabular-nums">${r.purse.toLocaleString()}</p>
                  {r.entries.some((e) => e.owned) && (
                    <Badge className="text-[9px] bg-success text-t950">Entered</Badge>
                  )}
                </div>
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-sm text-cream-muted italic">No races today.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="text-cream font-[family-name:var(--font-display)]">Stable Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {log.slice(0, 8).map((l, i) => (
            <div key={i} className="text-sm flex gap-3 border-b border-gold-muted/30 last:border-0 py-1 font-[family-name:var(--font-body)]">
              <span className="text-cream-muted font-[family-name:var(--font-mono)] tabular-nums w-10 shrink-0">D{l.day}</span>
              <span className="text-cream">{l.text}</span>
            </div>
          ))}
          {log.length === 0 && <p className="text-sm text-cream-muted italic">No recent activity.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
