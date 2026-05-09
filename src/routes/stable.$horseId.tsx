import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import { shallow } from "zustand/shallow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HorseStats, NumericValue } from "@/components/HorseBits";
import { SilkDot } from "@/components/SilkDot";
import { HorseStatsRadar } from "@/components/HorseStatsRadar";
import { ArrowLeft, Tag, Lock } from "lucide-react";
import { Lineage } from "@/components/Lineage";
import { BeyerChart } from "@/components/BeyerChart";
import { HorseAwardsPanel } from "@/components/awards";
import { GradedStatsChart } from "@/components/GradedStatsChart";
import { GradedHistoryPanel } from "@/components/horse/GradedHistoryPanel";
import { calculateOverallRating, getAbility, abilityGrade } from "@/core/horse/stats";
import { isMaleHorse, genderSymbol } from "@/core/horse/gender";
import { loadRaceHistoryLimit, saveRaceHistoryLimit } from "@/services/storageAdapter";
import { TRAINING_COST } from "@/game/constants/gameConstants";
import { GRADED_RACES } from "@/game/gradedRaces";
import { getCurrentYear } from "@/game/raceSchedule";
import { isWorkoutEnabled } from "@/core/facilities";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stable/$horseId")({
  component: HorseDetail,
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Horse not found</h1>
      <Link to="/stable" className="text-gold underline">
        Back to stable
      </Link>
    </div>
  ),
});

