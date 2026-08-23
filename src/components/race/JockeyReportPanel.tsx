import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SilkDot } from "@/components/SilkDot";
import { cn } from "@/lib/cn";
import {
  generateJockeyReport,
  jockeyGradeColorClass,
  type JockeyReport,
} from "@/core/race/jockeyReport";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { SectionalSplit } from "@/core/race/types";
import {
  Flag,
  Gauge,
  Crosshair,
  ListChecks,
  Rocket,
  BatteryCharging,
  Shuffle,
  MapPin,
  Heart,
  Sparkles,
  Trophy,
  ChevronRight,
} from "lucide-react";

interface JockeyReportPanelProps {
  runners: Runner[];
  ordered: Runner[];
  sectionalSplits?: SectionalSplit[];
  className?: string;
}

const FACET_ICONS = {
  gate_break: Flag,
  pace_setting: Gauge,
  positioning: Crosshair,
  tactical_execution: ListChecks,
  closing_kick: Rocket,
  energy_management: BatteryCharging,
  traffic_handling: Shuffle,
  course_knowledge: MapPin,
  horse_affinity: Heart,
  trait_synergy: Sparkles,
  overall_ride: Trophy,
} as const;

export function JockeyReportPanel({
  runners,
  ordered,
  sectionalSplits,
  className,
}: JockeyReportPanelProps) {
  const ownedRunners = useMemo(
    () => runners.filter((r) => r.isPlayer && r.finishTime !== null),
    [runners],
  );
  const ownedRunnerMap = useMemo(() => {
    const map = new Map<string, Runner>();
    for (let i = 0; i < ownedRunners.length; i++) {
      map.set(ownedRunners[i].horseId, ownedRunners[i]);
    }
    return map;
  }, [ownedRunners]);

  const finishPositionMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < ordered.length; i++) {
      map.set(ordered[i].horseId, i + 1);
    }
    return map;
  }, [ordered]);

  const reports = useMemo<JockeyReport[]>(
    () =>
      ownedRunners.map((r) => generateJockeyReport(r, ordered, sectionalSplits, finishPositionMap)),
    [ownedRunners, ordered, sectionalSplits, finishPositionMap],
  );
  const reportMap = useMemo(() => {
    const map = new Map<string, JockeyReport>();
    for (let i = 0; i < reports.length; i++) {
      map.set(reports[i].horseId, reports[i]);
    }
    return map;
  }, [reports]);

  const [selectedId, setSelectedId] = useState<string | null>(reports[0]?.horseId ?? null);

  if (reports.length === 0) return null;

  const active = reportMap.get(selectedId ?? "") ?? reports[0];

  return (
    <section className={cn("border border-gold/20 bg-black/30 p-5 space-y-4", className)}>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.3em] text-gold/50">
            Stable Intelligence
          </div>
          <h3 className="text-lg font-black text-cream uppercase tracking-tight font-[family-name:var(--font-display)]">
            Jockey Report
          </h3>
          <p className="text-[11px] font-mono text-cream/40 mt-0.5">
            10-point ride evaluation for your runners
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "px-3 py-1.5 border font-mono text-[10px] uppercase tracking-widest flex items-center gap-2",
              jockeyGradeColorClass(active.averageGrade),
            )}
          >
            <span className="text-cream/40">Overall</span>
            <span className="text-base font-black tabular-nums">{active.averageGrade}</span>
            <span className="text-cream/40 tabular-nums">{active.averageScore.toFixed(0)}/100</span>
          </div>
        </div>
      </header>

      {/* Runner switcher (when >1 owned runner) */}
      {reports.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {reports.map((r) => {
            const isActive = r.horseId === active.horseId;
            const runner = ownedRunnerMap.get(r.horseId);
            return (
              <button
                key={r.horseId}
                type="button"
                onClick={() => setSelectedId(r.horseId)}
                className={cn(
                  "flex items-center gap-2 px-3 h-8 border text-[10px] uppercase tracking-widest font-mono transition-colors",
                  isActive
                    ? "border-gold/60 bg-gold/10 text-gold"
                    : "border-white/10 text-cream/50 hover:border-gold/30 hover:text-cream",
                )}
              >
                {runner && <SilkDot color={runner.silk} size="sm" />}
                <span className="font-bold">{r.horseName}</span>
                <span className="text-cream/30">· {r.averageGrade}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Header strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono uppercase tracking-widest">
        <Stat label="Horse" value={active.horseName} />
        <Stat
          label="Rider"
          value={
            active.jockeyId ? (
              <Link
                to="/jockey/$jockeyId"
                params={{ jockeyId: active.jockeyId }}
                className="text-cream hover:text-gold flex items-center gap-1"
              >
                {active.jockeyName} <ChevronRight className="h-2.5 w-2.5" />
              </Link>
            ) : (
              active.jockeyName
            )
          }
        />
        <Stat label="Finish" value={`${active.finishPosition} / ${active.fieldSize}`} />
        <Stat label="Score" value={`${active.averageScore.toFixed(0)} / 100`} />
      </div>

      {/* Facet grid */}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {active.facets.map((facet) => {
          const Icon = FACET_ICONS[facet.id];
          return (
            <li
              key={facet.id}
              className="border border-white/5 bg-slate-950/40 p-3 space-y-2 hover:border-white/15 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-cream/40 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-widest text-cream truncate">
                      {facet.label}
                    </div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-cream/30 truncate">
                      {facet.description}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 px-2 py-0.5 border font-mono text-[10px] uppercase tracking-widest font-black tabular-nums",
                    jockeyGradeColorClass(facet.grade),
                  )}
                  title={`${facet.score.toFixed(0)} / 100`}
                >
                  {facet.grade}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-white/5 overflow-hidden">
                <div
                  className={cn(
                    "h-full",
                    facet.grade === "A+" || facet.grade === "A"
                      ? "bg-success"
                      : facet.grade === "B"
                        ? "bg-broadcast-accent"
                        : facet.grade === "C"
                          ? "bg-cream/40"
                          : facet.grade === "D"
                            ? "bg-warning"
                            : "bg-destructive",
                  )}
                  style={{ width: `${facet.score}%` }}
                />
              </div>

              <p className="text-[11px] text-cream/70 leading-relaxed">{facet.note}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border border-white/5 bg-slate-950/40 px-3 py-2">
      <div className="text-[9px] uppercase tracking-widest text-cream/30 font-mono">{label}</div>
      <div className="text-xs font-bold text-cream truncate">{value}</div>
    </div>
  );
}
