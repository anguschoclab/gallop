import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
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
import {
  ArrowLeft,
  Tag,
  Zap,
  Heart,
  TrendingUp,
  HandMetal,
  ShieldCheck,
  FileText,
  Activity,
  History,
  GitBranch,
  ChevronRight,
  AlertCircle,
  Gavel,
} from "lucide-react";
import { PedigreeTree } from "@/components/breeding/PedigreeTree";
import { BeyerChart } from "@/components/BeyerChart";
import { PaceProfileSummary } from "@/components/PaceProfileSummary";
import { HorseAwardsPanel } from "@/components/awards";
import { GradedStatsChart } from "@/components/GradedStatsChart";
import { GradedHistoryPanel } from "@/components/horse/GradedHistoryPanel";
import { TrainingPanel } from "@/components/horse/TrainingPanel";
import { StaffSupportPanel } from "@/components/horse/StaffSupportPanel";
import { FounderLegacy } from "@/components/horse/FounderLegacy";
import { SyndicateDialog } from "@/components/SyndicateDialog";
import { calculateOverallRating, getAbility, abilityGrade } from "@/core/horse/stats";
import { loadRaceHistoryLimit, saveRaceHistoryLimit } from "@/services/storageAdapter";
import { GRADED_RACES } from "@/game/gradedRaces";
import { getCurrentYear } from "@/game/raceSchedule";
import { useHorseActions } from "@/hooks/useHorseActions";
import { getAffinityLevel, calculateTheHandBonus } from "@/core/jockey/affinity";
import { getPeakingBeyerMultiplier } from "@/core/health/banister";
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
    canRetireToPasture,
    consignedSale,
    eligibleSale,
    day,
  } = useHorseActions(horseId);

  const trainHorse = useGame((s) => s.trainHorse);
  const consignHorse = useGame((s) => s.consignHorse);
  const withdrawConsignment = useGame((s) => s.withdrawConsignment);
  const trainingUsed = (useGame as any)((s: any) => s.trainingUsed[horseId] ?? 0, shallow);
  const cash = useGame((s: any) => s.cash);
  const horses = useGame((s: any) => s.horses);
  const retireToStud = useGame((s: any) => s.retireToStud);
  const retireToPasture = useGame((s: any) => s.retireToPasture);
  const facilities = (useGame as any)((s: any) => s.facilities, shallow);
  const pregnancies = (useGame as any)((s: any) => s.pregnancies, shallow);
  const pregnancy = pregnancies?.find((p: any) => !p.resolved && p.damId === horseId);
  const [raceHistoryLimit, setRaceHistoryLimit] = useState<number>(() => loadRaceHistoryLimit());
  const [syndicateDialogOpen, setSyndicateDialogOpen] = useState(false);
  const syndicates = (useGame as any)((s: any) => s.syndicates || {}, shallow);
  const races = (useGame as any)((s: any) => s.races, shallow);
  const currentRace = races?.find((r: any) =>
    r.entries.some((e: any) => e.horseId === horseId && !r.resolved),
  );
  const assignedJockeyId = currentRace?.entries.find((e: any) => e.horseId === horseId)?.jockeyId;
  const jockeys = (useGame as any)((s: any) => s.jockeys, shallow);
  const assignedJockey = jockeys?.find((j: any) => j.id === assignedJockeyId);

  const handleTrain = useCallback(
    (horseId: string, type: any) => {
      trainHorse(horseId, type);
    },
    [trainHorse],
  );

  // Memoize scroll handlers for navigation buttons
  const handleScrollToSection = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const sectionId = e.currentTarget.dataset.sectionId;
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    saveRaceHistoryLimit(raceHistoryLimit);
  }, [raceHistoryLimit]);

  // Section anchor monitoring for sticky nav
  const [activeSection, setActiveSection] = useState("stats");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.5 },
    );

    ["stats", "health", "training", "beyer", "lineage", "history"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  if (!horse) throw notFound();

  const isPregnant = !!pregnancy;
  const slotsLeft = 2 - trainingUsed;
  const ovr = calculateOverallRating(horse);

  // Memoize sections to prevent recreation on every render
  const sections = useMemo(
    () => [
      { id: "stats", label: "Inventory", icon: FileText },
      { id: "health", label: "Condition", icon: Activity },
      { id: "training", label: "Training", icon: Zap },
      { id: "beyer", label: "Analytics", icon: TrendingUp },
      { id: "lineage", label: "Heritage", icon: GitBranch },
      { id: "history", label: "Race History", icon: History },
    ],
    [],
  );

  const peakingMultiplier = getPeakingBeyerMultiplier(horse.peakingIndex ?? 0);
  const peakingStatus =
    (horse.peakingIndex ?? 0) > 20
      ? "Peak"
      : (horse.peakingIndex ?? 0) > 0
        ? "Good"
        : (horse.peakingIndex ?? 0) > -10
          ? "Standard"
          : "Fatigued";

  const affinityBonus = assignedJockey ? calculateTheHandBonus(assignedJockey, horse.id) : 0;
  const affinityLevel = assignedJockey
    ? getAffinityLevel(assignedJockey.affinityMap[horse.id] || 0)
    : null;

  const g1Wins =
    horse.raceHistory?.filter((r: any) => r.grade === "G1" && r.position === 1).length || 0;
  const isG1Winner = g1Wins > 0;
  const isSyndicated = !!syndicates[horseId];

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
            {sections.map((s) => (
              <button
                key={s.id}
                data-section-id={s.id}
                onClick={handleScrollToSection}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest border-l-2 transition-all",
                  activeSection === s.id
                    ? "border-gold text-gold bg-gold/5"
                    : "border-transparent text-cream/20 hover:text-cream/60 hover:bg-white/[0.02]",
                )}
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="text-[9px] font-black uppercase tracking-tighter text-gold/40 px-3">
              Actions
            </div>
            <div className="px-3 space-y-2">
              {isG1Winner && horse.stud?.atStud && !isSyndicated && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[9px] font-black uppercase border-gold/20 hover:bg-gold/10 text-gold"
                  onClick={() => setSyndicateDialogOpen(true)}
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
                      retireToStud(horse.id);
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
        {/* Header - Stamped Identification */}
        <div className="bg-slate-950 border border-white/5 p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
            <ShieldCheck className="h-64 w-64 -rotate-12" />
          </div>

          <div className="relative flex flex-col md:flex-row gap-8 items-start">
            <div className="relative">
              <SilkDot color={horse.silk} size="lg" />
              <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-gold/40 text-gold font-mono text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg">
                {String(ovr).padStart(2, "0")}
              </div>
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="border-gold/30 text-gold-muted font-mono text-[9px] uppercase tracking-[0.2em] h-5 rounded-none px-2 bg-gold/5"
                >
                  IDENT: {horse.id.substring(0, 8).toUpperCase()}
                </Badge>
                {horse.activeInjury && (
                  <Badge
                    variant="destructive"
                    className="font-black text-[9px] uppercase tracking-widest h-5 rounded-none animate-pulse"
                  >
                    Critical
                  </Badge>
                )}
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-cream font-[family-name:var(--font-display)] uppercase">
                {horse.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                <div className="space-y-0.5">
                  <span className="block text-[9px] uppercase font-black tracking-widest text-cream/20 leading-none">
                    Vitals
                  </span>
                  <span className="text-xs font-mono text-cream/60">
                    Age: {Math.floor(horse.age)} · {horse.gender}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[9px] uppercase font-black tracking-widest text-cream/20 leading-none">
                    Pedigree Family
                  </span>
                  <span className="text-xs font-mono text-cream/60">
                    BL_{horse.bruceLoweFamily ?? "NA"}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[9px] uppercase font-black tracking-widest text-cream/20 leading-none">
                    Active Status
                  </span>
                  <span
                    className={cn(
                      "text-xs font-mono font-bold",
                      horse.lifecycleStatus === "active" ? "text-success" : "text-cream/40",
                    )}
                  >
                    {horse.lifecycleStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
              <div className="bg-black/40 border border-white/5 p-3 text-center min-w-[100px]">
                <div className="text-[9px] font-black uppercase text-cream/20 tracking-tighter mb-1">
                  Potential
                </div>
                <div className="text-2xl font-bold font-mono text-gold-bright">
                  {horse.potential}
                </div>
              </div>
              <div className="bg-black/40 border border-white/5 p-3 text-center min-w-[100px]">
                <div className="text-[9px] font-black uppercase text-cream/20 tracking-tighter mb-1">
                  Energy
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold font-mono",
                    horse.energy > 50 ? "text-success" : "text-warning",
                  )}
                >
                  {horse.energy}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pillar Layout: Physical vs Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT PILLAR: PHYSICAL INVENTORY */}
          <div className="lg:col-span-5 space-y-8">
            <section id="stats" className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gold" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
                  Equipment
                </h2>
              </div>
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-gold">
                <CardContent className="p-6 space-y-6">
                  <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                    <HorseStatsRadar horse={horse} />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Aptitude Metrics</span>
                      <span>Level</span>
                    </div>
                    <HorseStats horse={horse} />
                  </div>

                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <div className="text-[10px] font-black uppercase text-gold/40 tracking-widest px-1">
                      Training Bias
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase border-white/10 text-cream/60"
                        >
                          STYLE: {horse.runningStyle?.toUpperCase() || "NA"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase border-white/10 text-cream/60"
                        >
                          FORM: {horse.form > 0 ? "+" : ""}
                          {horse.form}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase border-white/10 text-cream/60"
                        >
                          WEATHER: {(horse.weatherPreference ?? "all").toUpperCase()}
                        </Badge>
                        <Badge
                          className={cn(
                            "font-mono text-[10px] uppercase",
                            peakingStatus === "Peak"
                              ? "bg-fame text-slate-950"
                              : "bg-black/40 text-cream/60 border border-white/5",
                          )}
                        >
                          PHASE: {peakingStatus.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section id="health" className="space-y-4 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
                  Condition Report
                </h2>
              </div>
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
                <CardContent className="p-6 space-y-6">
                  {horse.activeInjury && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 relative overflow-hidden group transition-all">
                      <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-destructive tracking-widest flex items-center gap-2">
                          <AlertCircle className="h-3 w-3" /> Injury
                        </span>
                        <span className="font-mono text-[10px] text-destructive/60">
                          Est. {horse.activeInjury.recoveryDays}d remaining
                        </span>
                      </div>
                      <div className="text-sm font-bold text-cream uppercase tracking-tight">
                        {horse.activeInjury.type}
                      </div>
                      <p className="text-[10px] text-cream/40 italic mt-1 uppercase">
                        Immediate medical intervention required. Performance locked.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/40 p-3 border border-white/5">
                      <div className="text-[9px] font-black uppercase text-blue-400/40 tracking-tighter mb-1 leading-none">
                        Fitness (Chronic)
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-xl font-bold font-mono text-cream tabular-nums leading-none">
                          {Math.round(horse.fitness ?? 0)}
                        </span>
                        <span className="text-[9px] text-cream/20 font-mono uppercase pb-0.5">
                          /100
                        </span>
                      </div>
                    </div>
                    <div className="bg-black/40 p-3 border border-white/5">
                      <div className="text-[9px] font-black uppercase text-blue-400/40 tracking-tighter mb-1 leading-none">
                        Fatigue (Acute)
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-xl font-bold font-mono text-warning tabular-nums leading-none">
                          {Math.round(horse.fatigue ?? 0)}
                        </span>
                        <span className="text-[9px] text-cream/20 font-mono uppercase pb-0.5">
                          /100
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[10px] font-black uppercase text-blue-400/40 tracking-widest px-1">
                      Genetic Vulnerabilities
                    </div>
                    <div className="space-y-1.5">
                      {(["bleederRisk", "roarerRisk", "ocdRisk"] as const).map((risk) => {
                        const val = horse[risk];
                        return (
                          <div
                            key={risk}
                            className="flex items-center justify-between text-[11px] font-mono p-2 bg-black/20 rounded"
                          >
                            <span className="text-cream/60 uppercase tracking-tighter">
                              {risk.replace("Risk", "")}_SENSITIVITY
                            </span>
                            <span
                              className={cn(
                                "font-bold",
                                val > 70
                                  ? "text-destructive"
                                  : val > 30
                                    ? "text-warning"
                                    : "text-success/60",
                              )}
                            >
                              {val > 70 ? "HIGH" : val > 30 ? "MOD" : "LOW"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* RIGHT PILLAR: PERFORMANCE RECORDS */}
          <div className="lg:col-span-7 space-y-8">
            {/* Management Sticky Actions (Only for Player Horses) */}
            {horse.owned && (
              <section id="management" className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gavel className="h-4 w-4 text-warning" />
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
                    Racing & Status
                  </h2>
                </div>
                <Card className="bg-slate-900/60 border-warning/20 rounded-none shadow-2xl">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 space-y-1.5 text-center md:text-left">
                        {isConsigned && consignedSale ? (
                          <>
                            <div className="flex items-center justify-center md:justify-start gap-2 text-warning font-black text-xs uppercase tracking-widest">
                              <Gavel className="h-3.5 w-3.5" /> Consigned: {consignedSale.name}
                            </div>
                            <p className="text-[10px] text-cream/40 uppercase font-mono tracking-tighter">
                              Asset awaiting public auction resolution in{" "}
                              {Math.max(0, consignedSale.day - day)}D.
                            </p>
                          </>
                        ) : eligibleSale ? (
                          <>
                            <div className="text-success font-black text-xs uppercase tracking-widest">
                              Available to Race
                            </div>
                            <p className="text-[10px] text-cream/40 uppercase font-mono tracking-tighter">
                              {eligibleSale.name} accepting entries.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="text-cream/60 font-black text-xs uppercase tracking-widest">
                              Staying in Stable
                            </div>
                            <p className="text-[10px] text-cream/20 uppercase font-mono tracking-tighter">
                              No active public auctions for this asset class.
                            </p>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                        <div className="p-4 text-center text-cream/50 text-sm">
                          Action buttons temporarily disabled
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

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
                      {slotsLeft} slots left
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <TrainingPanel
                    horse={horse}
                    isPregnant={isPregnant}
                    slotsLeft={slotsLeft}
                    cash={cash}
                    facilities={facilities}
                    onTrain={handleTrain}
                  />
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <PrivateTrialDialog horse={horse} horses={horses} cash={cash} />
                  </div>
                </CardContent>
              </Card>
            </section>

            <section id="beyer" className="space-y-4 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-cream/60" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
                  Beyer Performance Analysis
                </h2>
              </div>
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl">
                <CardContent className="p-6">
                  <div className="mb-6 flex justify-between items-end border-b border-white/5 pb-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase text-cream/20 tracking-widest">
                        Velocity Trend
                      </div>
                      <div className="text-xs font-mono text-cream/60 uppercase tracking-tighter">
                        Last 10 races
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase text-cream/20 tracking-widest">
                        Peak Index
                      </div>
                      <div className="text-sm font-mono font-black text-fame tabular-nums">
                        +{Math.round((peakingMultiplier - 1) * 100)}%
                      </div>
                    </div>
                  </div>
                  <BeyerChart history={horse.raceHistory} />
                  {horse.raceHistory.some(
                    (h: any) => h.pacePositions && h.pacePositions.length > 0,
                  ) && (
                    <div className="bg-black/20 border border-white/5 p-4 mt-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-cream/20 mb-4">
                        Pace Profile
                      </h3>
                      <PaceProfileSummary horse={horse} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section id="lineage" className="space-y-4 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="h-4 w-4 text-pink-500" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
                  Heritage & Ancestry
                </h2>
              </div>
              <PedigreeTree horseId={horse.id} generations={4} />
            </section>

            <section id="history" className="space-y-4 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-cream/60" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
                  Service History
                </h2>
              </div>
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl overflow-hidden">
                <CardHeader className="bg-black/40 py-3 border-b border-white/5 flex flex-row items-center justify-between">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40">
                    Race Archives
                  </CardTitle>
                  <Select
                    value={raceHistoryLimit.toString()}
                    onValueChange={(v) => setRaceHistoryLimit(Number(v))}
                  >
                    <SelectTrigger className="w-[100px] h-7 text-[9px] font-black uppercase bg-slate-950/50 border-white/10 rounded-none tracking-widest">
                      <SelectValue placeholder="Limit" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                      <SelectItem value="10">SAMPLE_10</SelectItem>
                      <SelectItem value="20">SAMPLE_20</SelectItem>
                      <SelectItem value="50">SAMPLE_50</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="p-0">
                  {horse.raceHistory.length === 0 ? (
                    <div className="p-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
                      No service records detected in central archive
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {horse.raceHistory.slice(0, raceHistoryLimit).map((r: any, i: number) => (
                        <div
                          key={i}
                          className="group px-6 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-cream uppercase tracking-tight group-hover:text-gold transition-colors">
                              {r.raceName}
                            </div>
                            <div className="text-[9px] font-mono text-cream/30 uppercase">
                              D{String(r.day).padStart(3, "0")} · {r.distance}M · {r.raceClass}
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            {typeof r.beyer === "number" && (
                              <div className="text-right">
                                <div className="text-[8px] font-black uppercase text-cream/20 tracking-tighter">
                                  Beyer
                                </div>
                                <div className="text-xs font-mono font-black text-cream/60 tabular-nums leading-none">
                                  {r.beyer}
                                </div>
                              </div>
                            )}
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full border flex items-center justify-center font-mono font-black text-sm tabular-nums shadow-lg",
                                r.position === 1
                                  ? "border-fame text-fame bg-fame/5"
                                  : r.position <= 3
                                    ? "border-success/40 text-success bg-success/5"
                                    : "border-white/10 text-cream/20",
                              )}
                            >
                              {r.position}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <FounderLegacy horseId={horse.id} />
            <GradedHistoryPanel history={horse.raceHistory} />
            <HorseAwardsPanel horse={horse} />
          </div>
        </div>
      </div>

      <SyndicateDialog
        isOpen={syndicateDialogOpen}
        onClose={() => setSyndicateDialogOpen(false)}
        stallionId={horse.id}
        stallionName={horse.name}
      />
    </div>
  );
}
