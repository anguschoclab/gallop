import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useGame } from "@/game/store";
import { shallow } from "zustand/shallow";
import type { GameState, Horse } from "@/game/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  FileText,
  Baby,
  Calendar,
  Target,
  ChevronRight,
  Users,
  BarChart2,
  Trophy,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PregnancyTimeline } from "@/components/PregnancyTimeline";
import { inBreedingSeason, nextBreedingSeasonStart } from "@/core/calendar/breedingCalendar";
import { isFemaleHorse } from "@/core/horse/gender";
import { getAvailableStallions } from "@/core/breeding/stallions";
import { NumericValue } from "@/components/HorseBits";
import { formatCurrency } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { FoalNamingDialog } from "@/components/FoalNamingDialog";
import { BreedingProgramPanel } from "@/components/BreedingProgramPanel";
import { useBreedingCompatibility } from "@/hooks/useBreedingCompatibility";
import { BreedingCompatibilityCard } from "@/components/breeding/BreedingCompatibilityCard";
import { PedigreeTree } from "@/components/breeding/PedigreeTree";
import { getAncestorIds } from "@/lib/pedigreeGraph";

export const Route = createFileRoute("/breeding")({
  component: BreedingPage,
});

function BreedingPage() {
  const horses = (useGame as any)((s: GameState) => s.horses || [], shallow);
  const pregnancies = (useGame as any)((s: GameState) => s.pregnancies || [], shallow);
  const log = (useGame as any)((s: GameState) => s.log || [], shallow);
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);
  const breed = useGame((s) => s.breed);
  const [sireId, setSireId] = useState<string>("");
  const [damId, setDamId] = useState<string>("");
  const [liveFoalGuarantee, setLiveFoalGuarantee] = useState(false);
  const [namingFoalId, setNamingFoalId] = useState<string | null>(null);

  const localHorseMap = useMemo(() => new Map<string, Horse>(horses.map((h: Horse) => [h.id, h])), [horses]);

  const { sire, dam, compatibility } = useBreedingCompatibility(sireId, damId);

  const sharedAncestorIds = useMemo(() => {
    if (!sireId || !damId) return undefined;
    const sireAncestors = getAncestorIds(sireId, horses, 3);
    const damAncestors = getAncestorIds(damId, horses, 3);
    const shared = new Set<string>();
    for (const id of sireAncestors) {
      if (damAncestors.has(id)) shared.add(id);
    }
    return shared.size > 0 ? shared : undefined;
  }, [sireId, damId, horses]);

  const adults = horses.filter((h: Horse) => h.age >= 3);
  const breedLogs = log.filter((l: any) => /Mated|Foal/.test(l.text));

  // Get available stallions for Northern hemisphere (default for player breeding)
  const selectedMare = localHorseMap.get(damId);
  const availableStallions = getAvailableStallions(horses, selectedMare);

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

  const activePregnancies = pregnancies.filter((p: any) => !p.resolved);
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

      <div className="flex flex-wrap gap-3">
        <Link to="/stallions">
          <Button
            variant="outline"
            className="h-10 px-5 gap-2 border-gold/30 text-cream hover:bg-gold/10 hover:border-gold/60 hover:text-gold transition-all font-[family-name:var(--font-display)] text-sm font-semibold"
          >
            <Users className="h-4 w-4 text-gold/60" />
            Stallions at Stud
            <ChevronRight className="h-3.5 w-3.5 opacity-40" />
          </Button>
        </Link>
        <Link to="/sire-watch">
          <Button
            variant="outline"
            className="h-10 px-5 gap-2 border-gold/30 text-cream hover:bg-gold/10 hover:border-gold/60 hover:text-gold transition-all font-[family-name:var(--font-display)] text-sm font-semibold"
          >
            <BarChart2 className="h-4 w-4 text-gold/60" />
            Sire Watch
            <ChevronRight className="h-3.5 w-3.5 opacity-40" />
          </Button>
        </Link>
        <Link to="/sire-leaderboards">
          <Button
            variant="outline"
            className="h-10 px-5 gap-2 border-gold/30 text-cream hover:bg-gold/10 hover:border-gold/60 hover:text-gold transition-all font-[family-name:var(--font-display)] text-sm font-semibold"
          >
            <Trophy className="h-4 w-4 text-gold/60" />
            Sire Leaderboards
            <ChevronRight className="h-3.5 w-3.5 opacity-40" />
          </Button>
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
          <TabsTrigger value="pedigree" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Pedigree
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <Target className="h-4 w-4" />
            Programs
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
                        {h.name} (age {Math.floor(h.age)})
                        {h.bruceLoweFamily ? ` • BL${h.bruceLoweFamily}` : ""} • {Math.round(h.distanceAptitude)}m • $
                        {formatCurrency(h.stud?.standingFee || 0)}
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
                      .filter((h: Horse) => isFemaleHorse(h.gender) && h.id !== sireId)
                      .map((h: Horse) => (
                        <option key={h.id} value={h.id}>
                          {h.name} (age {Math.floor(h.age)})
                          {h.bruceLoweFamily ? ` • BL${h.bruceLoweFamily}` : ""} • {Math.round(h.distanceAptitude)}m
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

              {compatibility && <BreedingCompatibilityCard compatibility={compatibility} />}

              {sire && dam && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                  {[
                    { h: sire, role: "Sire" },
                    { h: dam, role: "Dam" },
                  ].map(({ h, role }) => {
                    const bestSurface = (
                      Object.entries(h.surfaceAptitude || {}) as [string, number][]
                    ).sort((a, b) => b[1] - a[1])[0];
                    const runStyleLabel: Record<string, string> = {
                      E: "Early (Front)",
                      EP: "Early/Presser",
                      P: "Presser",
                      S: "Sustainer/Closer",
                    };
                    const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
                      <div className="flex justify-between gap-2">
                        <span className="text-cream/40">{label}</span>
                        <span className="text-cream tabular-nums text-right">{value}</span>
                      </div>
                    );
                    return (
                      <div key={role} className="bg-black/20 border border-white/5 p-3 space-y-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-cream/30 mb-2">
                          {h.name} · {role}
                        </div>
                        <div className="text-[10px] font-mono space-y-0.5">
                          <Row
                            label="Pref. Distance"
                            value={h.distanceAptitude ? `${Math.round(h.distanceAptitude)}m` : "—"}
                          />
                          <Row
                            label="Best Surface"
                            value={
                              bestSurface
                                ? `${bestSurface[0]} (${Math.round(bestSurface[1])})`
                                : "—"
                            }
                          />
                          <Row
                            label="Running Style"
                            value={runStyleLabel[h.runningStyle] || h.runningStyle || "—"}
                          />
                          <Row label="Stride" value={h.strideType || "—"} />
                          <Row label="Peak Age" value={h.peakAge ?? "—"} />
                          <Row
                            label="Heart"
                            value={h.heartScore != null ? Math.round(h.heartScore) : "—"}
                          />
                          <Row
                            label="Trainability"
                            value={h.trainability != null ? Math.round(h.trainability) : "—"}
                          />
                          <Row
                            label="Temperament"
                            value={
                              h.stats?.temperament != null ? Math.round(h.stats.temperament) : "—"
                            }
                          />
                          <Row
                            label="Spd / Sta / Acc"
                            value={
                              h.stats
                                ? `${Math.round(h.stats.speed)} / ${Math.round(h.stats.stamina)} / ${Math.round(h.stats.acceleration)}`
                                : "—"
                            }
                          />
                          {h.bruceLoweFamily != null && (
                            <Row label="Bruce Lowe" value={`BL${h.bruceLoweFamily}`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
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
              {activePregnancies.map((p: any) => {
                const daysRemaining = p.dueDay - day - 1;
                const dam = localHorseMap.get(p.damId);
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
                        <div className="flex items-center gap-3">
                          {(p.reBreedingAttempts ?? 0) > 0 && (
                            <span className="text-warning font-medium tabular-nums">
                              Re-breeding attempt {p.reBreedingAttempts}/3
                            </span>
                          )}
                          {p.liveFoalGuarantee && (
                            <span className="text-success font-medium">Live Foal Guarantee</span>
                          )}
                          {(() => {
                            const maternityLog = log.filter(
                              (l: any) =>
                                l.text.includes(p.damName) &&
                                (l.text.includes("Mated") || l.text.includes("Foal")),
                            );
                            return (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px] text-cream-muted hover:text-cream"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Log ({maternityLog.length})
                              </Button>
                            );
                          })()}
                        </div>
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
              {pregnancies.filter((p: any) => p.resolved).length === 0 ? (
                <p className="text-sm text-cream-muted">No foals born yet.</p>
              ) : (
                <div className="space-y-2">
                  {pregnancies
                    .filter((p: any) => p.resolved)
                    .map((p: any) => {
                      const foal = localHorseMap.get(p.foalId);
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
                  {breedLogs.map((l: any, i: number) => (
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

        <TabsContent value="pedigree" className="space-y-4">
          <Card className="border-gold-muted">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)]">
                Ancestry Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sire && dam ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-cream/40 mb-2 font-mono uppercase tracking-widest">
                      {sire.name} · Sire · Preferred{" "}
                      <span className="text-cream tabular-nums">
                        {sire.distanceAptitude ? `${Math.round(sire.distanceAptitude)}m` : "—"}
                      </span>
                    </div>
                    <PedigreeTree
                      horseId={sireId}
                      generations={3}
                      sharedAncestorIds={sharedAncestorIds}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-cream/40 mb-2 font-mono uppercase tracking-widest">
                      {dam.name} · Dam · Preferred{" "}
                      <span className="text-cream tabular-nums">
                        {dam.distanceAptitude ? `${Math.round(dam.distanceAptitude)}m` : "—"}
                      </span>
                    </div>
                    <PedigreeTree
                      horseId={damId}
                      generations={3}
                      sharedAncestorIds={sharedAncestorIds}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-cream-muted">
                  Select a sire and dam in the Breeding Shed to compare ancestry.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-gold-muted">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)]">
                Breeding Attempts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {breedLogs.length === 0 ? (
                <p className="text-sm text-cream-muted p-6">No breeding attempts yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-black/40 border-b border-white/5">
                      <tr className="text-[10px] uppercase tracking-widest text-cream/40 font-black">
                        <th className="px-4 py-2 text-left">Day</th>
                        <th className="px-4 py-2 text-left">Event</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {breedLogs.map((l: any, i: number) => (
                        <tr key={i} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2 tabular-nums text-cream-muted">{l.day}</td>
                          <td className="px-4 py-2 text-cream">{l.text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <BreedingProgramPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
