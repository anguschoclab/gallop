import { createFileRoute, Link, useRouter, Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sprout, CheckCircle2, Clock } from "lucide-react";
import { useGame } from "@/game/store";
import { toast } from "sonner";
import type { MilestoneChoice } from "@/core/horse/foalDevelopment";

export const Route = createFileRoute("/foal-development/$horseId")({
  component: FoalDevelopmentPage,
});

function FoalDevelopmentPage() {
  const { horseId } = Route.useParams();
  const router = useRouter();
  const horse = useGame((s) => s.horses[horseId]);
  const currentDay = useGame((s) => s.day);
  const resolveFoalMilestone = useGame((s) => s.resolveFoalMilestone);

  // Guard: horse missing.
  if (!horse) {
    return (
      <div className="p-12 text-center space-y-4">
        <h1 className="text-4xl font-black text-cream">Horse not found</h1>
        <Link to="/stable" className="text-gold uppercase font-mono text-xs tracking-wide">
          Back to Stable
        </Link>
      </div>
    );
  }

  // Guard: no arc → redirect back to the horse profile. Nothing to resolve here.
  if (!horse.developmentArc) {
    return <Navigate to="/stable/$horseId" params={{ horseId: horse.id }} replace />;
  }

  const arc = horse.developmentArc;
  const pending = arc.milestones.filter((m) => m.status === "pending");
  const resolved = arc.milestones.filter((m) => m.status === "resolved");
  const activeMilestone = pending.find((m) => m.triggerDay <= currentDay);
  const upcoming = pending.find((m) => m.triggerDay > currentDay);
  const isFullyResolved = pending.length === 0;
  const isReadOnly = !activeMilestone; // resolved or waiting for a trigger day

  const handleChoose = (choice: MilestoneChoice) => {
    if (!activeMilestone) return;
    const res = resolveFoalMilestone(horse.id, activeMilestone.key, choice.key);
    if (res.ok) {
      toast.success(`${horse.name}: ${activeMilestone.label} — ${choice.label}`);
    } else {
      toast.error(res.reason ?? "Could not resolve milestone.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Link
          to="/stable/$horseId"
          params={{ horseId: horse.id }}
          className="text-gold uppercase font-mono text-[10px] tracking-wide hover:underline"
        >
          View Horse
        </Link>
      </div>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-gold uppercase font-mono text-[10px] tracking-wide">
          <Sprout className="h-3 w-3" /> Pre-Race Preparation
        </div>
        <h1 className="text-4xl font-black text-cream">{horse.name}</h1>
        {isReadOnly && (
          <p className="text-xs text-cream/50 font-mono uppercase tracking-wide">Read-only view</p>
        )}
      </header>

      {activeMilestone ? (
        <>
          <Card className="bg-slate-900/40 border-white/5 border-l-4 border-l-gold">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-cream text-2xl">{activeMilestone.label}</CardTitle>
              <p className="text-xs text-cream/50 font-mono">
                Triggered day {activeMilestone.triggerDay}. Choose an approach — the outcome is
                permanent.
              </p>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeMilestone.choices.map((choice) => (
                <button
                  key={choice.key}
                  onClick={() => handleChoose(choice)}
                  className="text-left p-5 bg-slate-950/60 border border-white/10 hover:border-gold rounded transition-colors space-y-3 focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <div className="font-black text-cream uppercase tracking-wide text-sm">
                    {choice.label}
                  </div>
                  <p className="text-xs text-cream/70 leading-relaxed">{choice.description}</p>
                  <ul className="space-y-0.5 text-[11px] font-mono">
                    {Object.entries(choice.delta).map(([stat, delta]) => {
                      const d = delta as number;
                      const positive = d > 0;
                      return (
                        <li key={stat} className={positive ? "text-emerald-400" : "text-rose-400"}>
                          {stat}: {positive ? "+" : ""}
                          {d}
                        </li>
                      );
                    })}
                  </ul>
                </button>
              ))}
            </CardContent>
          </Card>

          {pending.length > 1 && (
            <p className="text-xs text-cream/50 font-mono">
              {pending.length - 1} additional milestone
              {pending.length - 1 === 1 ? "" : "s"} awaiting a future day.
            </p>
          )}
        </>
      ) : (
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-8 space-y-4">
            {isFullyResolved ? (
              <div className="flex items-center gap-3 text-cream">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>All development milestones are complete. This horse is ready to train.</span>
              </div>
            ) : upcoming ? (
              <div className="flex items-center gap-3 text-cream">
                <Clock className="h-5 w-5 text-cream/60" />
                <span>
                  Next milestone <span className="font-semibold">{upcoming.label}</span> unlocks on
                  day {upcoming.triggerDay} (in {upcoming.triggerDay - currentDay} day
                  {upcoming.triggerDay - currentDay === 1 ? "" : "s"}).
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {resolved.length > 0 && (
        <Card className="bg-slate-900/40 border-white/5">
          <CardHeader className="border-b border-white/5 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-wide text-cream/40">
              Resolved Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {resolved.map((m) => {
              const chosen = m.choices.find((c) => c.key === m.resolvedChoiceKey);
              return (
                <div key={m.key} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-cream/40 uppercase tracking-wide font-mono text-[10px]">
                    {m.label}
                  </span>
                  <span className="text-cream">{chosen?.label ?? m.resolvedChoiceKey}</span>
                  {m.resolvedOnDay !== undefined && (
                    <span className="ml-auto text-cream/40 font-mono text-[10px]">
                      day {m.resolvedOnDay}
                    </span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
