import { useState } from "react";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ALL_ARCHETYPES, type Archetype } from "@/core/breeding/archetypes";
import { calculateGeneticDistance } from "@/core/breeding/programs";
import { toast } from "sonner";
import {
  Target,
  TrendingDown,
  CheckCircle2,
  Circle,
  Plus,
  X,
  ChevronRight,
  Dna,
  Award,
} from "lucide-react";

// ─── Archetype icons / palette ────────────────────────────────────────────────

const ARCHETYPE_META: Record<string, { color: string; emoji: string }> = {
  "elite-turf-stayer": { color: "border-emerald-600 bg-emerald-900/20", emoji: "🌿" },
  "dirt-sprinter": { color: "border-amber-600 bg-amber-900/20", emoji: "⚡" },
  "classic-miler": { color: "border-blue-500 bg-blue-900/20", emoji: "⚖️" },
  "turf-specialist": { color: "border-green-500 bg-green-900/20", emoji: "🍃" },
  "iron-horse": { color: "border-slate-400 bg-slate-800/30", emoji: "🛡️" },
  "early-developer": { color: "border-yellow-500 bg-yellow-900/20", emoji: "🌟" },
  "late-bloomer": { color: "border-purple-500 bg-purple-900/20", emoji: "🌸" },
  "all-weather": { color: "border-cyan-500 bg-cyan-900/20", emoji: "🌐" },
  "triple-crown-usa": { color: "border-red-500 bg-red-900/20", emoji: "🏆" },
  "triple-crown-canada": { color: "border-red-400 bg-red-900/20", emoji: "🍁" },
  "triple-crown-uk-classics": { color: "border-rose-500 bg-rose-900/20", emoji: "👑" },
  "triple-crown-specialist": { color: "border-gold-400 bg-amber-900/30", emoji: "🥇" },
};

function archetypeMeta(id: string) {
  return ARCHETYPE_META[id] ?? { color: "border-gold-muted", emoji: "🐎" };
}

// ─── Distance badge ───────────────────────────────────────────────────────────

function DistanceBadge({ distance }: { distance: number }) {
  const pct = Math.round((1 - distance) * 100);
  const cls =
    distance < 0.2
      ? "bg-emerald-800 text-emerald-200"
      : distance < 0.4
        ? "bg-blue-800 text-blue-200"
        : distance < 0.6
          ? "bg-amber-800 text-amber-200"
          : "bg-t700 text-cream-muted";
  return (
    <Badge className={cn("font-[family-name:var(--font-mono)] tabular-nums text-xs", cls)}>
      {pct}% match
    </Badge>
  );
}

// ─── Archetype card ───────────────────────────────────────────────────────────

