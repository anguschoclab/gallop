import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Info } from "lucide-react";
import { toast } from "sonner";
import { calculateBreedingCompatibility } from "@/game/breedingCompatibility";
import { BreedingRadarChart } from "@/components/BreedingRadarChart";

export const Route = createFileRoute("/breeding")({
  component: BreedingPage,
});

function BreedingPage() {
  const horses = useGame((s) => s.horses);
  const pregnancies = useGame((s) => s.pregnancies);
  const log = useGame((s) => s.log);
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const breed = useGame((s) => s.breed);
  const [sireId, setSireId] = useState<string>("");
  const [damId, setDamId] = useState<string>("");
  const [liveFoalGuarantee, setLiveFoalGuarantee] = useState(false);

  const adults = horses.filter((h) => h.age >= 3);
  const breedLogs = log.filter((l) => /Mated|Foal/.test(l.text));

  const sire = adults.find((h) => h.id === sireId);
  const dam = adults.find((h) => h.id === damId);
  const compatibility = sire && dam ? calculateBreedingCompatibility(sire, dam) : null;

  const onBreed = () => {
    if (!sireId || !damId) return;
    const result = breed(sireId, damId, liveFoalGuarantee);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    setSireId("");
    setDamId("");
    setLiveFoalGuarantee(false);
  };

  const activePregnancies = pregnancies.filter((p) => !p.resolved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Breeding Shed</h1>
          <p className="text-muted-foreground">
            Mate two horses (age 3+). Foals arrive 30 days after conception. Fee $2,000.
          </p>
        </div>
        <Link to="/broodmares">
          <Button variant="outline" size="sm">
            <Heart className="h-4 w-4 mr-1" />
            Broodmares{" "}
            {activePregnancies > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activePregnancies}
              </Badge>
            )}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Mating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Sire</label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background text-sm"
                value={sireId}
                onChange={(e) => setSireId(e.target.value)}
              >
                <option value="">Select sire…</option>
                {adults.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (age {h.age})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Dam</label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background text-sm"
                value={damId}
                onChange={(e) => setDamId(e.target.value)}
              >
                <option value="">Select dam…</option>
                {adults
                  .filter((h) => h.id !== sireId)
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (age {h.age})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <Button
            onClick={onBreed}
            disabled={
              !sireId || !damId || sireId === damId || cash < 2000 + (liveFoalGuarantee ? 1000 : 0)
            }
          >
            <Heart className="h-4 w-4 mr-1" /> Breed (${liveFoalGuarantee ? "$3,000" : "$2,000"})
          </Button>

          <div className="flex items-center space-x-2 mt-3">
            <input
              type="checkbox"
              id="liveFoalGuarantee"
              checked={liveFoalGuarantee}
              onChange={(e) => setLiveFoalGuarantee(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="liveFoalGuarantee" className="text-sm cursor-pointer">
              Live Foal Guarantee (+$1,000)
            </label>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            If foal is stillborn or unable to stand/nurse, you get a free re-breeding (up to 3
            attempts).
          </p>

          {compatibility && (
            <div className="space-y-4">
              <BreedingRadarChart factors={compatibility.factors} />
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Breeding Compatibility Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Overall Score</span>
                    <Badge
                      variant={
                        compatibility.overallScore >= 0.65
                          ? "default"
                          : compatibility.overallScore >= 0.5
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {Math.round(compatibility.overallScore * 100)}%
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{compatibility.recommendation}</p>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span>Nicking</span>
                      <span
                        className={
                          compatibility.factors.nicking.score > 0
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        {compatibility.factors.nicking.description}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Dosage</span>
                      <span
                        className={
                          compatibility.factors.dosage.score >= 0.7
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        {compatibility.factors.dosage.description}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Inbreeding</span>
                      <span
                        className={
                          compatibility.factors.inbreeding.warning
                            ? "text-orange-600"
                            : "text-green-600"
                        }
                      >
                        {compatibility.factors.inbreeding.description}
                        {compatibility.factors.inbreeding.warning &&
                          ` (${compatibility.factors.inbreeding.warning})`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Parent Performance</span>
                      <span
                        className={
                          compatibility.factors.parentPerformance.score >= 0.5
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        {compatibility.factors.parentPerformance.description}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Conformation</span>
                      <span
                        className={
                          compatibility.factors.conformation.score >= 0.6
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        {compatibility.factors.conformation.description}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Temperament</span>
                      <span
                        className={
                          compatibility.factors.temperament.score >= 0.6
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        {compatibility.factors.temperament.description}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Foundation Stock</span>
                      <span
                        className={
                          compatibility.factors.foundationStock.score >= 0.2
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        {compatibility.factors.foundationStock.description}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Founder Effect</span>
                      <span
                        className={
                          compatibility.factors.founderEffect.warning
                            ? "text-orange-600"
                            : compatibility.factors.founderEffect.score >= 0.7
                              ? "text-green-600"
                              : "text-muted-foreground"
                        }
                      >
                        {compatibility.factors.founderEffect.description}
                        {compatibility.factors.founderEffect.warning &&
                          ` (${compatibility.factors.founderEffect.warning})`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Genetic Markers</span>
                      <span
                        className={
                          compatibility.factors.genetic.warning
                            ? "text-orange-600"
                            : compatibility.factors.genetic.score >= 0.7
                              ? "text-green-600"
                              : "text-muted-foreground"
                        }
                      >
                        {compatibility.factors.genetic.description}
                        {compatibility.factors.genetic.warning &&
                          ` (${compatibility.factors.genetic.warning})`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Blue Hen Status</span>
                      <span
                        className={
                          compatibility.factors.blueHen.isBlueHen
                            ? "text-blue-600 font-medium"
                            : compatibility.factors.blueHen.score >= 0.5
                              ? "text-green-600"
                              : "text-muted-foreground"
                        }
                      >
                        {compatibility.factors.blueHen.description}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Pregnancies</CardTitle>
        </CardHeader>
        <CardContent>
          {pregnancies.filter((p) => !p.resolved).length === 0 ? (
            <p className="text-sm text-muted-foreground">No active pregnancies.</p>
          ) : (
            <div className="space-y-2">
              {pregnancies
                .filter((p) => !p.resolved)
                .map((p) => {
                  const daysUntilDue = p.dueDay - day;
                  const isReBreeding = (p.reBreedingAttempts || 0) > 0;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div>
                        <div className="font-medium">
                          {p.sireName} × {p.damName}
                          {isReBreeding && (
                            <span className="ml-2 text-xs text-orange-600">
                              (Re-breeding attempt {p.reBreedingAttempts}/3)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.liveFoalGuarantee && (
                            <span className="text-green-600">Live Foal Guarantee • </span>
                          )}
                          Due in {daysUntilDue} day{daysUntilDue !== 1 ? "s" : ""} (Day {p.dueDay})
                        </div>
                      </div>
                      <Badge variant={daysUntilDue <= 7 ? "default" : "secondary"}>
                        {daysUntilDue <= 7 ? "Soon" : `${daysUntilDue}d`}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past Foals</CardTitle>
        </CardHeader>
        <CardContent>
          {pregnancies.filter((p) => p.resolved).length === 0 ? (
            <p className="text-sm text-muted-foreground">No foals born yet.</p>
          ) : (
            <div className="space-y-2">
              {pregnancies
                .filter((p) => p.resolved)
                .map((p) => {
                  const foal = horses.find((h) => h.id === p.foalId);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border rounded-md px-3 py-2 text-sm"
                    >
                      <span>
                        {p.sireName} × {p.damName} →{" "}
                        <span className="font-medium">{foal?.name ?? "(sold)"}</span>
                      </span>
                      <span className="text-muted-foreground">Born day {p.dueDay}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breeding Log</CardTitle>
        </CardHeader>
        <CardContent>
          {breedLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No breeding events yet.</p>
          ) : (
            <div className="space-y-1">
              {breedLogs.map((l, i) => (
                <div key={i} className="text-sm py-1 border-b last:border-0 flex gap-3">
                  <span className="text-muted-foreground tabular-nums shrink-0">D{l.day}</span>
                  <span>{l.text}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
