/**
 * components/horse/FoalDevelopmentPanel.tsx — "Pre-Race Preparation" panel.
 *
 * Rendered on the stable horse-detail page whenever a horse has a
 * `developmentArc`. Summarizes progress, previews the next pending milestone
 * (with the stat delta for each choice), and links into the resolution page,
 * plus a compact history of any milestones that have already been resolved.
 */

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { Horse } from "@/core/horse/types";
import type { MilestoneStatDelta, MilestoneChoice } from "@/core/horse/foalDevelopment";
import { useGame } from "@/game/store";

interface Props {
  horse: Horse;
}

function StatDeltaList({ delta }: { delta: MilestoneStatDelta }) {
  const entries = Object.entries(delta) as [string, number][];
  if (entries.length === 0) return null;
  return (
    <ul className="space-y-0.5 text-[10px] font-mono">
      {entries.map(([stat, value]) => {
        const positive = value > 0;
        return (
          <li key={stat} className={positive ? "text-emerald-400" : "text-rose-400"}>
            {stat}: {positive ? "+" : ""}
            {value}
          </li>
        );
      })}
    </ul>
  );
}

export function FoalDevelopmentPanel({ horse }: Props) {
  const arc = horse.developmentArc;
  const currentDay = useGame((s) => s.day);

  // ⚡ Bolt Optimization:
  // Pre-calculate hash map for O(1) chosen-choice lookups instead of running
  // O(N) .find() inside the .map() render loop. Called unconditionally (before
  // the early return) to satisfy react-hooks/rules-of-hooks.
  const chosenByMilestoneKey = useMemo(() => {
    const map = new Map<string, MilestoneChoice | undefined>();
    if (!arc) return map;
    for (const m of arc.milestones.filter((r) => r.status === "resolved")) {
      map.set(
        m.key,
        m.choices.find((c) => c.key === m.resolvedChoiceKey),
      );
    }
    return map;
  }, [arc]);

  if (!arc) return null;

  const openMilestones = arc.milestones.filter((m) => m.status === "pending");
  const resolvedMilestones = arc.milestones.filter((m) => m.status === "resolved");
  const activeMilestone = openMilestones.find((m) => m.triggerDay <= currentDay);
  const nextUpcoming = openMilestones.find((m) => m.triggerDay > currentDay);

  return (
    <section id="foal-development" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sprout className="h-4 w-4 text-gold" />
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
          Pre-Race Preparation
        </h2>
      </div>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-gold">
        <CardHeader className="pb-2 border-b border-white/5">
          <CardTitle className="text-[10px] font-black uppercase tracking-wide text-cream/40">
            Development Arc
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {activeMilestone ? (
            <div className="flex items-start gap-3 p-3 border border-gold/40 bg-gold/5 rounded">
              <AlertCircle className="h-4 w-4 text-gold-bright mt-0.5 shrink-0" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm text-cream font-semibold">
                    {activeMilestone.label} awaiting your decision.
                  </p>
                  <p className="text-[11px] text-cream/50 font-mono">
                    Triggered day {activeMilestone.triggerDay} · {openMilestones.length} open
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {activeMilestone.choices.map((choice) => (
                    <div
                      key={choice.key}
                      className="p-2 bg-slate-950/40 border border-white/5 rounded"
                    >
                      <div className="text-[11px] font-black uppercase tracking-wide text-cream">
                        {choice.label}
                      </div>
                      <StatDeltaList delta={choice.delta} />
                    </div>
                  ))}
                </div>
                <Link
                  to="/foal-development/$horseId"
                  params={{ horseId: horse.id }}
                  className="inline-block text-gold uppercase font-mono text-[10px] tracking-wide hover:underline"
                >
                  Resolve Milestone →
                </Link>
              </div>
            </div>
          ) : nextUpcoming ? (
            <div className="flex items-start gap-3 p-3 border border-white/10 bg-slate-950/40 rounded">
              <Clock className="h-4 w-4 text-cream/60 mt-0.5 shrink-0" />
              <div className="text-xs text-cream/70">
                Next milestone:{" "}
                <span className="text-cream font-semibold">{nextUpcoming.label}</span>
                <span className="text-cream/40 font-mono ml-2">
                  Day {nextUpcoming.triggerDay} (in {nextUpcoming.triggerDay - currentDay}d)
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-cream/60 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              All development milestones complete.
            </div>
          )}

          {resolvedMilestones.length > 0 && (
            <ul className="space-y-1 text-xs text-cream/70 pt-2 border-t border-white/5">
              {resolvedMilestones.map((m) => {
                const chosen = chosenByMilestoneKey.get(m.key);
                return (
                  <li key={m.key} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span className="text-cream/40 uppercase tracking-widest font-mono">
                      {m.label}:
                    </span>
                    <span className="text-cream">{chosen?.label ?? m.resolvedChoiceKey}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