function ArchetypeCard({
  archetype,
  onSelect,
}: {
  archetype: Archetype;
  onSelect: (id: string) => void;
}) {
  const meta = archetypeMeta(archetype.id);
  return (
    <button
      onClick={() => onSelect(archetype.id)}
      className={cn(
        "text-left rounded-lg border p-3 transition-all hover:brightness-110 hover:scale-[1.01] w-full",
        meta.color,
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none mt-0.5">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-cream font-[family-name:var(--font-display)] truncate">
            {archetype.name}
          </p>
          <p className="text-xs text-cream-muted mt-0.5 line-clamp-2 font-[family-name:var(--font-body)]">
            {archetype.description}
          </p>
          <div className="flex gap-1 mt-2 flex-wrap">
            <Badge className="text-[10px] px-1.5 py-0 bg-t800 text-cream-muted">
              {archetype.targetPhenotype.surface}
            </Badge>
            <Badge className="text-[10px] px-1.5 py-0 bg-t800 text-cream-muted">
              {archetype.targetPhenotype.distance}m
            </Badge>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-cream-muted shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ─── Active program view ──────────────────────────────────────────────────────

function ActiveProgramView() {
  const program = useGame((s) => s.activeBreedingProgram)!;
  const horses = useGame((s) => s.horses);
  const cancelBreedingProgram = useGame((s) => s.cancelBreedingProgram);
  const enrollDamInProgram = useGame((s) => s.enrollDamInProgram);
  const unenrollDamFromProgram = useGame((s) => s.unenrollDamFromProgram);

  const archetype = ALL_ARCHETYPES.find((a) => a.id === program.archetypeId);
  const meta = archetypeMeta(program.archetypeId);

  // Eligible mares: owned, adult, not enrolled
  const eligibleMares = horses.filter(
    (h) =>
      h.owned &&
      (h.gender === "mare" || h.gender === "filly") &&
      h.age >= 3 &&
      !program.enrolledDamIds.includes(h.id),
  );

  const enrolledMares = horses.filter((h) => program.enrolledDamIds.includes(h.id));

  const progressPct = Math.round((1 - program.geneticDistance) * 100);

  const handleEnroll = (damId: string) => {
    const result = enrollDamInProgram(damId);
    if (!result.ok) toast.error(result.reason);
  };

  const handleCancel = () => {
    cancelBreedingProgram();
    toast.info("Breeding program cancelled.");
  };

  return (
    <div className="space-y-4">
      {/* Program header */}
      <Card className={cn("border-2", meta.color)}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{meta.emoji}</span>
              <div>
                <CardTitle className="font-[family-name:var(--font-display)] text-base">
                  {archetype?.name ?? program.archetypeId}
                </CardTitle>
                <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                  Generation {program.generationCount} · {enrolledMares.length} mare
                  {enrolledMares.length !== 1 ? "s" : ""} enrolled
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DistanceBadge distance={program.geneticDistance} />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-cream-muted hover:text-red-400"
                onClick={handleCancel}
                aria-label="Cancel breeding program"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-cream-muted font-[family-name:var(--font-mono)]">
              <span>Archetype Match</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
          <p className="text-xs text-cream-muted font-[family-name:var(--font-body)] line-clamp-2">
            {archetype?.description}
          </p>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card className="border-gold-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-[family-name:var(--font-display)] flex items-center gap-2">
            <Award className="h-4 w-4 text-gold" />
            Milestones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {program.milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-sm">
              {m.achieved ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-cream-muted shrink-0" />
              )}
              <span
                className={cn(
                  "font-[family-name:var(--font-body)]",
                  m.achieved ? "text-cream" : "text-cream-muted",
                )}
              >
                {m.description}
              </span>
              {m.achieved && m.achievedDay !== undefined && (
                <span className="ml-auto text-xs text-cream-muted font-[family-name:var(--font-mono)]">
                  Day {m.achievedDay}
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Enrolled mares */}
      <Card className="border-gold-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-[family-name:var(--font-display)] flex items-center gap-2">
            <Dna className="h-4 w-4 text-gold" />
            Enrolled Mares
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {enrolledMares.length === 0 && (
            <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
              No mares enrolled yet. Add eligible mares below.
            </p>
          )}
          {enrolledMares.map((mare) => {
            const dist = archetype
              ? calculateGeneticDistance(mare, archetype)
              : program.geneticDistance;
            return (
              <div
                key={mare.id}
                className="flex items-center justify-between gap-2 py-1 border-b border-gold-muted/30 last:border-0"
              >
                <div>
                  <p className="text-sm font-[family-name:var(--font-display)] text-cream">
                    {mare.name}
                  </p>
                  <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                    Age {mare.age} · {Math.round(mare.distanceAptitude)}m · {(() => {
                      const best = Object.entries(mare.surfaceAptitude || {} as Record<string, number>).sort((a, b) => b[1] - a[1])[0];
                      return best ? `${best[0]} (${Math.round(best[1])})` : "—";
                    })()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <DistanceBadge distance={dist} />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-cream-muted hover:text-red-400"
                    onClick={() => unenrollDamFromProgram(mare.id)}
                    aria-label={`Remove ${mare.name} from program`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Add mare */}
          {eligibleMares.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-cream-muted mb-1.5 font-[family-name:var(--font-body)]">
                Add mare to program:
              </p>
              <div className="space-y-1">
                {eligibleMares.slice(0, 5).map((mare) => {
                  const dist = archetype ? calculateGeneticDistance(mare, archetype) : 1;
                  return (
                    <button
                      key={mare.id}
                      onClick={() => handleEnroll(mare.id)}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-t700 text-left transition-colors"
                    >
                      <div>
                        <span className="text-sm text-cream font-[family-name:var(--font-display)]">
                          {mare.name}
                        </span>
                        <p className="text-[10px] text-cream-muted font-[family-name:var(--font-body)]">
                          {Math.round(mare.distanceAptitude)}m · {(() => {
                            const best = Object.entries(mare.surfaceAptitude || {} as Record<string, number>).sort((a, b) => b[1] - a[1])[0];
                            return best ? `${best[0]} (${Math.round(best[1])})` : "—";
                          })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <DistanceBadge distance={dist} />
                        <Plus className="h-3.5 w-3.5 text-cream-muted" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {program.history.length > 0 && (
        <Card className="border-gold-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-[family-name:var(--font-display)] flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-gold" />
              Progress History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {[...program.history]
                .reverse()
                .slice(0, 6)
                .map((entry, i) => {
                  const horse = horses.find((h) => h.id === entry.horseId);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs font-[family-name:var(--font-mono)]"
                    >
                      <span className="text-cream-muted">
                        Day {entry.day} · {horse?.name ?? entry.horseId}
                      </span>
                      <DistanceBadge distance={entry.distance} />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Archetype picker ─────────────────────────────────────────────────────────

function ArchetypePicker() {
  const startBreedingProgram = useGame((s) => s.startBreedingProgram);
  const [filter, setFilter] = useState<"all" | "turf" | "dirt" | "classic" | "triple">("all");

  const filtered = ALL_ARCHETYPES.filter((a) => {
    if (filter === "turf") return a.targetPhenotype.surface === "Turf";
    if (filter === "dirt") return a.targetPhenotype.surface === "Dirt";
    if (filter === "triple") return a.id.startsWith("triple-crown");
    if (filter === "classic") return !a.id.startsWith("triple-crown");
    return true;
  });

  const handleSelect = (id: string) => {
    const result = startBreedingProgram(id);
    if (result.ok) {
      toast.success("Breeding program started.");
    } else {
      toast.error(result.reason);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] flex items-center gap-2">
            <Target className="h-5 w-5 text-gold" />
            Choose an Archetype
          </CardTitle>
          <p className="text-sm text-cream-muted font-[family-name:var(--font-body)]">
            A breeding program gives you a generational target. The simulator will highlight
            stallions that move your line closer to the archetype.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "classic", "turf", "dirt", "triple"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-[family-name:var(--font-mono)] transition-colors",
                  filter === f ? "bg-gold text-t950" : "bg-t700 text-cream-muted hover:bg-t600",
                )}
              >
                {f === "triple" ? "Triple Crown" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filtered.map((a) => (
              <ArchetypeCard key={a.id} archetype={a} onSelect={handleSelect} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function BreedingProgramPanel() {
  const activeProgram = useGame((s) => s.activeBreedingProgram);

  if (activeProgram) {
    return <ActiveProgramView />;
  }

  return <ArchetypePicker />;
}
