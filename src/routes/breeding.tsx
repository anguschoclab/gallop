import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Info, FileText, Baby, Calendar } from "lucide-react";
import { toast } from "sonner";
import { calculateBreedingCompatibility } from "@/game/breedingCompatibility";
import { BreedingRadarChart } from "@/components/BreedingRadarChart";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PregnancyTimeline } from "@/components/PregnancyTimeline";
import { inBreedingSeason, nextBreedingSeasonStart } from "@/core/calendar/breedingCalendar";
import { getAvailableStallions } from "@/core/breeding/stallions";
import { NumericValue } from "@/components/HorseBits";
import { cn } from "@/lib/utils";
import { FoalNamingDialog } from "@/components/FoalNamingDialog";

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
  const [namingFoalId, setNamingFoalId] = useState<string | null>(null);

  const adults = horses.filter((h) => h.age >= 3);
  const breedLogs = log.filter((l) => /Mated|Foal/.test(l.text));

  const sire = adults.find((h) => h.id === sireId);
  const dam = adults.find((h) => h.id === damId);
  const compatibility = sire && dam ? calculateBreedingCompatibility(sire, dam) : null;

  // Get available stallions for Northern hemisphere (default for player breeding)
  const availableStallions = getAvailableStallions({ horses, day }, "Northern");

  const onBreed = () => {
    if (!sireId || !damId) return;
    if (!seasonOpen) {
      toast.error(`Breeding season closed. Reopens day ${nextSeasonStart}.`);
      return;
    }
    const result = breed(sireId, damId, liveFoalGuarantee);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    setSireId("");
    setDamId("");
    setLiveFoalGuarantee(false);
  };

  const activePregnancies = pregnancies.filter((p) => !p.resolved);
  const activePregnanciesCount = activePregnancies.length;

  // Determine breeding season status for Northern hemisphere (default)
  const seasonOpen = inBreedingSeason(day, "Northern");
  const nextSeasonStart = nextBreedingSeasonStart(day, "Northern");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
            Breeding & Bloodstock
          </h1>
          <p className="text-cream-muted font-[family-name:var(--font-body)]">
            Manage your matings and track gestation for the next generation.
          </p>
        </div>
        <Badge
          className={cn(
            "font-[family-name:var(--font-mono)] tabular-nums",
            seasonOpen ? "bg-success text-t950" : "bg-t700 text-cream",
          )}
        >
          <Calendar className="h-3 w-3 mr-1" />
          {seasonOpen ? (
            "Season Open"
          ) : (
            <>
              Opens Day <NumericValue value={nextSeasonStart} />
            </>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/stallions">
          <Card className="hover:bg-t700 transition-colors border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-[family-name:var(--font-display)]">
                Stallions at Stud
              </CardTitle>
              <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                View available stallions for breeding
              </p>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/sire-watch">
          <Card className="hover:bg-t700 transition-colors border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-[family-name:var(--font-display)]">
                Sire Watch
              </CardTitle>
              <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                Analytics and performance metrics for stallions
              </p>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/sire-leaderboards">
          <Card className="hover:bg-t700 transition-colors border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-[family-name:var(--font-display)]">
                Sire Leaderboards
              </CardTitle>
              <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                Track stallion performance across multiple dimensions
              </p>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Tabs defaultValue="shed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shed" className="gap-2">
            <Heart className="h-4 w-4" />
            Breeding Shed
          </TabsTrigger>
          <TabsTrigger value="broodmares" className="gap-2">
            <Baby className="h-4 w-4" />
            Broodmares{" "}
            {activePregnanciesCount > 0 && (
              <Badge className="ml-1 h-4 px-1 text-[10px] font-[family-name:var(--font-mono)] tabular-nums bg-t700 text-cream">
                {activePregnanciesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shed" className="space-y-4">
          <Card className="border-gold-muted">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)]">New Mating</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-cream-muted">
                    <JargonTooltip term="Sire">Sire</JargonTooltip>
                  </label>
                  <select
                    className="w-full border border-gold-muted rounded-md px-3 py-2 bg-t800 text-cream text-sm"
                    value={sireId}
                    onChange={(e) => setSireId(e.target.value)}
                  >
                    <option value="">Select sire…</option>
                    {availableStallions.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} (age {Math.floor(h.age)}){h.bruceLoweFamily ? ` • BL${h.bruceLoweFamily}` : ""}{" "}
                        • ${h.stud?.standingFee.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-cream-muted">
                    <JargonTooltip term="Dam">Dam</JargonTooltip>
                  </label>
                  <select
                    className="w-full border border-gold-muted rounded-md px-3 py-2 bg-t800 text-cream text-sm"
                    value={damId}
                    onChange={(e) => setDamId(e.target.value)}
                  >
                    <option value="">Select dam…</option>
                    {adults
                      .filter(
                        (h) => (h.gender === "filly" || h.gender === "mare") && h.id !== sireId,
                      )
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} (age {Math.floor(h.age)})
                          {h.bruceLoweFamily ? ` • BL${h.bruceLoweFamily}` : ""}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <Button
                onClick={onBreed}
                disabled={
                  !sireId ||
                  !damId ||
                  sireId === damId ||
                  cash < 2000 + (liveFoalGuarantee ? 1000 : 0)
                }
              >
                <Heart className="h-4 w-4 mr-1" /> Breed (
                <span className="tabular-nums">${liveFoalGuarantee ? "3,000" : "2,000"}</span>)
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
                  Live Foal Guarantee (<span className="tabular-nums">+$1,000</span>)
                </label>
              </div>
              <p className="text-xs text-cream-muted mt-1">
                If <JargonTooltip term="Foal">foal</JargonTooltip> is stillborn or unable to
                stand/nurse, you get a free re-breeding (up to 3 attempts).
              </p>

              {compatibility && (
                <div className="space-y-4">
                  <BreedingRadarChart
                    data={[
                      {
                        factor: "Nicking",
                        score: compatibility.factors.nicking.score,
                        fullMark: 100,
                      },
                      {
                        factor: "Dosage",
                        score: compatibility.factors.dosage.score,
                        fullMark: 100,
                      },
                      {
                        factor: "Inbreeding",
                        score: compatibility.factors.inbreeding.score,
                        fullMark: 100,
                      },
                      {
                        factor: "Parent Performance",
                        score: compatibility.factors.parentPerformance.score,
                        fullMark: 100,
                      },
                      {
                        factor: "Conformation",
                        score: compatibility.factors.conformation.score,
                        fullMark: 100,
                      },
                      {
                        factor: "Temperament",
                        score: compatibility.factors.temperament.score,
                        fullMark: 100,
                      },
                      {
                        factor: "Foundation Stock",
                        score: compatibility.factors.foundationStock.score,
                        fullMark: 100,
                      },
                      {
                        factor: "Founder Effect",
                        score: compatibility.factors.founderEffect.score,
                        fullMark: 100,
                      },
                      {
                        factor: "Genetic",
                        score: compatibility.factors.genetic.score,
                        fullMark: 100,
                      },
                      {
                        factor: "Blue Hen",
                        score: compatibility.factors.blueHen.score,
                        fullMark: 100,
                      },
                    ]}
                  />
                  <Card className="bg-t700 border-gold-muted">
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
                          className="tabular-nums"
                        >
                          {Math.round(compatibility.overallScore * 100)}%
                        </Badge>
                      </div>
                      <p className="text-cream-muted">{compatibility.recommendation}</p>

                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <JargonTooltip term="Nicking">Nicking</JargonTooltip>
                          <span
                            className={
                              compatibility.factors.nicking.score > 0
                                ? "text-success"
                                : "text-cream-muted"
                            }
                          >
                            {compatibility.factors.nicking.description}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <JargonTooltip term="Dosage">Dosage</JargonTooltip>
                          <span
                            className={
                              compatibility.factors.dosage.score >= 0.7
                                ? "text-success"
                                : "text-cream-muted"
                            }
                          >
                            {compatibility.factors.dosage.description}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <JargonTooltip term="Inbreeding">Inbreeding</JargonTooltip>
                          <span
                            className={
                              compatibility.factors.inbreeding.warning
                                ? "text-warning"
                                : "text-success"
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
                                ? "text-success"
                                : "text-cream-muted"
                            }
                          >
                            {compatibility.factors.parentPerformance.description}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-medium border-t pt-2 mt-2">
                          <JargonTooltip term="Blue hen">Blue Hen Status</JargonTooltip>
                          <span
                            className={
                              compatibility.factors.blueHen.isBlueHen
                                ? "text-info"
                                : compatibility.factors.blueHen.score >= 0.5
                                  ? "text-success"
                                  : "text-cream-muted"
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
        </TabsContent>

        <TabsContent value="broodmares" className="space-y-4">
          {activePregnanciesCount === 0 ? (
            <Card className="border-gold-muted">
              <CardContent className="p-12 text-center">
                <Baby className="h-12 w-12 mx-auto text-cream-muted mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No active pregnancies</h3>
                <p className="text-sm text-cream-muted">
                  Mate your horses in the Breeding Shed to begin bloodstock development.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activePregnancies.map((p) => {
                const daysRemaining = p.dueDay - day;
                const dam = horses.find((h) => h.id === p.damId);
                return (
                  <Card key={p.id} className="border-l-4 border-l-gold border-gold-muted">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg font-[family-name:var(--font-display)]">
                            {p.damName} × {p.sireName}
                          </CardTitle>
                          <p className="text-xs text-cream-muted mt-1 tabular-nums">
                            Conceived Day {p.conceivedDay} · Due Day {p.dueDay}
                          </p>
                        </div>
                        <Badge
                          variant={daysRemaining <= 7 ? "default" : "secondary"}
                          className="tabular-nums"
                        >
                          {daysRemaining <= 0 ? "Due Now" : `${daysRemaining} days`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <PregnancyTimeline
                        conceivedDay={p.conceivedDay}
                        dueDay={p.dueDay}
                        currentDay={day}
                        sireName={p.sireName}
                        damName={p.damName}
                      />
                      <div className="flex justify-between items-center pt-2 border-t text-xs">
                        <div className="flex gap-2">
                          <Link to="/stable/$horseId" params={{ horseId: p.damId }}>
                            <Button size="sm" variant="outline" className="h-7 text-[10px]">
                              Dam Profile
                            </Button>
                          </Link>
                          <Link to="/stable/$horseId" params={{ horseId: p.sireId }}>
                            <Button size="sm" variant="outline" className="h-7 text-[10px]">
                              Sire Profile
                            </Button>
                          </Link>
                        </div>
                        {p.reBreedingAttempts && p.reBreedingAttempts > 0 && (
                          <span className="text-warning font-medium tabular-nums">
                            Re-breeding attempt {p.reBreedingAttempts}/3
                          </span>
                        )}
                        {p.liveFoalGuarantee && (
                          <span className="text-success font-medium">Live Foal Guarantee</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-gold-muted">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)]">Past Foals</CardTitle>
            </CardHeader>
            <CardContent>
              {pregnancies.filter((p) => p.resolved).length === 0 ? (
                <p className="text-sm text-cream-muted">No foals born yet.</p>
              ) : (
                <div className="space-y-2">
                  {pregnancies
                    .filter((p) => p.resolved)
                    .map((p) => {
                      const foal = horses.find((h) => h.id === p.foalId);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between border border-gold-muted rounded-md px-3 py-2 text-sm"
                        >
                          <span>
                            {p.sireName} × {p.damName} →{" "}
                            <span className="font-medium">{foal?.name ?? "(sold)"}</span>
                            {foal?.name === "Unnamed Foal" && foal.owned && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 ml-2 text-info hover:text-white"
                                onClick={() => setNamingFoalId(foal.id)}
                              >
                                Name Foal
                              </Button>
                            )}
                          </span>
                          <span className="text-cream-muted tabular-nums">Born day {p.dueDay}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          <FoalNamingDialog
            foalId={namingFoalId || ""}
            isOpen={!!namingFoalId}
            onClose={() => setNamingFoalId(null)}
          />

          <Card className="border-gold-muted">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)]">Breeding Log</CardTitle>
            </CardHeader>
            <CardContent>
              {breedLogs.length === 0 ? (
                <p className="text-sm text-cream-muted">No breeding events yet.</p>
              ) : (
                <div className="space-y-1">
                  {breedLogs.map((l, i) => (
                    <div
                      key={i}
                      className="text-sm py-1 border-b border-gold-muted last:border-0 flex gap-3"
                    >
                      <span className="text-cream-muted tabular-nums shrink-0">D{l.day}</span>
                      <span className="text-cream">{l.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
