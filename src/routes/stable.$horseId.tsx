import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HorseStats, SilkBadge, NumericValue } from "@/components/HorseBits";
import { SilkDot } from "@/components/SilkDot";
import { HorseStatsRadar } from "@/components/HorseStatsRadar";
import { ArrowLeft, Tag } from "lucide-react";
import { Lineage } from "@/components/Lineage";
import { HorsePortrait } from "@/components/HorsePortrait";
import { BeyerChart } from "@/components/BeyerChart";
import { HorseAwardsPanel } from "@/components/awards";
import { GradedStatsChart } from "@/components/GradedStatsChart";
import { GradedHistoryPanel } from "@/components/horse/GradedHistoryPanel";
import { calculateOverallRating, getAbility, abilityGrade } from "@/core/horse/stats";
import { loadRaceHistoryLimit, saveRaceHistoryLimit } from "@/services/storageAdapter";
import { TRAINING_COST } from "@/game/store";
import { GRADED_RACES } from "@/game/gradedRaces";
import { getCurrentYear } from "@/game/raceSchedule";
import { cn } from "@/lib/utils";

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
  const auctions = useGame((s) => s.auctions ?? []);
  const consignHorse = useGame((s) => s.consignHorse);
  const withdrawConsignment = useGame((s) => s.withdrawConsignment);
  const [raceHistoryLimit, setRaceHistoryLimit] = useState<number>(() => loadRaceHistoryLimit());

  // Persist raceHistoryLimit to localStorage
  useEffect(() => {
    saveRaceHistoryLimit(raceHistoryLimit);
  }, [raceHistoryLimit]);

  if (!horse) throw notFound();

  const slotsLeft = 2 - trainingUsed;
  const isPregnant = !!pregnancy;
  const isConsigned = !!horse.consignedSaleId;
  const consignedSale = isConsigned ? auctions.find((a) => a.id === horse.consignedSaleId) : undefined;
  // Find eligible upcoming sales to consign to
  const eligibleSale = !isConsigned && horse.owned
    ? auctions.find((a) => {
        if (a.resolved) return false;
        const ageMatch =
          (horse.age === 0 && (a.kind === "weanling" || a.kind === "weanling_south")) ||
          ((horse.age === 1 || horse.age === 2) && (a.kind === "yearling" || a.kind === "yearling_south"));
        return ageMatch;
      })
    : undefined;

  const ovr = calculateOverallRating(horse);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/stable" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 font-[family-name:var(--font-body)]">
          <ArrowLeft className="h-4 w-4" /> Back to stable
        </Link>
        <div className="flex items-start gap-6">
          {/* Design Bible: SilkDot for identity */}
          <SilkDot color={horse.coatColor || "#8B4513"} size="lg" />
          <div className="flex-1">
            {/* Display font for horse name */}
            <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">{horse.name}</h1>
            <p className="text-muted-foreground font-[family-name:var(--font-body)]">
              Age <NumericValue value={horse.age} /> · OVR <NumericValue value={ovr} /> · Potential <NumericValue value={horse.potential} />
            </p>
            {(() => {
              const ability = getAbility(horse);
              const family = horse.bruceLoweFamily;
              const familyRoleLabel = family === undefined ? null
                : [1, 2, 4, 5].includes(family) ? "Running"
                : family === 3 ? "Running/Sire"
                : [8, 11, 12, 14].includes(family) ? "Sire"
                : null;
              return (
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                  <Badge variant="secondary">
                    Current ability {ability.current} · grade {abilityGrade(ability.current)}
                  </Badge>
                  <Badge variant="outline">
                    Potential {ability.potential} · grade {abilityGrade(ability.potential)}
                  </Badge>
                  {horse.runningStyle && (
                    <Badge variant="outline" className="capitalize">
                      Style: {horse.runningStyle.replace("-", " ")}
                    </Badge>
                  )}
                  {family !== undefined && (
                    <Badge variant="outline" title="Bruce Lowe tail-female family number">
                      Family {family}{familyRoleLabel ? ` · ${familyRoleLabel}` : ""}
                    </Badge>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <HorseStatsRadar horse={horse} />
            <HorseStats horse={horse} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary">Energy ⚡ {horse.energy}/100</Badge>
              <Badge variant={horse.form >= 0 ? "default" : "destructive"}>
                Form {horse.form > 0 ? "+" : ""}{horse.form}
              </Badge>
              {isPregnant && (
                <Badge className="bg-fame/15 text-fame border-fame/30" variant="outline">
                  In foal · due day {pregnancy!.dueDay} ({Math.max(0, pregnancy!.dueDay - day)}d)
                </Badge>
              )}
              {horse.winAndYouInQualified && horse.winAndYouInQualified.length > 0 && horse.winAndYouInQualified.filter(q => q.year === getCurrentYear(day)).length > 0 && (
                <>
                  {horse.winAndYouInQualified
                    .filter(q => q.year === getCurrentYear(day))
                    .map(q => {
                      const gradedRace = GRADED_RACES.find(g => g.key === q.raceKey);
                      return (
                        <Badge key={q.raceKey} className="bg-primary text-primary-foreground">
                          Qualified for {gradedRace?.name || q.raceKey}
                        </Badge>
                      );
                    })}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Consignment */}
        {horse.owned && (isConsigned || eligibleSale) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4" /> Auction Consignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isConsigned && consignedSale ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-warning">Consigned</Badge>
                    <span className="text-sm">{consignedSale.name}</span>
                  </div>
                  <Link to="/auction/$saleId" params={{ saleId: consignedSale.id }}>
                    <Button size="sm" variant="outline" className="w-full">View Sale</Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-destructive"
                    onClick={() => withdrawConsignment(horse.id)}
                    disabled={consignedSale.day - day < 3}
                  >
                    {consignedSale.day - day < 3 ? "Cannot withdraw (< 3 days)" : "Withdraw Consignment"}
                  </Button>
                </>
              ) : eligibleSale ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {eligibleSale.name} is open for consignments.
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => consignHorse(horse.id, eligibleSale.id)}
                  >
                    <Tag className="h-4 w-4 mr-2" /> Consign to {eligibleSale.name}
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Training</CardTitle>
            <p className="text-xs text-muted-foreground">
              {isPregnant
                ? "Resting in the broodmare barn — no training during pregnancy."
                : `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left today · $${TRAINING_COST}/session`}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {(["speed", "stamina", "acceleration"] as const).map((k) => (
              <Button
                key={k}
                onClick={() => trainHorse(horse.id, k)}
                disabled={isPregnant || slotsLeft <= 0 || cash < TRAINING_COST || horse.energy < 15 || horse.stats[k] >= horse.potential}
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

      <HorseAwardsPanel horse={horse} />

      <Card>
        <CardHeader>
          <CardTitle>Race history</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Select value={raceHistoryLimit.toString()} onValueChange={(v) => setRaceHistoryLimit(Number(v))}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="History limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Last 10</SelectItem>
                <SelectItem value="20">Last 20</SelectItem>
                <SelectItem value="50">Last 50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {horse.raceHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No races yet.</p>
          ) : (
            <div className="space-y-1">
              {horse.raceHistory.slice(0, raceHistoryLimit).map((r, i) => (
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
