import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { useState, useMemo, type ComponentType } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HorseAwardsPanel } from "@/components/awards";
import { FounderLegacy } from "@/components/horse/FounderLegacy";
import { TrainingPanel } from "@/components/horse/TrainingPanel";
import { SyndicateDialog } from "@/components/SyndicateDialog";
import { HorseDetailHeader } from "@/components/horse/HorseDetailHeader";
import { HorseIdentitySection } from "@/components/horse/HorseIdentitySection";
import { HorseConditionSection } from "@/components/horse/HorseConditionSection";
import { HorseAnalyticsSection } from "@/components/horse/HorseAnalyticsSection";
import { HorseManagementSection } from "@/components/horse/HorseManagementSection";
import { HorseLineageSection } from "@/components/horse/HorseLineageSection";
import { HorseRaceHistorySection } from "@/components/horse/HorseRaceHistorySection";
import { calculateOverallRating } from "@/core/horse/stats";
import { useHorseActions } from "@/hooks/useHorseActions";
import { useHorseDetail } from "@/hooks/useHorseDetail";
import {
  ArrowLeft,
  Zap,
  FileText,
  Activity,
  TrendingUp,
  GitBranch,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/stable/$horseId")({
  component: HorseDetail,
  notFoundComponent: () => (
    <div className="p-12 text-center space-y-4">
      <h1 className="text-4xl font-black font-[family-name:var(--font-display)] text-cream">
        Horse not found
      </h1>
      <Link
        to="/stable"
        className="text-gold uppercase font-mono text-xs tracking-widest hover:underline"
      >
        Back to Stable
      </Link>
    </div>
  ),
});

const generateRiderFeedback = (horse: any, distance: number, surface: string) => {
  const preferredDistance = horse.distanceAptitude;
  const preferredSurfaceAptitude = horse.surfaceAptitude[surface] ?? 0.95;

  let feedback = "";
  if (preferredSurfaceAptitude < 0.95) {
    feedback += `"${horse.name} struggled to get proper traction on the ${surface} surface, feeling a bit green. `;
  } else {
    feedback += `"${horse.name} moved smoothly over the ${surface} surface. `;
  }

  const distDiff = Math.abs(preferredDistance - distance);
  if (distDiff > 400) {
    if (distance > preferredDistance) {
      feedback += `She ran out of steam in the final furlongs; this distance (${distance}m) is too long for her current stamina. `;
    } else {
      feedback += `She finished with plenty of energy but lacked the early speed; this sprint distance is too sharp for her. `;
    }
  } else {
    feedback += `She settled into a nice rhythm and handled the ${distance}m distance comfortably. `;
  }

  if (horse.stats.acceleration > 75) {
    feedback += `Showed an explosive turn of foot when asked to accelerate."`;
  } else {
    feedback += `Finished with a steady, grinding run."`;
  }
  return feedback;
};

