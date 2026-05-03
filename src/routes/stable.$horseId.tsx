import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HorseStats, overall, SilkBadge } from "@/components/HorseBits";
import { ArrowLeft } from "lucide-react";
import { Lineage } from "@/components/Lineage";
import { BeyerChart } from "@/components/BeyerChart";

export const Route = createFileRoute("/stable/$horseId")({
  component: HorseDetail,
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Horse not found</h1>
      <Link to="/stable" className="text-primary underline">Back to stable</Link>
    </div>
  ),
});

function HorseDetail() {
  const { horseId } = Route.useParams();
  const horse = useGame((s) => s.horses.find((h) => h.id === horseId));
  const trainHorse = useGame((s) => s.trainHorse);
  const trainingUsed = useGame((s) => s.trainingUsed[horseId] ?? 0);
  const cash = useGame((s) => s.cash);
  const pregnancy = useGame((s) => s.pregnancies.find((p) => !p.resolved && p.damId === horseId));
  const day = useGame((s) => s.day);

  if (!horse) throw notFound();

  const slotsLeft = 2 - trainingUsed;
  const isPregnant = !!pregnancy;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/stable" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to stable
        </Link>
        <div className="flex items-center gap-4">
          <SilkBadge color={horse.silk} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{horse.name}</h1>
            <p className="text-muted-foreground">Age {horse.age} · OVR {overall(horse)} · Potential {horse.potential}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <HorseStats horse={horse} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary">Energy ⚡ {horse.energy}/100</Badge>
              <Badge variant={horse.form >= 0 ? "default" : "destructive"}>
                Form {horse.form > 0 ? "+" : ""}{horse.form}
              </Badge>
              {isPregnant && (
                <Badge className="bg-pink-500/15 text-pink-600 border-pink-500/30" variant="outline">
                  🤰 Pregnant · due day {pregnancy!.dueDay} ({Math.max(0, pregnancy!.dueDay - day)}d)
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training</CardTitle>
            <p className="text-xs text-muted-foreground">
              {isPregnant
                ? "Resting in the broodmare barn — no training during pregnancy."
                : `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left today · $75/session`}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {(["speed", "stamina", "acceleration"] as const).map((k) => (
              <Button
                key={k}
                onClick={() => trainHorse(horse.id, k)}
                disabled={isPregnant || slotsLeft <= 0 || cash < 75 || horse.energy < 15 || horse.stats[k] >= horse.potential}
                className="w-full justify-between"
                variant="outline"
              >
                <span className="capitalize">{k} work</span>
                <span className="text-muted-foreground">{horse.stats[k]} → {Math.min(horse.potential, horse.stats[k] + 1)}</span>
              </Button>
            ))}
            <Button
              onClick={() => trainHorse(horse.id, "rest")}
              disabled={isPregnant || slotsLeft <= 0 || horse.energy >= 100}
              className="w-full"
              variant="secondary"
            >
              Rest (+30 energy)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Beyer Speed Figure trend</CardTitle>
          <p className="text-xs text-muted-foreground">Last {Math.min(10, horse.raceHistory.length)} races, oldest → newest</p>
        </CardHeader>
        <CardContent>
          <BeyerChart history={horse.raceHistory} />
        </CardContent>
      </Card>

      <GradedHistoryPanel history={horse.raceHistory} />

      <Card>
        <CardHeader><CardTitle>Race history</CardTitle></CardHeader>
        <CardContent>
          {horse.raceHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No races yet.</p>
          ) : (
            <div className="space-y-1">
              {horse.raceHistory.map((r, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span>{r.raceName}</span>
                  <span className="flex gap-3 items-center">
                    {typeof r.beyer === "number" && (
                      <span className="text-xs text-muted-foreground">Beyer {r.beyer}</span>
                    )}
                    <span className="text-muted-foreground">D{r.day}</span>
                    <Badge variant={r.position === 1 ? "default" : r.position <= 3 ? "secondary" : "outline"}>
                      {r.position}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      </>
    );
  }

  function GradedHistoryPanel({ history }: { history: { raceName: string; position: number; day: number; beyer?: number; grade?: "G1" | "G2" | "G3"; distance?: number; surface?: string; fieldSize?: number }[] }) {
    const graded = history.filter((r) => r.grade);
    const byGrade = {
      G1: graded.filter((r) => r.grade === "G1"),
      G2: graded.filter((r) => r.grade === "G2"),
      G3: graded.filter((r) => r.grade === "G3"),
    };
    const wins = (rs: typeof graded) => rs.filter((r) => r.position === 1).length;
    const places = (rs: typeof graded) => rs.filter((r) => r.position <= 3).length;
    const bestBeyer = (rs: typeof graded) => rs.reduce((m, r) => (typeof r.beyer === "number" && r.beyer > m ? r.beyer : m), 0);

    const gradeColor = (g?: string) =>
      g === "G1" ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/40 dark:text-yellow-400"
      : g === "G2" ? "bg-purple-500/15 text-purple-700 border-purple-500/40 dark:text-purple-400"
      : "bg-blue-500/15 text-blue-700 border-blue-500/40 dark:text-blue-400";

    return (
      <Card>
        <CardHeader>
          <CardTitle>Graded race history</CardTitle>
          <p className="text-xs text-muted-foreground">G1/G2/G3 finishes with Beyer figures earned</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(["G1", "G2", "G3"] as const).map((g) => (
              <div key={g} className="rounded-md border p-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className={gradeColor(g)}>{g}</Badge>
                  <span className="text-xs text-muted-foreground">{byGrade[g].length} run{byGrade[g].length !== 1 ? "s" : ""}</span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">{wins(byGrade[g])}</span>
                  <span className="text-muted-foreground"> wins · </span>
                  <span className="font-semibold">{places(byGrade[g])}</span>
                  <span className="text-muted-foreground"> placed</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Best Beyer: <span className="font-medium text-foreground">{bestBeyer(byGrade[g]) || "—"}</span>
                </div>
              </div>
            ))}
          </div>

          {graded.length === 0 ? (
            <p className="text-sm text-muted-foreground">No graded stakes appearances yet.</p>
          ) : (
            <div className="space-y-1">
              {graded.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm py-2 border-b last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className={gradeColor(r.grade)}>{r.grade}</Badge>
                    <div className="min-w-0">
                      <div className="truncate">{r.raceName}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.distance ? `${r.distance}m` : ""}{r.surface ? ` · ${r.surface}` : ""}{r.fieldSize ? ` · field of ${r.fieldSize}` : ""} · D{r.day}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {typeof r.beyer === "number" && (
                      <span className="text-xs">
                        <span className="text-muted-foreground">Beyer </span>
                        <span className="font-semibold">{r.beyer}</span>
                      </span>
                    )}
                    <Badge variant={r.position === 1 ? "default" : r.position <= 3 ? "secondary" : "outline"}>
                      {r.position}{ord(r.position)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function ord(n: number) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  function _Tail() {
    return (

      <Card>
        <CardHeader>
          <CardTitle>Lineage</CardTitle>
          <p className="text-xs text-muted-foreground">Sire (top) and dam (bottom) for 4 generations</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Lineage
            horseId={horse.id}
            horseName={horse.name}
            sireName={horse.sireName}
            damName={horse.damName}
            generations={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
