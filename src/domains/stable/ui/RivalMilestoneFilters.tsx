/**
 * RivalMilestoneFilters.tsx — Multi-select chips that narrow rival career
 * timelines to chosen milestone kinds and career stages.
 */

import type { RivalMilestoneFilter } from "@/domains/agents/application/npcFacade";
import type { NpcCareerStage } from "@/domains/horse/simulation/types";
import { careerStageLabel } from "@/domains/agents/application/npcFacade";
import { Button } from "@/shared/ui/button";

type Kind = RivalMilestoneFilter["kinds"][number];

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "debut", label: "Debut" },
  { value: "breakthrough_win", label: "Breakthrough" },
  { value: "earnings", label: "Earnings" },
  { value: "peak_transition", label: "Stage change" },
  { value: "retirement", label: "Retirement" },
];

const STAGE_OPTIONS: NpcCareerStage[] = ["juvenile", "rising", "prime", "declining", "veteran", "retired"];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function RivalMilestoneFilters({
  value,
  onChange,
}: {
  value: RivalMilestoneFilter;
  onChange: (next: RivalMilestoneFilter) => void;
}) {
  const active = value.kinds.length > 0 || value.stages.length > 0;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Milestone types">
        <span className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Milestones</span>
        {KIND_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            active={value.kinds.includes(o.value)}
            onClick={() => onChange({ ...value, kinds: toggle(value.kinds, o.value) })}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Career stages">
        <span className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Stage</span>
        {STAGE_OPTIONS.map((s) => (
          <Chip
            key={s}
            label={careerStageLabel(s)}
            active={value.stages.includes(s)}
            onClick={() => onChange({ ...value, stages: toggle(value.stages, s) })}
          />
        ))}
      </div>
      {active && (
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onChange({ kinds: [], stages: [] })}>
          Show all milestones
        </Button>
      )}
    </div>
  );
}
