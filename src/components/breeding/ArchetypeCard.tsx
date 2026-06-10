import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ALL_ARCHETYPES, type Archetype } from "@/core/breeding/archetypes";
import { archetypeMeta } from "./ArchetypeMeta";
import { ChevronRight } from "lucide-react";

interface ArchetypeCardProps {
  archetype: Archetype;
  onSelect: (id: string) => void;
}

export function ArchetypeCard({ archetype, onSelect }: ArchetypeCardProps) {
  const meta = archetypeMeta(archetype.id);
  return (
    <button
      onClick={() => onSelect(archetype.id)}
      className={cn(
        "text-left rounded-lg border p-3 transition-all hover:brightness-110 hover:scale-[1.01] w-full",
        meta.color,
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none mt-0.5">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-cream font-[family-name:var(--font-display)] truncate">
            {archetype.name}
          </p>
          <p className="text-xs text-cream-muted mt-0.5 line-clamp-2 font-[family-name:var(--font-body)]">
            {archetype.description}
          </p>
          <div className="flex gap-1 mt-2 flex-wrap">
            <Badge className="text-[10px] px-1.5 py-0 bg-t800 text-cream-muted">
              {archetype.targetPhenotype.surface}
            </Badge>
            <Badge className="text-[10px] px-1.5 py-0 bg-t800 text-cream-muted">
              {archetype.targetPhenotype.distance}m
            </Badge>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-cream-muted shrink-0 mt-1" />
      </div>
    </button>
  );
}
