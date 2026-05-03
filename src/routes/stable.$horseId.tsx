import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HorseStats, overall, SilkBadge } from "@/components/HorseBits";
import { ArrowLeft } from "lucide-react";

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
  const retireHorse = useGame((s) => s.retireHorse);
  const trainingUsed = useGame((s) => s.trainingUsed[horseId] ?? 0);
  const cash = useGame((s) => s.cash);
  const day = useGame((s) => s.day);

  if (!horse) throw notFound();

  const slotsLeft = 2 - trainingUsed;
  const blocked = horse.retired || !!horse.pregnancy;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/stable" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to stable
        </Link>
        <div className="flex items-center gap-4">
          <SilkBadge color={horse.silk} />
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {horse.name} <span className="text-xl text-muted-foreground font-normal">{horse.sex === "F" ? "♀" : "♂"}</span>
            </h1>
            <p className="text-muted-foreground">
              Age {horse.age} · OVR {overall(horse)} · Potential {horse.potential}
            </p>
            {(horse.lineage?.sireName || horse.lineage?.damName) && (
              <p className="text-xs text-muted-foreground mt-1">
                by {horse.lineage.sireName ?? "Unknown"} out of {horse.lineage.damName ?? "Unknown"}
              </p>
            )}
          </div>
          {!horse.retired && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Retire ${horse.name}? Retired horses can't race or train, but mares can still breed.`)) {
                  retireHorse(horse.id);
                }
              }}
            >
              Retire
            </Button>
          )}
        </div>
        {horse.pregnancy && (
          <div className="mt-4 p-3 rounded-lg bg-pink-50 border border-pink-200 text-sm">
            <span className="font-medium">In foal</span> to {horse.pregnancy.sireName} · due day {horse.pregnancy.dueDay} ({horse.pregnancy.dueDay - day} days left). Cannot train or race.
          </div>
        )}
        {horse.retired && (
          <div className="mt-4 p-3 rounded-lg bg-muted border text-sm">
            Retired from racing.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <HorseStats horse={horse} />
            <div className="flex gap-2 pt-2">
              <Badge variant="secondary">Energy ⚡ {horse.energy}/100</Badge>
              <Badge variant={horse.form >= 0 ? "default" : "destructive"}>
                Form {horse.form > 0 ? "+" : ""}{horse.form}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training</CardTitle>
            <p className="text-xs text-muted-foreground">{slotsLeft} slot{slotsLeft !== 1 ? "s" : ""} left today · $75/session</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {(["speed", "stamina", "acceleration"] as const).map((k) => (
              <Button
                key={k}
                onClick={() => trainHorse(horse.id, k)}
                disabled={blocked || slotsLeft <= 0 || cash < 75 || horse.energy < 15 || horse.stats[k] >= horse.potential}
                className="w-full justify-between"
                variant="outline"
              >
                <span className="capitalize">{k} work</span>
                <span className="text-muted-foreground">{horse.stats[k]} → {Math.min(horse.potential, horse.stats[k] + 1)}</span>
              </Button>
            ))}
            <Button
              onClick={() => trainHorse(horse.id, "rest")}
              disabled={blocked || slotsLeft <= 0 || horse.energy >= 100}
              className="w-full"
              variant="secondary"
            >
              Rest (+30 energy)
            </Button>
          </CardContent>
        </Card>
      </div>

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
                  <span className="flex gap-3">
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
    </div>
  );
}
