/**
 * components/horse/FoalDevelopmentPanel.tsx — "Pre-Race Preparation" panel.
 *
 * Rendered on the stable horse-detail page whenever a horse has a
 * `developmentArc`. Shows how many milestones are still awaiting the player's
 * decision and provides a link into the resolution page, plus a compact
 * history of any milestones that have already been resolved.
 */

import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Horse } from "@/core/horse/types";

interface Props {
  horse: Horse;
}

export function FoalDevelopmentPanel({ horse }: Props) {
  const arc = horse.developmentArc;
  if (!arc) return null;

  const openMilestones = arc.milestones.filter((m) => m.status === "pending");
  const resolvedMilestones = arc.milestones.filter((m) => m.status === "resolved");

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
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-cream/40">
            Development Arc
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {openMilestones.length > 0 ? (
            <div className="flex items-start gap-3 p-3 border border-gold/40 bg-gold/5 rounded">
              <AlertCircle className="h-4 w-4 text-gold-bright mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-cream">
                  {openMilestones.length} milestone
                  {openMilestones.length === 1 ? "" : "s"} awaiting your decision.
                </p>
                <Link
                  to="/foal-development/$horseId"
                  params={{ horseId: horse.id }}
                  className="inline-block text-gold uppercase font-mono text-[10px] tracking-widest hover:underline"
                >
                  Resolve Milestones →
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-cream/60 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              All development milestones complete.
            </div>
          )}

          {resolvedMilestones.length > 0 && (
            <ul className="space-y-1 text-xs text-cream/70">
              {resolvedMilestones.map((m) => {
                const chosen = m.choices.find((c) => c.key === m.resolvedChoiceKey);
                return (
                  <li key={m.key} className="flex items-center gap-2">
                    <span className="text-cream/40 uppercase tracking-widest font-mono">
                      {m.label}:
                    </span>
                    <span className="text-cream">{chosen?.label ?? m.resolvedChoiceKey}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {openMilestones.length > 0 && (
            <ul className="space-y-1 text-[11px] text-cream/50 pt-2 border-t border-white/5">
              {openMilestones.map((m) => (
                <li key={m.key} className="flex items-center justify-between">
                  <span>{m.label}</span>
                  <span className="font-mono">Day {m.triggerDay}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
