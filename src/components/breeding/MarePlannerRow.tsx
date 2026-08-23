import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, X } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TOOLTIP_DELAY_MS } from "@/constants/uiConstants";
import type { Horse } from "@/game/types";
import type { MatingPlanEntry } from "@/game/store/state/breedingState";
import type { SireSuggestion } from "@/core/breeding/sireSuggestions";

interface MarePlannerRowProps {
  mare: Horse;
  assignment: MatingPlanEntry | undefined;
  suggestions: SireSuggestion[];
  stallions: Horse[];
  onSireChange: (damId: string, sireId: string) => void;
  onLFGChange: (damId: string, lfg: boolean) => void;
  onSuggest: (damId: string) => void;
  onClear: (damId: string) => void;
  calculateFee: (entry: MatingPlanEntry) => number;
}

export function MarePlannerRow({
  mare,
  assignment,
  suggestions,
  stallions,
  onSireChange,
  onLFGChange,
  onSuggest,
  onClear,
  calculateFee,
}: MarePlannerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const topSuggestion = suggestions[0];
  const assignedSire = assignment ? stallions.find((s) => s.id === assignment.sireId) : undefined;
  const fee = assignment ? calculateFee(assignment) : 0;
  const isSuggested =
    assignment && topSuggestion && assignment.sireId === topSuggestion.stallion.id;

  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-t800/50 hover:bg-t900/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-display)] text-cream truncate">
            {mare.name}
          </span>
          {isSuggested && <Star className="h-3.5 w-3.5 text-gold fill-gold" />}
        </div>
        <div className="text-xs text-cream-muted font-[family-name:var(--font-mono)] tabular-nums">
          Age {mare.age} · {mare.hemisphere} · {Math.round(mare.distanceAptitude)}m
          {mare.bruceLoweFamily ? ` · BL${mare.bruceLoweFamily}` : ""}
        </div>
      </div>

      <div className="flex items-center gap-2 min-w-[200px]">
        <Select value={assignment?.sireId ?? ""} onValueChange={(v) => onSireChange(mare.id, v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select sire…" />
          </SelectTrigger>
          <SelectContent>
            {stallions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.stud && ` (${formatCurrency(s.stud.standingFee)})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {assignment && (
          <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onClear(mare.id)}
                  aria-label={`Clear assignment for ${mare.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear assignment</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex items-center gap-2 w-[80px]">
        <Checkbox
          checked={assignment?.liveFoalGuarantee ?? false}
          disabled={!assignment}
          onCheckedChange={(v) => onLFGChange(mare.id, v === true)}
        />
        <span className="text-xs text-cream-muted">LFG</span>
      </div>

      <div className="w-[90px] text-right text-xs font-[family-name:var(--font-mono)] tabular-nums text-cream-muted">
        {assignment ? formatCurrency(fee) : "—"}
      </div>

      <div className="flex items-center gap-1 w-[100px] justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSuggest(mare.id)}
          disabled={suggestions.length === 0}
        >
          Suggest
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setExpanded(!expanded)}
          disabled={!assignment && suggestions.length === 0}
        >
          {expanded ? "Hide" : "Info"}
        </Button>
      </div>

      {expanded && (
        <div className="col-span-full w-full mt-2 pt-2 border-t border-t800/50 text-xs text-cream-muted space-y-1">
          {assignedSire && (
            <div>
              <span className="text-cream">Assigned:</span> {assignedSire.name} —{" "}
              {assignedSire.stud
                ? `${formatCurrency(assignedSire.stud.standingFee)} standing fee`
                : "No stud career"}
            </div>
          )}
          {suggestions.slice(0, 3).map((s, i) => (
            <div key={s.stallion.id} className="flex items-center gap-2">
              <span className="text-gold">{i === 0 ? "★" : `#${i + 1}`}</span>
              <span className="text-cream">{s.stallion.name}</span>
              <span>{s.reason}</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums">
                {(s.compatibilityScore * 100).toFixed(0)}% · {formatCurrency(s.fee)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
