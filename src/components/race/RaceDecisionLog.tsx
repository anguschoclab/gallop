import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Zap, Wind } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";

export interface RaceDecisionRunner {
  horseId: string;
  name: string;
  owned: boolean;
  runningStyle?: string;
}

interface RaceDecisionLogProps {
  snapshots: RaceSnapshot[];
  runners: RaceDecisionRunner[];
  distance: number;
}

interface DecisionEvent {
  horseId: string;
  time: number;
  type: "lane_change" | "pace_sensing" | "drafting";
  description: string;
  severity: "info" | "notable" | "key";
}

const LANE_CHANGE_THRESHOLD = 0.5;
const VELOCITY_CHANGE_THRESHOLD = 0.15;
const DRAFTING_DISTANCE = 5;
const DRAFTING_LANE_TOLERANCE = 0.5;
const MIN_SNAPSHOTS_FOR_ANALYSIS = 2;

function analyzeSnapshots(
  snapshots: RaceSnapshot[],
  runnerMap: Map<string, RaceDecisionRunner>,
): DecisionEvent[] {
  if (snapshots.length < MIN_SNAPSHOTS_FOR_ANALYSIS) return [];

  const events: DecisionEvent[] = [];
  const prevData = new Map<string, { lane: number; velocity: number; position: number }>();

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];

    for (const horse of snap.horses) {
      const prev = prevData.get(horse.horseId);
      if (!prev) {
        prevData.set(horse.horseId, {
          lane: horse.lane,
          velocity: horse.velocity,
          position: horse.position,
        });
        continue;
      }

      const runner = runnerMap.get(horse.horseId);
      if (!runner) continue;

      const laneDelta = Math.abs(horse.lane - prev.lane);
      const velocityDelta = Math.abs(horse.velocity - prev.velocity) / Math.max(prev.velocity, 1);

      if (laneDelta >= LANE_CHANGE_THRESHOLD) {
        const direction = horse.lane > prev.lane ? "outside" : "inside";
        events.push({
          horseId: horse.horseId,
          time: snap.t,
          type: "lane_change",
          description: `Moved ${direction} from lane ${prev.lane.toFixed(1)} to ${horse.lane.toFixed(1)}`,
          severity: laneDelta > 1.0 ? "key" : "notable",
        });
      }

      if (velocityDelta >= VELOCITY_CHANGE_THRESHOLD && prev.velocity > 0) {
        const direction = horse.velocity > prev.velocity ? "accelerated" : "eased";
        const pct = Math.round(velocityDelta * 100);
        events.push({
          horseId: horse.horseId,
          time: snap.t,
          type: "pace_sensing",
          description: `${direction} by ${pct}% — ${runner.runningStyle === "S" ? "closer conserving energy" : runner.runningStyle === "E" ? "front-runner asserting" : "adjusting to pace"}`,
          severity: pct > 25 ? "key" : "notable",
        });
      }

      const nearbyAhead = snap.horses.find(
        (other) =>
          other.horseId !== horse.horseId &&
          other.position > horse.position &&
          other.position - horse.position < DRAFTING_DISTANCE &&
          other.position - horse.position > 0.5 &&
          Math.abs(other.lane - horse.lane) < DRAFTING_LANE_TOLERANCE,
      );

      if (nearbyAhead && i > 0) {
        const otherRunner = runnerMap.get(nearbyAhead.horseId);
        if (otherRunner) {
          events.push({
            horseId: horse.horseId,
            time: snap.t,
            type: "drafting",
            description: `Drafting behind ${otherRunner.name} (lane ${horse.lane.toFixed(1)})`,
            severity: "info",
          });
        }
      }

      prevData.set(horse.horseId, {
        lane: horse.lane,
        velocity: horse.velocity,
        position: horse.position,
      });
    }
  }

  return events;
}

const TYPE_CONFIG = {
  lane_change: { icon: GitBranch, color: "text-blue-400", label: "Lane Change" },
  pace_sensing: { icon: Zap, color: "text-amber-400", label: "Pace Sensing" },
  drafting: { icon: Wind, color: "text-cyan-400", label: "Drafting" },
} as const;

const SEVERITY_BADGE = {
  info: "bg-white/5 text-cream/40 border-white/10",
  notable: "bg-amber-400/10 text-amber-400 border-amber-400/30",
  key: "bg-gold/10 text-gold border-gold/30",
} as const;

export const RaceDecisionLog = memo(function RaceDecisionLog({
  snapshots,
  runners,
  distance: _distance,
}: RaceDecisionLogProps) {
  const runnerMap = useMemo(() => new Map(runners.map((r) => [r.horseId, r])), [runners]);

  const events = useMemo(() => analyzeSnapshots(snapshots, runnerMap), [snapshots, runnerMap]);

  if (snapshots.length === 0) return null;

  const playerEvents = events.filter((e) => runnerMap.get(e.horseId)?.owned);
  const otherEvents = events.filter((e) => !runnerMap.get(e.horseId)?.owned);
  const displayEvents = [...playerEvents, ...otherEvents].slice(0, 30);

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-purple-400">
      <CardHeader className="bg-black/20 border-b border-white/5">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40 flex items-center gap-2">
          <GitBranch className="h-3 w-3 text-purple-400" /> AI Decision Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {displayEvents.length === 0 ? (
          <div className="p-6 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
            No significant tactical decisions detected in this race.
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
            {displayEvents.map((event, idx) => {
              const runner = runnerMap.get(event.horseId);
              const config = TYPE_CONFIG[event.type];
              const Icon = config.icon;
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-start gap-2 p-2",
                    runner?.owned && "border-l-2 border-l-gold bg-gold/5",
                  )}
                >
                  <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", config.color)} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-cream truncate">
                        {runner?.name ?? event.horseId}
                      </span>
                      <Badge
                        className={cn(
                          "rounded-none text-[7px] font-black uppercase tracking-widest border px-1",
                          SEVERITY_BADGE[event.severity],
                        )}
                      >
                        {config.label}
                      </Badge>
                    </div>
                    <div className="text-[9px] font-mono text-cream/40">
                      <span className="text-cream/30">t={event.time.toFixed(1)}s</span>{" "}
                      {event.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
