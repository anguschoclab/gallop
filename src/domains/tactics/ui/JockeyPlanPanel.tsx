import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import { useHorses, useRaces, useDay } from "@/platform/game/hooks/useCoreState";
import { useJockeys } from "@/platform/game/hooks/useSystemsState";
import type { GameState } from "@/platform/game/types";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  collectPlayerEntryPlans,
  summarizePlan,
  type PlanIntentLike,
  type PlanRaceLike,
} from "@/domains/tactics/model/racePlan";
import type { JockeyInstructions } from "@/domains/tactics/model/tacticsTypes";
import { INSTRUCTION_PRESETS, buildInstructions } from "@/domains/race/application/TacticOptions";

const EMPTY: PlanIntentLike[] = [];

/** Name of the preset a plan matches, or "custom" for advisor/hand-tuned plans. */
export function matchPresetId(plan: JockeyInstructions | undefined): string {
  if (!plan) return "none";
  const hit = INSTRUCTION_PRESETS.find(
    (p) =>
      p.instructions.ridingStyle === plan.ridingStyle &&
      p.instructions.earlyPosition === plan.earlyPosition &&
      p.instructions.moveTiming === plan.moveTiming &&
      p.instructions.aggressiveness === plan.aggressiveness,
  );
  return hit?.id ?? "custom";
}

export function JockeyPlanPanel({ horseId }: { horseId?: string }) {
  const races = useRaces();
  const horses = useHorses();
  const jockeys = useJockeys();
  const day = useDay();
  const pendingIntents = useGameWithShallow(
    (s: GameState) => (s.pendingIntents as unknown as PlanIntentLike[]) ?? EMPTY,
  );
  const setRaceTactics = useGame((s) => s.setRaceTactics);

  const rows = useMemo(() => {
    const all = collectPlayerEntryPlans(
      races as unknown as Record<string, PlanRaceLike>,
      pendingIntents,
      (id) => horses[id]?.ownership?.type === "player",
      day,
    );
    return horseId ? all.filter((r) => r.horseId === horseId) : all;
  }, [races, pendingIntents, horses, day, horseId]);

  const jockeyName = (id?: string) =>
    id ? (jockeys.find((j) => j.id === id)?.person.biography.displayName ?? "—") : "Not booked";

  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-wide">Jockey plans</h3>
          <Badge variant="outline">{rows.length}</Badge>
        </div>
        <Link to="/race-advisor" className="text-xs text-primary hover:underline">
          Open Race Advisor
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No upcoming entries yet. Enter a race and its riding plan will show here.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const horse = horses[r.horseId];
            const presetId = matchPresetId(r.instructions);
            return (
              <li
                key={`${r.raceId}:${r.horseId}`}
                className="py-2 grid gap-2 md:grid-cols-[1fr_auto] md:items-center"
                data-testid="jockey-plan-row"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{horse?.name ?? r.horseId}</span>
                    <span className="text-muted-foreground">in</span>
                    <Link
                      to="/race/$raceId"
                      params={{ raceId: r.raceId }}
                      className="font-medium hover:underline"
                    >
                      {r.raceName}
                    </Link>
                    <span className="text-xs text-muted-foreground">Day {r.raceDay}</span>
                    {r.entryStatus === "pending" && (
                      <Badge variant="secondary">Entry pending</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Jockey: <span className="text-foreground">{jockeyName(r.jockeyId)}</span>
                    {" · "}
                    {r.instructions ? (
                      <span className="text-foreground">{summarizePlan(r.instructions)}</span>
                    ) : (
                      <span>No plan — jockey rides on instinct</span>
                    )}
                    {r.source === "pending" && (
                      <span className="ml-1 text-primary">(applies at next race-day update)</span>
                    )}
                  </div>
                </div>
                <Select
                  value={presetId}
                  onValueChange={(id) => {
                    const preset = INSTRUCTION_PRESETS.find((p) => p.id === id);
                    if (!preset) return;
                    setRaceTactics(
                      r.raceId,
                      r.horseId,
                      buildInstructions(preset, r.horseId, r.raceId),
                    );
                    toast.success(`${horse?.name ?? "Horse"}: plan set to ${preset.name}.`);
                  }}
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs" aria-label="Change jockey plan">
                    <SelectValue placeholder="Choose plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {presetId === "none" && <SelectItem value="none">No plan</SelectItem>}
                    {presetId === "custom" && <SelectItem value="custom">Custom plan</SelectItem>}
                    {INSTRUCTION_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
