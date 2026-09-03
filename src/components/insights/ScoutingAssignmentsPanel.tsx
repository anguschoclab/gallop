/**
 * ScoutingAssignmentsPanel.tsx - Standing scouting orders
 *
 * Lets the player create recurring scouting assignments with the same threshold
 * set used by manual bulk scouting. Each enabled assignment runs automatically
 * when the day advances, within its own daily budget and per-day cap.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScoutingThresholdControls } from "./ScoutingThresholdControls";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import {
  SCOUTING_PRIORITIES,
  describeScoutingThresholds,
  type ScoutingAssignment,
  type ScoutingPriority,
} from "@/core/npc/scoutingThresholds";
import { formatCurrency } from "@/core/common/formatting";
import { ClipboardList, Play, Plus, Trash2 } from "lucide-react";

export function ScoutingAssignmentsPanel() {
  const assignments = useGameWithShallow(
    (s: GameState) => (s.scoutingAssignments ?? []) as ScoutingAssignment[],
  );
  const day = useGame((s) => s.day);
  const addAssignment = useGame((s) => s.addScoutingAssignment);
  const updateAssignment = useGame((s) => s.updateScoutingAssignment);
  const removeAssignment = useGame((s) => s.removeScoutingAssignment);
  const runAssignments = useGame((s) => s.runScoutingAssignments);

  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const enabledCount = useMemo(() => assignments.filter((a) => a.enabled).length, [assignments]);

  const create = () => {
    const created = addAssignment?.(newName.trim() || `Assignment ${assignments.length + 1}`);
    setNewName("");
    if (created) setOpenId(created.id);
  };

  const runNow = () => {
    const res = runAssignments?.();
    if (!res || res.dispatched === 0) {
      toast.info("No horses matched your assignment thresholds today.");
      return;
    }
    toast.success(`Dispatched ${res.dispatched} scout(s) for ${formatCurrency(res.spent)}`);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/40 border-white/5 rounded-none">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-gold uppercase tracking-[0.2em] font-mono text-[10px] font-bold">
                <ClipboardList className="h-3.5 w-3.5" />
                Scouting Assignments
              </div>
              <p className="text-[11px] text-cream-muted mt-1 font-mono">
                {enabledCount} active order(s) — they run automatically each morning within budget.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Assignment name"
                className="h-8 w-48 text-xs"
                aria-label="New assignment name"
              />
              <Button size="sm" className="h-8 text-xs" onClick={create}>
                <Plus className="mr-1.5 h-3 w-3" /> New
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={runNow}
                disabled={enabledCount === 0}
              >
                <Play className="mr-1.5 h-3 w-3" /> Run now
              </Button>
            </div>
          </div>

          {assignments.length === 0 && (
            <p className="text-xs text-cream-muted font-mono">
              No standing orders yet. Create one to have scouts sent automatically at every horse
              that clears your thresholds.
            </p>
          )}

          <div className="space-y-3">
            {assignments.map((a) => (
              <div key={a.id} className="border border-white/5 bg-slate-950/40">
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <Switch
                    checked={a.enabled}
                    onCheckedChange={(v) => updateAssignment?.(a.id, { enabled: v })}
                    aria-label={`Enable ${a.name}`}
                  />
                  <Input
                    value={a.name}
                    onChange={(e) => updateAssignment?.(a.id, { name: e.target.value })}
                    className="h-8 w-52 text-xs"
                    aria-label="Assignment name"
                  />
                  <div className="flex items-center gap-1.5">
                    <Label className="font-mono text-[9px] uppercase tracking-widest text-cream/40">
                      Daily budget
                    </Label>
                    <Input
                      type="number"
                      step={500}
                      min={0}
                      value={a.dailyBudget}
                      onChange={(e) =>
                        updateAssignment?.(a.id, { dailyBudget: Number(e.target.value) || 0 })
                      }
                      className="h-8 w-28 text-xs"
                      aria-label="Daily budget"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="font-mono text-[9px] uppercase tracking-widest text-cream/40">
                      Max / day
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={a.maxPerDay}
                      onChange={(e) =>
                        updateAssignment?.(a.id, {
                          maxPerDay: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="h-8 w-20 text-xs"
                      aria-label="Max scouts per day"
                    />
                  </div>
                  <Select
                    value={a.priority}
                    onValueChange={(v) =>
                      updateAssignment?.(a.id, { priority: v as ScoutingPriority })
                    }
                  >
                    <SelectTrigger className="h-8 w-52 text-xs" aria-label="Assignment priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCOUTING_PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setOpenId(openId === a.id ? null : a.id)}
                    >
                      {openId === a.id ? "Hide thresholds" : "Edit thresholds"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-destructive"
                      onClick={() => removeAssignment?.(a.id)}
                      aria-label={`Delete ${a.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                  {describeScoutingThresholds(a.thresholds).map((chip) => (
                    <Badge
                      key={chip}
                      variant="outline"
                      className="border-white/10 text-[10px] text-cream/60"
                    >
                      {chip}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="border-gold/30 text-[10px] text-gold">
                    {a.totalScouted} scouted · {formatCurrency(a.totalSpent)}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 text-[10px] text-cream/40">
                    {a.lastRunDay === null
                      ? "Never run"
                      : `Last run day ${a.lastRunDay} (today ${day})`}
                  </Badge>
                </div>

                {openId === a.id && (
                  <div className="border-t border-white/5 p-3">
                    <ScoutingThresholdControls
                      value={a.thresholds}
                      onChange={(next) => updateAssignment?.(a.id, { thresholds: next })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