export function PrivateTrialDialog({
  horse,
  horses,
  cash,
}: {
  horse: any;
  horses: any[];
  cash: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [distance, setDistance] = useState<number>(1200);
  const [surface, setSurface] = useState<"Turf" | "Dirt" | "Synthetic">("Turf");
  const [opponentId, setOpponentId] = useState<string>("pacemaker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialResult, setTrialResult] = useState<any>(null);

  const runPrivateTrial = useGame((s: any) => s.runPrivateTrial);

  const eligibleOpponents = useMemo(() => {
    return horses.filter((h) => h.owned && h.energy >= 15 && h.id !== horse.id);
  }, [horses, horse.id]);

  const handleStartTrial = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = runPrivateTrial(horse.id, opponentId, distance, surface);
      if (res.ok) {
        setTrialResult(res.result);
      } else {
        setError(res.reason || "Failed to start trial.");
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTrialResult(null);
    setError(null);
  };

  const chartData = useMemo(() => {
    if (!trialResult || !trialResult.snapshots) return [];

    let oppName = "Pacemaker";
    if (opponentId !== "pacemaker") {
      const oppHorse = eligibleOpponents.find((h) => h.id === opponentId);
      if (oppHorse) oppName = oppHorse.name;
    }

    return trialResult.snapshots.map((snap: any) => {
      const dataPoint: any = { t: Number(snap.t.toFixed(1)) };
      snap.horses.forEach((hSnap: any) => {
        const name = hSnap.horseId === horse.id ? horse.name : oppName;
        dataPoint[name] = Number((hSnap.velocity * 3.6).toFixed(1));
      });
      return dataPoint;
    });
  }, [trialResult, horse.name, opponentId, eligibleOpponents]);

  const runnerStats = useMemo(() => {
    if (!trialResult || !trialResult.result) return [];

    let oppName = "Pacemaker";
    if (opponentId !== "pacemaker") {
      const oppHorse = eligibleOpponents.find((h) => h.id === opponentId);
      if (oppHorse) oppName = oppHorse.name;
    }

    return trialResult.result
      .map((res: any) => {
        const isPlayer = res.horseId === horse.id;
        return {
          name: isPlayer ? horse.name : oppName,
          isPlayer,
          position: res.position,
          time: res.time,
        };
      })
      .sort((a: any, b: any) => a.position - b.position);
  }, [trialResult, horse.name, opponentId, eligibleOpponents]);

  const feedback = useMemo(() => {
    if (!trialResult) return "";
    return generateRiderFeedback(horse, distance, surface);
  }, [trialResult, horse, distance, surface]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) handleReset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          disabled={horse.energy < 20 || cash < 250}
          className="w-full bg-gold hover:bg-gold-bright text-slate-950 font-black uppercase tracking-widest text-xs h-10 rounded-none shadow-lg mt-2"
        >
          Run Private Trial ($250 / -20 Energy)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-950 border border-gold-muted/40 rounded-none text-cream shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="border-b border-white/5 pb-4">
          <DialogTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream">
            Private Trial Simulator
          </DialogTitle>
          <DialogDescription className="text-xs text-cream-muted uppercase font-mono tracking-wider">
            Test {horse.name}'s performance under controlled conditions.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 font-mono uppercase tracking-wider mb-4">
            Error: {error}
          </div>
        )}

        {!trialResult ? (
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-cream/60">
                  Distance
                </Label>
                <Select value={String(distance)} onValueChange={(v) => setDistance(Number(v))}>
                  <SelectTrigger className="bg-slate-900 border-white/5 rounded-none text-cream font-mono uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/5 text-cream rounded-none uppercase font-mono">
                    <SelectItem value="1000">1000m (5F)</SelectItem>
                    <SelectItem value="1200">1200m (6F)</SelectItem>
                    <SelectItem value="1400">1400m (7F)</SelectItem>
                    <SelectItem value="1600">1600m (1M)</SelectItem>
                    <SelectItem value="1800">1800m (9F)</SelectItem>
                    <SelectItem value="2000">2000m (10F)</SelectItem>
                    <SelectItem value="2400">2400m (12F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-cream/60">
                  Surface
                </Label>
                <Select value={surface} onValueChange={(v: any) => setSurface(v)}>
                  <SelectTrigger className="bg-slate-900 border-white/5 rounded-none text-cream font-mono uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/5 text-cream rounded-none uppercase font-mono">
                    <SelectItem value="Turf">Turf</SelectItem>
                    <SelectItem value="Dirt">Dirt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-cream/60">
                  Opponent
                </Label>
                <Select value={opponentId} onValueChange={setOpponentId}>
                  <SelectTrigger className="bg-slate-900 border-white/5 rounded-none text-cream font-mono uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/5 text-cream rounded-none uppercase font-mono">
                    <SelectItem value="pacemaker">Pacemaker (AI)</SelectItem>
                    {eligibleOpponents.map((opp) => (
                      <SelectItem key={opp.id} value={opp.id}>
                        {opp.name} ({opp.energy} energy)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-4 space-y-2 text-xs font-mono uppercase tracking-wider text-cream-muted">
              <div className="flex justify-between">
                <span>Cost:</span>
                <span className="text-gold font-bold">$250</span>
              </div>
              <div className="flex justify-between">
                <span>{horse.name} energy requirement:</span>
                <span className="text-warning font-bold">-20 energy</span>
              </div>
              {opponentId !== "pacemaker" && (
                <div className="flex justify-between">
                  <span>Opponent energy requirement:</span>
                  <span className="text-warning font-bold">-15 energy</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleStartTrial}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 font-black uppercase tracking-widest text-xs h-10 rounded-none shadow-lg"
            >
              {loading ? "Simulating Trial..." : "Simulate Trial"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {runnerStats.map((stat: any, idx: number) => (
                <div
                  key={idx}
                  className={cn(
                    "p-4 border",
                    stat.isPlayer ? "border-gold/30 bg-gold/5" : "border-white/5 bg-black/20",
                  )}
                >
                  <div className="text-[10px] font-black uppercase tracking-widest text-cream/40 leading-none mb-1">
                    Finish Position: {stat.position}
                  </div>
                  <div className="text-sm font-black uppercase text-cream truncate">
                    {stat.name}
                  </div>
                  <div className="text-lg font-mono font-black text-gold mt-2">
                    {stat.time.toFixed(2)}s
                  </div>
                </div>
              ))}
            </div>

            {/* Velocity Trajectory Chart */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-cream/60">
                Velocity Profile (km/h)
              </Label>
              <div className="h-56 w-full bg-black/40 border border-white/5 p-4 relative">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold/40" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gold/40" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gold/40" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold/40" />

                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="t"
                      tick={{ fontSize: 9, fontFamily: "monospace", fill: "rgba(245,245,220,0.4)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}s`}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fontFamily: "monospace", fill: "rgba(245,245,220,0.4)" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <ChartTooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(212,175,55,0.3)",
                        borderRadius: 0,
                        padding: "8px 12px",
                        boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                      }}
                      itemStyle={{ fontFamily: "monospace", fontSize: 11, fontWeight: "bold" }}
                      labelStyle={{
                        fontFamily: "monospace",
                        fontSize: 9,
                        color: "rgba(245,245,220,0.6)",
                        marginBottom: 4,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={horse.name}
                      stroke="#d4af37" // Gold
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey={
                        opponentId === "pacemaker"
                          ? "Pacemaker"
                          : eligibleOpponents.find((h) => h.id === opponentId)?.name || "Opponent"
                      }
                      stroke="#60a5fa" // Blue
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rider feedback */}
            <div className="bg-black/20 border border-white/5 p-4 rounded-none">
              <div className="text-[10px] font-black uppercase tracking-widest text-gold mb-2">
                Rider Feedback
              </div>
              <p className="text-xs font-mono italic text-cream/90">{feedback}</p>
            </div>

            <Button
              onClick={handleReset}
              className="w-full bg-gold hover:bg-gold-bright text-slate-950 font-black uppercase tracking-widest text-xs h-10 rounded-none shadow-lg"
            >
              Configure New Trial
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HorseDetail() {
  const { horseId } = Route.useParams();
  const router = useRouter();
  const {
    horse,
    isConsigned,
    canRetireToStud,
    consignedSale,
    eligibleSale,
    day,
  } = useHorseActions(horseId);

  const detail = useHorseDetail(horseId);

  if (!horse) throw notFound();

  const ovr = calculateOverallRating(horse);
  const { peakingMultiplier, peakingStatus, g1Wins } = detail;
  const isG1Winner = g1Wins > 0;

  const iconMap: Record<string, ComponentType<{ className?: string }>> = {
    stats: FileText,
    health: Activity,
    training: Zap,
    beyer: TrendingUp,
    lineage: GitBranch,
    history: History,
  };

  return (
    <div className="flex gap-8 relative pb-20 animate-fade-in">
      {/* Sticky Navigation Sidebar */}
      <aside className="hidden xl:block w-48 shrink-0">
        <div className="sticky top-6 space-y-6">
          <button
            onClick={() => router.navigate({ to: "/stable" })}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cream/30 hover:text-gold transition-colors mb-8"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Stable
          </button>

          <nav className="space-y-1">
            {detail.sections.map((s) => {
              const Icon = iconMap[s.id];
              return (
                <button
                  key={s.id}
                  data-section-id={s.id}
                  onClick={detail.handleScrollToSection}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest border-l-2 transition-all",
                    detail.activeSection === s.id
                      ? "border-gold text-gold bg-gold/5"
                      : "border-transparent text-cream/20 hover:text-cream/60 hover:bg-white/[0.02]",
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="text-[9px] font-black uppercase tracking-tighter text-gold/40 px-3">
              Actions
            </div>
            <div className="px-3 space-y-2">
              {isG1Winner && horse.stud?.atStud && !detail.isSyndicated && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[9px] font-black uppercase border-gold/20 hover:bg-gold/10 text-gold"
                  onClick={() => detail.setSyndicateDialogOpen(true)}
                >
                  Syndicate
                </Button>
              )}
              {canRetireToStud && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[9px] font-black uppercase border-gold/20 hover:bg-gold/10 text-gold-bright"
                  onClick={() => {
                    if (confirm(`Retire ${horse.name} to stud? This cannot be undone.`)) {
                      detail.retireToStud(horse.id);
                    }
                  }}
                >
                  Retire to Stud
                </Button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Record Area */}
      <div className="flex-1 space-y-12">
        <HorseDetailHeader horse={horse} ovr={ovr} />

        {/* Pillar Layout: Physical vs Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT PILLAR */}
          <div className="lg:col-span-5 space-y-8">
            <HorseIdentitySection horse={horse} peakingStatus={peakingStatus} />
            <HorseConditionSection horse={horse} />
            <HorseManagementSection
              horse={horse}
              isConsigned={isConsigned}
              consignedSale={consignedSale}
              eligibleSale={eligibleSale}
              day={day}
            />
          </div>

          {/* RIGHT PILLAR */}
          <div className="lg:col-span-7 space-y-8">
            <section id="training" className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-gold" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
                  Training
                </h2>
              </div>
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-gold">
                <CardHeader className="pb-2 border-b border-white/5">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-cream/40">
                      Training Schedule
                    </CardTitle>
                    <span className="text-[10px] font-mono text-gold-bright font-black uppercase">
                      {detail.slotsLeft} slots left
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <TrainingPanel
                    horse={horse}
                    isPregnant={detail.isPregnant}
                    slotsLeft={detail.slotsLeft}
                    cash={detail.cash}
                    facilities={detail.facilities}
                    onTrain={detail.handleTrain}
                  />
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <PrivateTrialDialog horse={horse} horses={detail.horses} cash={detail.cash} />
                  </div>
                </CardContent>
              </Card>
            </section>

            <HorseAnalyticsSection horse={horse} peakingMultiplier={peakingMultiplier} />

            <HorseLineageSection
              horse={horse}
              horseId={horseId}
              progenyPregnancies={detail.progenyPregnancies}
              reBreedingPregnancies={detail.reBreedingPregnancies}
              localHorseMap={detail.localHorseMap}
            />

            <HorseRaceHistorySection
              horse={horse}
              raceHistoryLimit={detail.raceHistoryLimit}
              onLimitChange={detail.setRaceHistoryLimit}
            />

            <FounderLegacy horseId={horse.id} />
            <HorseAwardsPanel horse={horse} />
          </div>
        </div>
      </div>

      <SyndicateDialog
        isOpen={detail.syndicateDialogOpen}
        onClose={() => detail.setSyndicateDialogOpen(false)}
        stallionId={horse.id}
        stallionName={horse.name}
      />
    </div>
  );
}
