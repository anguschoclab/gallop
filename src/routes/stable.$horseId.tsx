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