function HorseDetail() {
  const { horseId } = Route.useParams();
  const horse = useGame((s) => s.horses.find((h) => h.id === horseId));
  const trainHorse = useGame((s) => s.trainHorse);
  const consignHorse = useGame((s) => s.consignHorse);
  const withdrawConsignment = useGame((s) => s.withdrawConsignment);
  const trainingUsed = useGame((s) => s.trainingUsed[horseId] ?? 0);
  const cash = useGame((s) => s.cash);
  const retireToStud = useGame((s) => s.retireToStud);
  const retireToPasture = useGame((s) => s.retireToPasture);
  const facilities = useGame((s) => s.facilities);
  const pregnancy = useGame((s) => s.pregnancies.find((p) => !p.resolved && p.damId === horseId));
  const day = useGame((s) => s.day);
  const auctions = useGameWithShallow((s) => s.auctions ?? []);
  const [raceHistoryLimit, setRaceHistoryLimit] = useState<number>(() => loadRaceHistoryLimit());

  // Persist raceHistoryLimit to localStorage
  useEffect(() => {
    saveRaceHistoryLimit(raceHistoryLimit);
  }, [raceHistoryLimit]);

  if (!horse) throw notFound();

  const isPregnant = !!pregnancy;
  const isConsigned = !!horse.consignedSaleId;

  const canRetireToStud =
    horse.owned &&
    (isMaleHorse(horse.gender)) &&
    horse.age >= 3 &&
    !horse.stud?.atStud &&
    !isConsigned;

  const canRetireToPasture = horse.owned && horse.lifecycleStatus === "active" && !isConsigned;

  const slotsLeft = 2 - trainingUsed;
  const consignedSale = isConsigned
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? auctions.find((a: any) => a.id === horse.consignedSaleId)
    : undefined;
  // Find eligible upcoming sales to consign to
  const eligibleSale =
    !isConsigned && horse.owned
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? auctions.find((a: any) => {
          if (a.resolved) return false;
          const ageMatch =
            (horse.age === 0 && (a.kind === "weanling" || a.kind === "weanling_south")) ||
            ((horse.age === 1 || horse.age === 2) &&
              (a.kind === "yearling" || a.kind === "yearling_south"));
          return ageMatch;
        })
      : undefined;

  const ovr = calculateOverallRating(horse);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/stable"
          className="inline-flex items-center gap-1 text-sm text-cream-muted hover:text-cream mb-3 font-[family-name:var(--font-body)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to stable
        </Link>
        <div className="flex items-start gap-6">
          {/* Design Bible: SilkDot for identity */}
          <SilkDot color={horse.silk} size="lg" />
          <div className="flex-1">
            {/* Display font for horse name */}
            <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
              {horse.name}
            </h1>
            <p className="text-cream-muted font-[family-name:var(--font-body)]">
              Age <NumericValue value={horse.age} /> · OVR <NumericValue value={ovr} /> · Potential{" "}
              <NumericValue value={horse.potential} />
            </p>
            {(() => {
              const ability = getAbility(horse);
              const family = horse.bruceLoweFamily;
              const familyRoleLabel =
                family === undefined
                  ? null
                  : [1, 2, 4, 5].includes(family)
                    ? "Running"
                    : family === 3
                      ? "Running/Sire"
                      : [8, 11, 12, 14].includes(family)
                        ? "Sire"
                        : null;
              return (
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                  <Badge className="bg-t700 text-cream">
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
                      Family {family}
                      {familyRoleLabel ? ` · ${familyRoleLabel}` : ""}
                    </Badge>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gold-muted">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)]">Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <HorseStatsRadar horse={horse} />
            <HorseStats horse={horse} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge className="bg-t700 text-cream">Energy ⚡ {horse.energy}/100</Badge>
              <Badge
                className={
                  horse.form >= 0
                    ? "bg-gold text-t950"
                    : "bg-destructive text-destructive-foreground"
                }
              >
                Form {horse.form > 0 ? "+" : ""}
                {horse.form}
              </Badge>
              {isPregnant && (
                <Badge className="bg-fame text-t950 border-fame" variant="outline">
                  In foal · due day {pregnancy!.dueDay} ({Math.max(0, pregnancy!.dueDay - day)}d)
                </Badge>
              )}
              {horse.winAndYouInQualified &&
                horse.winAndYouInQualified.length > 0 &&
                horse.winAndYouInQualified.filter((q) => q.year === getCurrentYear(day)).length >
                  0 && (
                  <>
                    {horse.winAndYouInQualified
                      .filter((q) => q.year === getCurrentYear(day))
                      .map((q) => {
                        const gradedRace = GRADED_RACES.find((g) => g.key === q.raceKey);
                        return (
                          <Badge key={q.raceKey} className="bg-gold text-t950">
                            Qualified for {gradedRace?.name || q.raceKey}
                          </Badge>
                        );
                      })}
                  </>
                )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold-muted">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)]">Health & Welfare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {horse.activeInjury && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
                <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  ACTIVE INJURY
                </div>
                <p className="text-cream font-medium text-xs mt-1">{horse.activeInjury.type}</p>
                <div className="flex justify-between items-end mt-2">
                  <Badge variant="destructive" className="text-[9px] h-4 px-1">{horse.activeInjury.severity.toUpperCase()}</Badge>
                  <span className="text-[10px] text-cream-muted font-[family-name:var(--font-mono)]">Est. {horse.activeInjury.recoveryDays} days remaining</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-cream-muted uppercase tracking-wider font-bold">Recovery Rate</p>
                <NumericValue value={horse.recoveryRate} />
                <p className="text-[10px] text-cream-muted italic">Speed of energy return</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-cream-muted uppercase tracking-wider font-bold">Trainability</p>
                <NumericValue value={horse.trainability} />
                <p className="text-[10px] text-cream-muted italic">Likelihood of stat gains</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gold-muted/30">
              <p className="text-xs text-cream-muted uppercase tracking-wider font-bold mb-2">Hidden Risk Profile</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cream-muted">Bleeder Risk</span>
                  <Badge variant={horse.bleederRisk > 70 ? "destructive" : horse.bleederRisk > 30 ? "secondary" : "outline"}>
                    {horse.bleederRisk > 70 ? "High" : horse.bleederRisk > 30 ? "Moderate" : "Low"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cream-muted">Roarer Risk</span>
                  <Badge variant={horse.roarerRisk > 70 ? "destructive" : horse.roarerRisk > 30 ? "secondary" : "outline"}>
                    {horse.roarerRisk > 70 ? "High" : horse.roarerRisk > 30 ? "Moderate" : "Low"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cream-muted">OCD Risk</span>
                  <Badge variant={horse.ocdRisk > 70 ? "destructive" : horse.ocdRisk > 30 ? "secondary" : "outline"}>
                    {horse.ocdRisk > 70 ? "High" : horse.ocdRisk > 30 ? "Moderate" : "Low"}
                  </Badge>
                </div>
              </div>
              <p className="text-[10px] text-cream-muted mt-2 italic">
                *Risks are estimated based on veterinary evaluation and bloodline history.
              </p>
            </div>

            <div className="pt-4 border-t border-gold-muted/30">
              <p className="text-xs text-cream-muted uppercase tracking-wider font-bold mb-2">Staff Support</p>
              <div className="space-y-1">
                {(() => {
                  const hiredStaff = useGame((s) => s.hiredStaff);
                  const stableId = horse.stableId ?? "";
                  const staffForStable = hiredStaff?.filter(s => s.stableId === stableId) ?? [];
                  
                  const nutritionist = staffForStable.find(s => s.role === 'nutritionist');
                  const vet = staffForStable.find(s => s.role === 'veterinarian');
                  const trainer = staffForStable.find(s => s.role === 'trainer');
                  const farrier = staffForStable.find(s => s.role === 'farrier');
                  const groom = staffForStable.find(s => s.role === 'groom');

                  const bonuses = [
                    nutritionist && { label: "Nutritionist", value: `+${Math.round(nutritionist.bonusValue * 100)}% Energy` },
                    vet && { label: "Veterinarian", value: `+${Math.round(vet.bonusValue * 100)}% Recovery` },
                    trainer && { label: "Trainer", value: `+${Math.round(trainer.bonusValue * 100)}% Efficiency` },
                    farrier && { label: "Farrier", value: `+${Math.round(farrier.bonusValue * 100)}% Aptitude` },
                    groom && { label: "Groom", value: `+${Math.round(groom.bonusValue * 100)}% Form` },
                  ].filter(Boolean);

                  if (bonuses.length === 0) {
                    return <p className="text-[10px] text-cream-muted italic">No specialized staff support active.</p>;
                  }

                  return bonuses.map((b: any) => (
                    <div key={b.label} className="flex justify-between text-[10px]">
                      <span className="text-cream-muted">{b.label}</span>
                      <span className="text-success font-medium">{b.value}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consignment and Retirement */}
        {horse.owned && (isConsigned || eligibleSale || canRetireToStud) && (
          <Card className="border-gold-muted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-display)]">
                <Tag className="h-4 w-4" /> Management
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
                    <Button size="sm" variant="outline" className="w-full">
                      View Sale
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-destructive"
                    onClick={() => withdrawConsignment(horse.id)}
                    disabled={consignedSale.day - day < 3}
                  >
                    {consignedSale.day - day < 3
                      ? "Cannot withdraw (< 3 days)"
                      : "Withdraw Consignment"}
                  </Button>
                </>
              ) : eligibleSale ? (
                <>
                  <p className="text-sm text-cream-muted">
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

              {canRetireToStud && (
                <div className="pt-2 border-t border-gold-muted/30 mt-2">
                  <p className="text-xs text-cream-muted mb-2">
                    Retiring to stud will end this horse's racing career.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-gold text-gold hover:bg-gold hover:text-t900"
                    onClick={() => {
                      if (confirm(`Retire ${horse.name} to stud? This cannot be undone.`)) {
                        const result = retireToStud(horse.id);
                        if (!result.ok) alert(result.reason);
                      }
                    }}
                  >
                    Retire to Stud
                  </Button>
                </div>
              )}

              {canRetireToPasture && (
                <div className="pt-2 border-t border-gold-muted/30 mt-2">
                  <p className="text-xs text-cream-muted mb-2">
                    Retiring to pasture will end this horse's racing career.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-gold-muted text-cream-muted hover:bg-t700"
                    onClick={() => {
                      if (confirm(`Retire ${horse.name} to pasture? This cannot be undone.`)) {
                        const result = retireToPasture(horse.id);
                        if (!result.ok) alert(result.reason);
                      }
                    }}
                  >
                    Retire to Pasture
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-gold-muted">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)]">Training</CardTitle>
            <p className="text-xs text-cream-muted">
              {isPregnant
                ? "Resting in the broodmare barn — no training during pregnancy."
                : `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left today · $${TRAINING_COST}/session`}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Basic training types */}
            {(["speed", "stamina", "acceleration"] as const).map((k) => (
              <Button
                key={k}
                onClick={() => trainHorse(horse.id, k)}
                disabled={
                  isPregnant ||
                  slotsLeft <= 0 ||
                  cash < TRAINING_COST ||
                  horse.energy < 15 ||
                  horse.stats[k] >= horse.potential
                }
                className="w-full justify-between"
                variant="outline"
              >
                <span className="capitalize">{k} work</span>
                <span className="text-cream-muted">
                  {horse.stats[k]} → {Math.min(horse.potential, horse.stats[k] + 1)}
                </span>
              </Button>
            ))}

            {/* Advanced workout types */}
            <div className="pt-2 border-t border-gold-muted/30">
              <p className="text-xs text-cream-muted mb-2">Advanced Workouts</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => trainHorse(horse.id, "bullet")}
                  disabled={
                    isPregnant ||
                    slotsLeft <= 0 ||
                    cash < 100 ||
                    horse.energy < 25 ||
                    horse.stats.speed >= horse.potential ||
                    !facilities ||
                    !isWorkoutEnabled(facilities, "bullet")
                  }
                  className="w-full justify-between text-xs"
                  variant="outline"
                >
                  <div className="flex items-center gap-1">
                    {!facilities || !isWorkoutEnabled(facilities, "bullet") ? (
                      <Lock className="h-3 w-3" />
                    ) : null}
                    <span>Bullet</span>
                  </div>
                  <span className="text-cream-muted">$100</span>
                </Button>
                <Button
                  onClick={() => trainHorse(horse.id, "breeze")}
                  disabled={
                    isPregnant ||
                    slotsLeft <= 0 ||
                    cash < 85 ||
                    horse.energy < 20 ||
                    !facilities ||
                    !isWorkoutEnabled(facilities, "breeze")
                  }
                  className="w-full justify-between text-xs"
                  variant="outline"
                >
                  <div className="flex items-center gap-1">
                    {!facilities || !isWorkoutEnabled(facilities, "breeze") ? (
                      <Lock className="h-3 w-3" />
                    ) : null}
                    <span>Breeze</span>
                  </div>
                  <span className="text-cream-muted">$85</span>
                </Button>
                <Button
                  onClick={() => trainHorse(horse.id, "gate_work")}
                  disabled={
                    isPregnant ||
                    slotsLeft <= 0 ||
                    cash < 90 ||
                    horse.energy < 22 ||
                    !facilities ||
                    !isWorkoutEnabled(facilities, "gate_work")
                  }
                  className="w-full justify-between text-xs"
                  variant="outline"
                >
                  <div className="flex items-center gap-1">
                    {!facilities || !isWorkoutEnabled(facilities, "gate_work") ? (
                      <Lock className="h-3 w-3" />
                    ) : null}
                    <span>Gate Work</span>
                  </div>
                  <span className="text-cream-muted">$90</span>
                </Button>
                <Button
                  onClick={() => trainHorse(horse.id, "swimming")}
                  disabled={
                    isPregnant ||
                    slotsLeft <= 0 ||
                    cash < 80 ||
                    horse.energy < 15 ||
                    !facilities ||
                    !isWorkoutEnabled(facilities, "swimming")
                  }
                  className="w-full justify-between text-xs"
                  variant="outline"
                >
                  <div className="flex items-center gap-1">
                    {!facilities || !isWorkoutEnabled(facilities, "swimming") ? (
                      <Lock className="h-3 w-3" />
                    ) : null}
                    <span>Swimming</span>
                  </div>
                  <span className="text-cream-muted">$80</span>
                </Button>
                <Button
                  onClick={() => trainHorse(horse.id, "gallop")}
                  disabled={
                    isPregnant ||
                    slotsLeft <= 0 ||
                    cash < 70 ||
                    horse.energy < 16 ||
                    !facilities ||
                    !isWorkoutEnabled(facilities, "gallop")
                  }
                  className="w-full justify-between text-xs"
                  variant="outline"
                >
                  <div className="flex items-center gap-1">
                    {!facilities || !isWorkoutEnabled(facilities, "gallop") ? (
                      <Lock className="h-3 w-3" />
                    ) : null}
                    <span>Gallop</span>
                  </div>
                  <span className="text-cream-muted">$70</span>
                </Button>
              </div>
            </div>

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

      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)]">
            Beyer Speed Figure trend
          </CardTitle>
          <p className="text-xs text-cream-muted">
            Last {Math.min(10, horse.raceHistory.length)} races, oldest → newest
          </p>
        </CardHeader>
        <CardContent>
          <BeyerChart history={horse.raceHistory} />
        </CardContent>
      </Card>

      <GradedHistoryPanel history={horse.raceHistory} />

      <HorseAwardsPanel horse={horse} />

      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)]">Race history</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Select
              value={raceHistoryLimit.toString()}
              onValueChange={(v) => setRaceHistoryLimit(Number(v))}
            >
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
            <p className="text-sm text-cream-muted">No races yet.</p>
          ) : (
            <div className="space-y-1">
              {horse.raceHistory.slice(0, raceHistoryLimit).map((r, i) => (
                <div
                  key={i}
                  className="flex justify-between text-sm py-1 border-b border-gold-muted last:border-0"
                >
                  <span>{r.raceName}</span>
                  <span className="flex gap-3 items-center">
                    {typeof r.beyer === "number" && (
                      <span className="text-xs text-cream-muted">Beyer {r.beyer}</span>
                    )}
                    <span className="text-cream-muted">D{r.day}</span>
                    <Badge
                      variant={
                        r.position === 1 ? "default" : r.position <= 3 ? "secondary" : "outline"
                      }
                    >
                      {r.position}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)]">Lineage</CardTitle>
          <p className="text-xs text-cream-muted">Sire (top) and dam (bottom) for 4 generations (COI calculated to 8)</p>
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
