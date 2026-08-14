/**
 * InRunningSnapshotDialog.tsx
 *
 * Inspector modal for frozen in-running snapshots.
 * Allows deep inspection of runner condition badges, velocities, tactical states,
 * and positions captured at an exact moment while the live simulation continues.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RunnerConditionBadges } from "@/components/race/RunnerConditionBadges";
import { RunnerMoodFace } from "@/components/race/RunnerMoodFace";
import { Camera, Clock, Activity, Trash2, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  InRunningSnapshot,
  InRunningRunnerSnapshot,
} from "@/hooks/race/useInRunningSnapshots";
import type { ConditionTone } from "@/core/race/runnerConditions";

const TONE_BORDER_CLASSES: Record<ConditionTone, string> = {
  positive: "border-success/40 bg-success/10 text-success-foreground",
  caution: "border-warning/40 bg-warning/10 text-warning-foreground",
  negative: "border-destructive/40 bg-destructive/10 text-destructive-foreground",
  neutral: "border-white/10 bg-white/5 text-foreground",
};

interface InRunningSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshots: InRunningSnapshot[];
  selectedSnapshot: InRunningSnapshot | null;
  onSelectSnapshot: (id: string) => void;
  onClearSnapshots: () => void;
  currentSimTime?: number;
}

export function InRunningSnapshotDialog({
  open,
  onOpenChange,
  snapshots,
  selectedSnapshot,
  onSelectSnapshot,
  onClearSnapshots,
  currentSimTime,
}: InRunningSnapshotDialogProps) {
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);

  if (!selectedSnapshot && snapshots.length === 0) {
    return null;
  }

  const activeSnapshot = selectedSnapshot ?? snapshots[snapshots.length - 1];
  const sortedRunners = activeSnapshot
    ? [...activeSnapshot.runners].sort((a, b) => a.rank - b.rank)
    : [];

  const inspectedRunner: InRunningRunnerSnapshot | undefined =
    sortedRunners.find((r) => r.horseId === selectedHorseId) ?? sortedRunners[0];

  const totalConditionsCount = sortedRunners.reduce((sum, r) => sum + r.conditions.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-slate-950/95 border border-white/10 text-white shadow-2xl backdrop-blur-2xl">
        <DialogHeader className="border-b border-white/10 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-sm font-black uppercase tracking-widest text-cream flex items-center gap-2">
                <Camera className="h-4 w-4 text-broadcast-accent" />
                In-Running Condition Snapshot
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Frozen state captured at{" "}
                <span className="text-broadcast-accent font-bold font-mono">
                  {activeSnapshot?.simTime.toFixed(1)}s
                </span>{" "}
                sim time (
                {activeSnapshot ? new Date(activeSnapshot.capturedAt).toLocaleTimeString() : ""})
              </DialogDescription>
            </div>

            {currentSimTime !== undefined && (
              <div
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 self-start sm:self-auto"
                aria-label="Live race continuing in background"
              >
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse shadow-[0_0_8px_var(--destructive)]" />
                <span className="text-[10px] font-black uppercase tracking-wider text-white">
                  Live Race:
                </span>
                <span className="text-[10px] font-mono tabular-nums text-broadcast-accent">
                  {currentSimTime.toFixed(1)}s
                </span>
              </div>
            )}
          </div>

          {/* Multiple snapshot selector bar */}
          {snapshots.length > 1 && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5 overflow-x-auto pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                Snapshots ({snapshots.length}):
              </span>
              <div className="flex items-center gap-1.5">
                {snapshots.map((snap, idx) => {
                  const isSelected = snap.id === activeSnapshot?.id;
                  return (
                    <button
                      key={snap.id}
                      type="button"
                      onClick={() => {
                        onSelectSnapshot(snap.id);
                        setSelectedHorseId(null);
                      }}
                      className={cn(
                        "px-2 py-1 rounded text-[10px] font-mono font-bold transition-all shrink-0",
                        isSelected
                          ? "bg-broadcast-accent text-slate-950 shadow-sm"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white border border-white/5",
                      )}
                    >
                      #{idx + 1} ({snap.simTime.toFixed(1)}s)
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Snapshot Summary Bar */}
        {activeSnapshot && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-1 border-b border-white/5 bg-black/20 text-xs">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                Sim Timestamp
              </span>
              <span className="font-mono font-bold text-broadcast-accent">
                {activeSnapshot.simTime.toFixed(1)}s
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                Wall-Clock Time
              </span>
              <span className="font-mono text-cream font-medium">
                {new Date(activeSnapshot.capturedAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                Leader Distance
              </span>
              <span className="font-mono text-cream font-medium">
                {Math.round(activeSnapshot.leaderPos)}m / {activeSnapshot.distance}m (
                {Math.round((activeSnapshot.leaderPos / activeSnapshot.distance) * 100)}%)
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                Active Conditions
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {totalConditionsCount} active across field
              </span>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-3">
          {/* Runner Selection & Inspection Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Field Table (Rankings & Badges at Snapshot) */}
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-cream-muted">
                  Field at Snapshot ({sortedRunners.length} Runners)
                </span>
                <span className="text-[9px] text-muted-foreground">Click runner to inspect</span>
              </div>

              <div className="border border-white/10 rounded-lg overflow-hidden bg-black/30 divide-y divide-white/5">
                {sortedRunners.map((runner) => {
                  const isSelected = runner.horseId === inspectedRunner?.horseId;
                  return (
                    <div
                      key={runner.horseId}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedHorseId(runner.horseId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedHorseId(runner.horseId);
                        }
                      }}
                      className={cn(
                        "p-2.5 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer text-left",
                        isSelected
                          ? "bg-broadcast-accent/15 border-l-2 border-broadcast-accent"
                          : "hover:bg-white/5",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-mono font-bold text-muted-foreground shrink-0">
                          #{runner.rank}
                        </span>
                        <div
                          className="h-3.5 w-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
                          style={{ backgroundColor: runner.silk || "#ffffff" }}
                        />
                        <div className="truncate">
                          <div className="font-bold text-cream truncate flex items-center gap-1.5">
                            {runner.name}
                            {runner.owned && (
                              <span className="text-[8px] px-1 py-0.2 bg-broadcast-accent text-slate-950 font-black uppercase rounded">
                                Owner
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {Math.round(runner.position)}m · {runner.velocity.toFixed(1)} m/s
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {runner.tacticalBadge && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-muted/80 text-foreground uppercase">
                            {runner.tacticalBadge}
                          </span>
                        )}
                        <RunnerConditionBadges conditions={runner.conditions} max={2} />
                        {runner.mood && (
                          <RunnerMoodFace mood={runner.mood} horseName={runner.name} size={16} />
                        )}
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 text-muted-foreground transition-transform",
                            isSelected && "text-broadcast-accent translate-x-0.5",
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Runner Detailed Condition Inspector */}
            <div className="lg:col-span-5 space-y-3">
              {inspectedRunner ? (
                <div className="border border-white/10 rounded-lg p-3 bg-black/40 space-y-3">
                  <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-cream flex items-center gap-1.5">
                        {inspectedRunner.name}
                        {inspectedRunner.owned && (
                          <span className="text-[8px] px-1 bg-broadcast-accent text-slate-950 font-bold rounded">
                            Owned
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        Rank #{inspectedRunner.rank} · Gate {inspectedRunner.gate} · Lane{" "}
                        {inspectedRunner.lane}
                      </div>
                    </div>

                    {inspectedRunner.mood && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                        <RunnerMoodFace
                          mood={inspectedRunner.mood}
                          horseName={inspectedRunner.name}
                          size={14}
                        />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-cream">
                          {inspectedRunner.mood.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Runner Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/5 p-2 rounded">
                    <div>
                      <span className="text-muted-foreground text-[9px] uppercase block">
                        Position
                      </span>
                      <span className="font-bold text-cream">
                        {Math.round(inspectedRunner.position)}m / {activeSnapshot?.distance}m
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[9px] uppercase block">
                        Velocity
                      </span>
                      <span className="font-bold text-broadcast-accent">
                        {inspectedRunner.velocity.toFixed(1)} m/s
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[9px] uppercase block">
                        Coverage
                      </span>
                      <span className="font-bold text-cream">
                        {inspectedRunner.distanceCoveredPct.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[9px] uppercase block">
                        Tactical Status
                      </span>
                      <span className="font-bold text-foreground">
                        {inspectedRunner.tacticalBadge || "Tracking"}
                      </span>
                    </div>
                  </div>

                  {/* Conditions Details */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                      Active Conditions ({inspectedRunner.conditions.length})
                    </span>

                    {inspectedRunner.conditions.length === 0 ? (
                      <div className="p-2.5 rounded border border-white/5 bg-white/5 text-[11px] text-muted-foreground">
                        No special conditions active at this moment. Runner is proceeding normally.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {inspectedRunner.conditions.map((cond) => (
                          <div
                            key={cond.id}
                            className={cn(
                              "p-2.5 rounded-lg border text-xs space-y-1",
                              TONE_BORDER_CLASSES[cond.tone],
                            )}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="uppercase tracking-wide flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {cond.label}
                              </span>
                              <span className="text-[9px] uppercase tracking-wider opacity-70">
                                {cond.tone}
                              </span>
                            </div>
                            <p className="text-[11px] opacity-90 leading-relaxed">{cond.detail}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mood signals if available */}
                  {inspectedRunner.mood && inspectedRunner.mood.signals.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">
                        Mood Factors ({inspectedRunner.mood.score}/100)
                      </span>
                      <div className="space-y-1">
                        {inspectedRunner.mood.signals.map((sig) => (
                          <div
                            key={sig.label}
                            className="flex items-center justify-between text-[10px] font-mono text-muted-foreground"
                          >
                            <span>{sig.label}</span>
                            <span
                              className={cn(
                                "font-bold",
                                sig.contribution > 0
                                  ? "text-success"
                                  : sig.contribution < 0
                                    ? "text-destructive"
                                    : "text-muted-foreground",
                              )}
                            >
                              {sig.contribution > 0 ? `+${sig.contribution}` : sig.contribution}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-6 text-center text-xs text-muted-foreground border border-white/10 rounded-lg">
                  Select a runner to inspect condition details.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 pt-3 flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSnapshots}
            className="text-muted-foreground hover:text-destructive gap-1.5 text-xs"
            aria-label="Clear all frozen snapshots"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Snapshots
          </Button>

          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-broadcast-accent text-slate-950 hover:bg-broadcast-accent/90 font-bold text-xs"
          >
            Close Inspector (Resume Viewing Live)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
