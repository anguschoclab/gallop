import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { ALL_ARCHETYPES } from "@/core/breeding/archetypes";
import { calculateGeneticDistance } from "@/core/breeding/programs";
import { toast } from "sonner";
import { DistanceBadge } from "./DistanceBadge";
import { archetypeMeta } from "./ArchetypeMeta";
import { TrendingDown, CheckCircle2, Circle, Plus, X, Dna, Award } from "lucide-react";
import type { Horse } from "@/core/horse/types";

function getBestSurface(mare: Horse) {
  const best = Object.entries((mare.surfaceAptitude || {}) as Record<string, number>).sort(
    (a, b) => b[1] - a[1],
  )[0];
  return best ? `${best[0]} (${Math.round(best[1])})` : "—";
}

export function ActiveProgramView() {
  const program = useGame((s) => s.activeBreedingProgram)!;
  const horses = useGame((s) => s.horses);
  const cancelBreedingProgram = useGame((s) => s.cancelBreedingProgram);
  const enrollDamInProgram = useGame((s) => s.enrollDamInProgram);
  const unenrollDamFromProgram = useGame((s) => s.unenrollDamFromProgram);

  const archetype = ALL_ARCHETYPES.find((a) => a.id === program.archetypeId);
  const meta = archetypeMeta(program.archetypeId);

  // ⚡ Bolt Optimization:
  // Pre-calculate hash map for O(1) horse lookups instead of running O(N) .find() inside the map loops.
  // Impact: Reduces rendering complexity from O(N*M) to O(N+M) avoiding UI jank.

  // ⚡ Bolt Optimization:
  // Pre-calculate a Set for O(1) membership checks instead of running O(M) .includes() inside the .filter() loop.
  // Impact: Reduces complexity from O(N*M) to O(N+M), improving render performance when lists are large.
  const enrolledDamSet = useMemo(() => new Set(program.enrolledDamIds), [program.enrolledDamIds]);

  const eligibleMares = Object.values(horses).filter(
    (h) =>
      h.owned &&
      (h.gender === "mare" || h.gender === "filly") &&
      h.age >= 3 &&
      !enrolledDamSet.has(h.id),
  );

  const enrolledMares = Object.values(horses).filter((h) => enrolledDamSet.has(h.id));
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
                    Age {mare.age} · {Math.round(mare.distanceAptitude)}m · {getBestSurface(mare)}
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
                          {Math.round(mare.distanceAptitude)}m · {getBestSurface(mare)}
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
                  const horse = horses[entry.horseId];
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
