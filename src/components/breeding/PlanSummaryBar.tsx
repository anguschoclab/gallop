import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Save, FolderOpen, Trash2, Sparkles, Eraser } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";
import type { SavedMatingPlan } from "@/game/store/state/breedingState";

interface PlanSummaryBarProps {
  assignedCount: number;
  totalCost: number;
  cash: number;
  canAffordAll: boolean;
  seasonOpen: boolean;
  savedMatingPlans: SavedMatingPlan[];
  onConfirmAll: () => void;
  onAutoAssign: () => void;
  onClearAll: () => void;
  onSavePlan: (name: string) => void;
  onLoadPlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

export function PlanSummaryBar({
  assignedCount,
  totalCost,
  cash,
  canAffordAll,
  seasonOpen,
  savedMatingPlans,
  onConfirmAll,
  onAutoAssign,
  onClearAll,
  onSavePlan,
  onLoadPlan,
  onDeletePlan,
}: PlanSummaryBarProps) {
  const [planName, setPlanName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [loadPlanId, setLoadPlanId] = useState("");

  const cashRemaining = cash - totalCost;
  const canConfirm = assignedCount > 0 && seasonOpen && canAffordAll;

  return (
    <div className="sticky bottom-0 z-20 border-t border-gold-muted bg-t950/95 backdrop-blur-sm px-4 py-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge className="bg-t700 text-cream font-[family-name:var(--font-mono)] tabular-nums">
            {assignedCount} mares
          </Badge>
          <span className="text-xs text-cream-muted font-[family-name:var(--font-mono)] tabular-nums">
            Cost: {formatCurrency(totalCost)} · After: {formatCurrency(cashRemaining)}
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onAutoAssign}
            disabled={!seasonOpen}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Auto-Assign
          </Button>

          {showSaveInput ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Plan name…"
                className="h-8 w-32 rounded border border-t700 bg-t900 px-2 text-xs text-cream"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && planName.trim()) {
                    onSavePlan(planName.trim());
                    setPlanName("");
                    setShowSaveInput(false);
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => {
                  if (planName.trim()) {
                    onSavePlan(planName.trim());
                    setPlanName("");
                    setShowSaveInput(false);
                  }
                }}
                disabled={!planName.trim() || assignedCount === 0}
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setShowSaveInput(true)}
              disabled={assignedCount === 0}
            >
              <Save className="h-3.5 w-3.5" />
              Save Plan
            </Button>
          )}

          {savedMatingPlans.length > 0 && (
            <Select
              value={loadPlanId}
              onValueChange={(v) => {
                if (v === "__delete__") return;
                onLoadPlan(v);
                setLoadPlanId(v);
              }}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Load plan…" />
              </SelectTrigger>
              <SelectContent>
                {savedMatingPlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} ({plan.entries.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {loadPlanId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                onDeletePlan(loadPlanId);
                setLoadPlanId("");
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onClearAll}
            disabled={assignedCount === 0}
          >
            <Eraser className="h-3.5 w-3.5" />
            Clear
          </Button>

          <Button size="sm" className="h-8 gap-1.5" onClick={onConfirmAll} disabled={!canConfirm}>
            <Check className="h-3.5 w-3.5" />
            Confirm All ({assignedCount})
          </Button>
        </div>
      </div>
      {!seasonOpen && (
        <div className="mt-2 text-xs text-amber-400">
          Breeding season is closed. Confirm disabled until season opens.
        </div>
      )}
      {seasonOpen && !canAffordAll && assignedCount > 0 && (
        <div className="mt-2 text-xs text-red-400">
          Insufficient cash for all assignments. Total cost: {formatCurrency(totalCost)}, available:{" "}
          {formatCurrency(cash)}
        </div>
      )}
    </div>
  );
}
